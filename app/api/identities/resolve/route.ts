import { requireUser } from "@/lib/backend/auth";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { resolveRecipient } from "@/lib/backend/identity";
import { resolveSchema } from "@/lib/backend/validation";
import { enforceRateLimit } from "@/lib/backend/rate-limit";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    await enforceRateLimit({
      bucket: "identity_resolve",
      subject: auth.user.id,
      limit: 30,
      windowSeconds: 60,
    });
    const input = resolveSchema.parse(await readJson(request));
    const recipient = await resolveRecipient(input.recipient, input.provider);
    return json({
      recipient: {
        provider: recipient.provider,
        handle: recipient.displayHandle,
        verified: true,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
