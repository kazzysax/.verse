import { requireUser } from "@/lib/backend/auth";
import { errorResponse, json } from "@/lib/backend/http";
import { getPaymentForUser } from "@/lib/backend/payments";

export const runtime = "edge";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser(request);
    const { id } = await context.params;
    return json({ payment: await getPaymentForUser(id, auth.user.id) });
  } catch (error) {
    return errorResponse(error);
  }
}
