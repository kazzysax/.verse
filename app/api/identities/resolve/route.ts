import { requireUser } from "@/lib/backend/auth";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { resolveRecipient } from "@/lib/backend/identity";
import { resolveSchema } from "@/lib/backend/validation";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    await requireUser(request);
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
