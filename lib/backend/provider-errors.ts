import { AppError } from "./errors";

type ErrorWithStatus = { status?: unknown };

export function classifySubmissionError(error: unknown) {
  if (error instanceof AppError) {
    return { outcome: "definite_failure" as const, code: error.code };
  }
  const status = (error as ErrorWithStatus | null)?.status;
  if (
    typeof status === "number" &&
    [400, 401, 403, 404, 422].includes(status)
  ) {
    return { outcome: "definite_failure" as const, code: `PRIVY_HTTP_${status}` };
  }
  return { outcome: "unknown" as const, code: "SUBMISSION_OUTCOME_UNKNOWN" };
}
