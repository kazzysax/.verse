import { env } from "cloudflare:workers";

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
