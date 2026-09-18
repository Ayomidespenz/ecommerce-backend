import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiErrors";
import { Logger } from "../config/logger";

const logger = Logger.getInstance();

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, "NOT_FOUND"));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = "Internal server error";
  let code: string | undefined;
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (err instanceof Error) {
    // MongoDB / Mongoose known errors
    const mongoError = err as unknown as { code?: number };
    if (mongoError.code === 11000) {
      statusCode = 409;
      message = "A record with the same unique value already exists";
      code = "DUPLICATE_KEY";
    } else if (err.name === "ValidationError") {
      statusCode = 422;
      message = "Validation failed";
      code = "VALIDATION_ERROR";
      details = (err as unknown as { errors?: Record<string, unknown> }).errors;
    } else if (err.name === "CastError") {
      statusCode = 400;
      message = "Invalid resource identifier";
      code = "INVALID_ID";
    } else if (err.name === "JsonWebTokenError") {
      statusCode = 401;
      message = "Invalid or expired token";
      code = "INVALID_TOKEN";
    } else if (err.name === "TokenExpiredError") {
      statusCode = 401;
      message = "Token has expired";
      code = "TOKEN_EXPIRED";
    } else {
      // Unexpected error; log full stack for diagnosis
      logger.error(err.message, err);
    }
  } else {
    logger.error("Unknown error", { err });
  }

  res.status(statusCode).json({
    error: message,
    ...(code ? { code } : {}),
    ...(details !== undefined ? { details } : {}),
  });
}