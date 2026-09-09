import { env } from "cloudflare:workers";
import { AppError } from "./errors";

export const POLYGON_MAINNET_CHAIN_ID = 137;
export const POLYGON_AMOY_CHAIN_ID = 80002;
export const DAILY_SPONSORED_PAYMENT_LIMIT = 20;

export const TOKEN_CONFIG = {
  mainnet: {
    USDC: {
      address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      decimals: 6,
    },
    VERSE: {
      address: "0xc708d6f2153933daa50b2d0758955be0a93a8fec",
      decimals: 18,
    },
  },
  amoy: {
    USDC: {
      address: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
      decimals: 6,
    },
    VERSE: null,
  },
} as const;

export type PaymentAsset = "USDC" | "VERSE";
export type ExecutionMode = "disabled" | "amoy" | "mainnet";

type RuntimeEnv = Record<string, unknown>;

function runtimeEnv(): RuntimeEnv {
  return env as unknown as RuntimeEnv;
}

export function optionalEnv(name: string): string | undefined {
  const workerValue = runtimeEnv()[name];
  if (typeof workerValue === "string" && workerValue.trim()) {
    return workerValue.trim();
  }
  const nodeValue = typeof process !== "undefined" ? process.env[name] : undefined;
  return nodeValue?.trim() || undefined;
}

export function requiredEnv(name: string): string {
  const value = optionalEnv(name);
  if (!value) throw new Error(`Missing required runtime setting: ${name}`);
  return value;
}

export function executionMode(): ExecutionMode {
  const configured = optionalEnv("PAYMENTS_EXECUTION_MODE") ?? "disabled";
  if (configured === "disabled" || configured === "amoy" || configured === "mainnet") {
    return configured;
  }
  return "disabled";
}

export function paymentsSponsored() {
  return optionalEnv("PAYMENTS_GAS_MODE") === "sponsored";
}

export function registrySponsored() {
  return optionalEnv("REGISTRY_GAS_SPONSORED") === "true";
}

export function activeChain() {
  const mode = executionMode();
  if (mode === "mainnet") {
    return { mode, chainId: POLYGON_MAINNET_CHAIN_ID, caip2: "eip155:137" as const };
  }
  if (mode === "amoy") {
    return { mode, chainId: POLYGON_AMOY_CHAIN_ID, caip2: "eip155:80002" as const };
  }
  return { mode, chainId: POLYGON_MAINNET_CHAIN_ID, caip2: "eip155:137" as const };
}

export function tokenFor(asset: PaymentAsset) {
  const chain = activeChain();
  const token = chain.mode === "amoy" ? TOKEN_CONFIG.amoy[asset] : TOKEN_CONFIG.mainnet[asset];
  if (!token) {
    throw new Error(`${asset} is not configured for ${chain.mode}`);
  }
  return token;
}

export function paymentExecutionReadiness() {
  const missing: string[] = [];
  for (const key of ["PRIVY_APP_ID", "PRIVY_APP_SECRET"]) {
    if (!optionalEnv(key)) missing.push(key);
  }
  if (!optionalEnv("PRIVY_WEBHOOK_SIGNING_SECRET") && optionalEnv("TRANSACTION_CONFIRMATION_MODE") !== "polling") {
    missing.push("TRANSACTION_CONFIRMATION_MODE");
  }
  if (!optionalEnv("RATE_LIMIT_HASH_SALT")) missing.push("RATE_LIMIT_HASH_SALT");
  if (!optionalEnv("AUDIT_HASH_SALT")) missing.push("AUDIT_HASH_SALT");
  if (!optionalEnv("POLYGON_RPC_URL")) missing.push("POLYGON_RPC_URL");
  if (
    executionMode() === "mainnet" &&
    optionalEnv("MAINNET_ACTIVATION_CONFIRMATION") !== "VERSE_MAINNET_APPROVED"
  ) {
    missing.push("MAINNET_ACTIVATION_CONFIRMATION");
  }
  return {
    mode: executionMode(),
    ready: executionMode() !== "disabled" && missing.length === 0,
    missing,
  };
}

export function registryExecutionReadiness() {
  const payment = paymentExecutionReadiness();
  const missing = [...payment.missing];
  for (const key of [
    "VERSE_REGISTRY_ADDRESS",
    "VERSE_REGISTRAR_WALLET_ID",
    "VERSE_REGISTRAR_POLICY_ID",
    "VERSE_REGISTRAR_AUTHORIZATION_KEY",
    "REGISTRY_REGISTRAR_ADDRESS",
    "POLYGON_RPC_URL",
  ]) {
    if (!optionalEnv(key)) missing.push(key);
  }
  return {
    mode: payment.mode,
    ready: payment.mode !== "disabled" && missing.length === 0,
    missing: [...new Set(missing)],
  };
}

export function assertPaymentExecutionReady() {
  const readiness = paymentExecutionReadiness();
  if (!readiness.ready) {
    throw new AppError(
      503,
      "LIVE_EXECUTION_NOT_READY",
      "Payment execution is not fully configured.",
      { missing: readiness.missing },
    );
  }
  return readiness;
}

export function assertRegistryExecutionReady() {
  const readiness = registryExecutionReadiness();
  if (!readiness.ready) {
    throw new AppError(
      503,
      "REGISTRY_EXECUTION_NOT_READY",
      "The .verse registry is not fully configured.",
      { missing: readiness.missing },
    );
  }
  return readiness;
}
