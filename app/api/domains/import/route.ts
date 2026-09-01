import { requireUser } from "@/lib/backend/auth";
import { importTransferredDomain } from "@/lib/backend/domains";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { enforceRateLimit } from "@/lib/backend/rate-limit";
import { domainNameSchema } from "@/lib/backend/validation";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    await enforceRateLimit({
      bucket: "domain_import",
      subject: auth.user.id,
      limit: 5,
      windowSeconds: 3600,
    });
    const input = domainNameSchema.parse(await readJson(request));
    const domain = await importTransferredDomain({
      userId: auth.user.id,
      walletAddress: auth.user.walletAddress,
      rawName: input.name,
    });
    return json({ domain });
  } catch (error) {
    return errorResponse(error);
  }
}
