import { requireUser } from "@/lib/backend/auth";
import { checkDomain } from "@/lib/backend/domains";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { domainNameSchema } from "@/lib/backend/validation";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    await requireUser(request);
    const input = domainNameSchema.parse(await readJson(request));
    return json(await checkDomain(input.name));
  } catch (error) {
    return errorResponse(error);
  }
}
