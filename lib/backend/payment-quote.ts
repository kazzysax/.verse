import { AppError } from "./errors";

export type PaymentSnapshot = {
  purpose: "verse-payment-v1";
  senderUserId: string;
  recipient: { userId: string; identityId: string | null; walletAddress: string; displayHandle: string; provider: "verse" | "x" | "telegram"; normalizedHandle: string };
  asset: string;
  amountAtomic: string;
  chainId: number;
  tokenAddress: string;
};
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const decode = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));
async function key(secret: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function signPaymentSnapshot(payload: PaymentSnapshot, secret: string) {
  const body = encode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await key(secret), new TextEncoder().encode(body));
  return `${body}.${encode(new Uint8Array(signature))}`;
}
export async function verifyPaymentSnapshot(token: string, senderUserId: string, secret: string): Promise<PaymentSnapshot> {
  try {
    const [body, signature, extra] = token.split(".");
    if (!body || !signature || extra || !await crypto.subtle.verify("HMAC", await key(secret), decode(signature), new TextEncoder().encode(body))) throw new Error();
    const payload: PaymentSnapshot = JSON.parse(new TextDecoder().decode(decode(body)));
    if (payload.purpose !== "verse-payment-v1" || payload.senderUserId !== senderUserId) throw new Error();
    return payload;
  } catch {
    throw new AppError(400, "INVALID_PAYMENT_QUOTE", "The payment quote cannot be verified. Request a new quote.");
  }
}
