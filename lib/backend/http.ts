import { ZodError } from "zod";
import { AppError, asAppError } from "./errors";

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...init.headers,
    },
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return json(
      {
        error: {
          code: "INVALID_REQUEST",
          message: "The request body is invalid.",
          fields: error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const appError = asAppError(error);
  if (!(error instanceof AppError)) console.error(error);
  return json(
    {
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details === undefined ? {} : { details: appError.details }),
      },
    },
    { status: appError.status },
  );
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "A valid JSON body is required.");
  }
}
