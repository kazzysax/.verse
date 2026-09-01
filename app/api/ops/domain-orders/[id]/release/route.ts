import { releaseFailedDomainOrder } from "@/lib/backend/domain-purchase";
import { errorResponse, json } from "@/lib/backend/http";
import { requireOperationsAuth } from "@/lib/backend/operations-auth";

export const runtime = "edge";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireOperationsAuth(request);
    const { id } = await context.params;
    return json(await releaseFailedDomainOrder(id));
  } catch (error) {
    return errorResponse(error);
  }
}
