import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "One or more input fields are invalid.",
        details,
      },
    });
    return;
  }

  // 2. JSON Body Parsing Syntax Error
  if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "Request body contains invalid JSON syntax.",
      },
    });
    return;
  }

  // 3. Generic / Internal Server Errors
  const errorObj = err instanceof Error ? err : new Error(String(err));
  console.error("[Server Error]", errorObj);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "An unexpected error occurred. Please try again later."
          : errorObj.message,
    },
  });
}
