import { NextFunction, Request, Response } from "express";
import { ObjectSchema, ValidationOptions } from "joi";
import { ApiError } from "../utils/apiErrors";

type Source = "body" | "query" | "params";

const OPTIONS: ValidationOptions = {
  abortEarly: false,
  stripUnknown: true,
  convert: true,
};

export function validate(
  schema: ObjectSchema,
  source: Source = "body"
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = req[source];
    const { error, value: validated } = schema.validate(value, OPTIONS);

    if (error) {
      const details = error.details.map((d) => d.message.replace(/"/g, "'"));
      const first = details[0] || "Invalid request payload";
      next(new ApiError(400, first, "VALIDATION_ERROR", details));
      return;
    }

    (req as Record<Source, unknown>)[source] = validated;
    next();
  };
}

export const validateBody = (schema: ObjectSchema) => validate(schema, "body");
export const validateQuery = (schema: ObjectSchema) => validate(schema, "query");
export const validateParams = (schema: ObjectSchema) => validate(schema, "params");