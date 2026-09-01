import { requireUser } from "@/lib/backend/auth";
import { claimFreeDomain } from "@/lib/backend/domains";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { domainNameSchema } from "@/lib/backend/validation";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    const input = domainNameSchema.parse(await readJson(request));
    const domain = await claimFreeDomain({
      userId: auth.user.id,
      walletAddress: auth.user.walletAddress,
      rawName: input.name,
    });
    return json({ domain }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
