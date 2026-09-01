import { formatUnits } from "viem";
import { TOKEN_CONFIG, requiredEnv } from "./config";
import { AppError } from "./errors";
import { normalizeVerseName } from "./identity-normalization";

const QUOTE_TTL_MS = 5 * 60_000;

type QuotePayload = {
  version: 1;
  quoteId: string;
  userId: string;
  name: string;
  priceVerseAtomic: string;
  verseUsdMicros: number;
  expiresAt: string;
};

export async function createPaidDomainQuote(input: {
  userId: string;
  rawName: string;
  now?: Date;
}) {
  const name = normalizeVerseName(input.rawName);
  const verseUsdMicros = await fetchVerseUsdMicros();
  const priceVerseAtomic = ceilDiv(10n ** 24n, BigInt(verseUsdMicros));
  const now = input.now ?? new Date();
  const payload: QuotePayload = {
    version: 1,
    quoteId: crypto.randomUUID(),
    userId: input.userId,
    name,
    priceVerseAtomic: priceVerseAtomic.toString(),
    verseUsdMicros,
    expiresAt: new Date(now.getTime() + QUOTE_TTL_MS).toISOString(),
  };
  const encoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(encoded);
  return {
    quoteToken: `${encoded}.${signature}`,
    quoteId: payload.quoteId,
    name: `${name}.verse`,
    priceVerse: formatUnits(priceVerseAtomic, 18),
    priceVerseAtomic: payload.priceVerseAtomic,
    targetUsd: "1.00",
    expiresAt: payload.expiresAt,
  };
}

export async function verifyPaidDomainQuote(
  quoteToken: string,
  userId: string,
  now = new Date(),
) {
  const [encoded, signature, extra] = quoteToken.split(".");
  if (!encoded || !signature || extra) invalidQuote();
  const expected = await sign(encoded);
  if (!constantTimeEqual(expected, signature)) invalidQuote();
  let payload: QuotePayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded)));
  } catch {
    invalidQuote();
  }
  if (
    payload.version !== 1 ||
    payload.userId !== userId ||
    !payload.quoteId ||
    !/^\d+$/.test(payload.priceVerseAtomic) ||
    payload.verseUsdMicros <= 0 ||
    normalizeVerseName(payload.name) !== payload.name
  ) {
    invalidQuote();
  }
  if (new Date(payload.expiresAt) <= now) {
    throw new AppError(410, "DOMAIN_QUOTE_EXPIRED", "The domain price quote has expired.");
  }
  return payload;
}

async function fetchVerseUsdMicros() {
  const address = TOKEN_CONFIG.mainnet.VERSE.address.toLowerCase();
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/token_price/polygon-pos?contract_addresses=${address}&vs_currencies=usd`,
    {
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": requiredEnv("COINGECKO_API_KEY"),
      },
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!response.ok) {
    throw new AppError(503, "DOMAIN_PRICE_UNAVAILABLE", "The VERSE price feed is unavailable.");
  }
  const data = (await response.json()) as Record<string, { usd?: number }>;
  const usd = data[address]?.usd;
  if (!usd || !Number.isFinite(usd) || usd <= 0) {
    throw new AppError(503, "DOMAIN_PRICE_UNAVAILABLE", "The VERSE price feed returned an invalid price.");
  }
  const micros = Math.round(usd * 1_000_000);
  if (micros <= 0) {
    throw new AppError(503, "DOMAIN_PRICE_TOO_SMALL", "The VERSE price is too small to quote safely.");
  }
  return micros;
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(requiredEnv("DOMAIN_QUOTE_SIGNING_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64UrlEncode(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
    ),
  );
}

function ceilDiv(numerator: bigint, denominator: bigint) {
  return (numerator + denominator - 1n) / denominator;
}

function invalidQuote(): never {
  throw new AppError(400, "INVALID_DOMAIN_QUOTE", "The domain price quote is invalid.");
}

function base64UrlEncode(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
