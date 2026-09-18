import { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };