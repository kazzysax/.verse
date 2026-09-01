import { requireUser } from "@/lib/backend/auth";
import { purchaseAdditionalDomain } from "@/lib/backend/domain-purchase";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { enforceRateLimit } from "@/lib/backend/rate-limit";
import { domainPurchaseSchema } from "@/lib/backend/validation";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    await enforceRateLimit({
      bucket: "domain_purchase",
      subject: auth.user.id,
      limit: 5,
      windowSeconds: 3600,
    });
    const input = domainPurchaseSchema.parse(await readJson(request));
    const order = await purchaseAdditionalDomain({
      accessToken: auth.accessToken,
      userId: auth.user.id,
      quoteToken: input.quoteToken,
    });
    return json({ order }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
