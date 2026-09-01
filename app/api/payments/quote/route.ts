import { requireUser } from "@/lib/backend/auth";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { quotePayment } from "@/lib/backend/payments";
import { paymentSchema } from "@/lib/backend/validation";
import { enforceRateLimit } from "@/lib/backend/rate-limit";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    await enforceRateLimit({
      bucket: "payment_quote",
      subject: auth.user.id,
      limit: 30,
      windowSeconds: 60,
    });
    const input = paymentSchema.parse(await readJson(request));
    return json(
      await quotePayment({
        senderUserId: auth.user.id,
        ...input,
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
