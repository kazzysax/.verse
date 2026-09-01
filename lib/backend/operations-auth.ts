import { optionalEnv } from "./config";
import { AppError } from "./errors";

export async function requireOperationsAuth(request: Request) {
  const configured = optionalEnv("OPERATIONS_API_SECRET");
  if (!configured) {
    throw new AppError(503, "OPERATIONS_AUTH_NOT_CONFIGURED", "Operations authentication is not configured.");
  }
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!provided) throw new AppError(401, "OPERATIONS_AUTH_REQUIRED", "Operations authorization is required.");
  const [expectedHash, providedHash] = await Promise.all([
    digest(configured),
    digest(provided),
  ]);
  if (!constantTimeEqual(expectedHash, providedHash)) {
    throw new AppError(403, "OPERATIONS_AUTH_INVALID", "Operations authorization is invalid.");
  }
}

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}
