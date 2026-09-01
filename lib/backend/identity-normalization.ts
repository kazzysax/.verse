import { AppError } from "./errors";

export type IdentityProvider = "verse" | "x" | "telegram";

const VERSE_NAME = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
const X_HANDLE = /^[a-z0-9_]{1,15}$/;
const TELEGRAM_HANDLE = /^[a-z][a-z0-9_]{4,31}$/;

export function normalizeVerseName(raw: string) {
  const normalized = raw.trim().toLowerCase().replace(/\.verse$/i, "");
  if (!VERSE_NAME.test(normalized)) {
    throw new AppError(400, "INVALID_VERSE_NAME", "Use 3–30 lowercase letters, numbers, or hyphens.");
  }
  return normalized;
}

export function normalizeSocialHandle(provider: "x" | "telegram", raw: string) {
  const normalized = raw.trim().toLowerCase().replace(/^@/, "");
  const valid = provider === "x" ? X_HANDLE.test(normalized) : TELEGRAM_HANDLE.test(normalized);
  if (!valid) {
    throw new AppError(400, "INVALID_HANDLE", `The ${provider} handle is invalid.`);
  }
  return normalized;
}

export function normalizeRecipient(raw: string, provider?: IdentityProvider) {
  const value = raw.trim();
  const chosen = provider ?? (value.toLowerCase().endsWith(".verse") ? "verse" : null);
  if (!chosen) {
    throw new AppError(400, "PROVIDER_REQUIRED", "Specify x or telegram for a social handle.");
  }
  const normalized = chosen === "verse" ? normalizeVerseName(value) : normalizeSocialHandle(chosen, value);
  return { provider: chosen, normalized };
}
