import { requireUser } from "@/lib/backend/auth";
import { assertRegistryExecutionReady } from "@/lib/backend/config";
import { createPaidDomainQuote } from "@/lib/backend/domain-pricing";
import { checkDomain } from "@/lib/backend/domains";
import { AppError } from "@/lib/backend/errors";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { enforceRateLimit } from "@/lib/backend/rate-limit";
import { domainNameSchema } from "@/lib/backend/validation";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    await enforceRateLimit({
      bucket: "domain_purchase_quote",
      subject: auth.user.id,
      limit: 10,
      windowSeconds: 60,
    });
    assertRegistryExecutionReady();
    const input = domainNameSchema.parse(await readJson(request));
    const availability = await checkDomain(input.name);
    if (!availability.available) {
      throw new AppError(409, "DOMAIN_UNAVAILABLE", "That .verse name is not available.");
    }
    return json(
      await createPaidDomainQuote({ userId: auth.user.id, rawName: input.name }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
