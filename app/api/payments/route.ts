import { z } from "zod";
import { requireUser } from "@/lib/backend/auth";
import { AppError } from "@/lib/backend/errors";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { createPayment, listPayments } from "@/lib/backend/payments";
import { paymentSchema } from "@/lib/backend/validation";

export const runtime = "edge";

const IDEMPOTENCY_KEY = /^[a-zA-Z0-9._:-]{8,100}$/;

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    const idempotencyKey = request.headers.get("idempotency-key")?.trim();
    if (!idempotencyKey || !IDEMPOTENCY_KEY.test(idempotencyKey)) {
      throw new AppError(
        400,
        "IDEMPOTENCY_KEY_REQUIRED",
        "Provide an 8–100 character Idempotency-Key header.",
      );
    }
    const input = paymentSchema.parse(await readJson(request));
    const payment = await createPayment({
      accessToken: auth.accessToken,
      senderUserId: auth.user.id,
      idempotencyKey,
      ...input,
    });
    return json({ payment }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    const url = new URL(request.url);
    const limit = z.coerce.number().int().min(1).max(100).default(25).parse(url.searchParams.get("limit") ?? 25);
    return json({ payments: await listPayments(auth.user.id, limit) });
  } catch (error) {
    return errorResponse(error);
  }
}
