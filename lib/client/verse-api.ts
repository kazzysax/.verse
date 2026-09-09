export type ApiProblem = {
  code: string;
  message: string;
  details?: unknown;
};

export class VerseApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, problem: ApiProblem) {
    super(problem.message);
    this.name = "VerseApiError";
    this.status = status;
    this.code = problem.code;
    this.details = problem.details;
  }
}

export async function verseApi<T>(
  path: string,
  getAccessToken: () => Promise<string | null>,
  init: RequestInit = {},
): Promise<T> {
  let tokenTimer: ReturnType<typeof setTimeout> | undefined;
  const accessToken = await Promise.race([
    getAccessToken(),
    new Promise<never>((_, reject) => {
      tokenTimer = setTimeout(() => reject(new VerseApiError(408, {
        code: "AUTH_TIMEOUT", message: "Sign-in is taking too long. Refresh and sign in again.",
      })), 15000);
    }),
  ]).finally(() => clearTimeout(tokenTimer));
  if (!accessToken) {
    throw new VerseApiError(401, { code: "AUTH_REQUIRED", message: "Sign in to continue." });
  }
  const response = await fetch(path, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(45000),
    cache: "no-store",
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: ApiProblem }
    | null;
  if (!response.ok) {
    const problem = payload && typeof payload === "object" && "error" in payload ? payload.error : undefined;
    throw new VerseApiError(response.status, problem ?? {
      code: "REQUEST_FAILED",
      message: "The request could not be completed.",
    });
  }
  return payload as T;
}

export function friendlyApiError(error: unknown) {
  if (error instanceof VerseApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
