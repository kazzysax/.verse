import { requireUser } from "@/lib/backend/auth";
import { checkDomain } from "@/lib/backend/domains";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { domainNameSchema } from "@/lib/backend/validation";
import { enforceRateLimit } from "@/lib/backend/rate-limit";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    await enforceRateLimit({
      bucket: "domain_check",
      subject: auth.user.id,
      limit: 30,
      windowSeconds: 60,
    });
    const input = domainNameSchema.parse(await readJson(request));
    return json(await checkDomain(input.name));
  } catch (error) {
    return errorResponse(error);
  }
}
