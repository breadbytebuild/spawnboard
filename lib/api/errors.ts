import { NextResponse } from "next/server";
import type { ZodError } from "zod/v4";

type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "NOT_IMPLEMENTED";

const STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  NOT_IMPLEMENTED: 501,
};

export function apiError(
  code: ErrorCode,
  message: string,
  details?: { fix?: string; fields?: Record<string, string> }
) {
  return NextResponse.json(
    { error: message, code, ...details },
    { status: STATUS_MAP[code] }
  );
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Format Zod validation errors into agent-friendly messages.
 * Returns a single error string + a fields map showing what's wrong per field.
 */
export function formatZodError(
  err: ZodError,
  context: string
): {
  message: string;
  fields: Record<string, string>;
  fix: string;
} {
  const fields: Record<string, string> = {};

  for (const issue of err.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "body";
    fields[path] = issue.message || `Invalid value for "${path}"`;
  }

  const fieldNames = Object.keys(fields);
  const message =
    fieldNames.length === 1
      ? `Invalid ${context}: ${fieldNames[0]} — ${fields[fieldNames[0]]}`
      : `Invalid ${context}: ${fieldNames.length} field errors — ${fieldNames.join(", ")}`;

  const fix =
    fieldNames.length === 1
      ? `Check the "${fieldNames[0]}" field in your request`
      : `Check these fields in your request: ${fieldNames.join(", ")}`;

  return { message, fields, fix };
}

export function zodApiError(err: ZodError, context: string) {
  const { message, fields, fix } = formatZodError(err, context);
  return apiError("BAD_REQUEST", message, { fix, fields });
}
