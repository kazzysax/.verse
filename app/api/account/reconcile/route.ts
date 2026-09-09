import { requireUser } from "@/lib/backend/auth";
import { enforceRateLimit } from "@/lib/backend/rate-limit";
import { reconcileStaleOperations } from "@/lib/backend/reconciliation";
import { errorResponse, json } from "@/lib/backend/http";

export const runtime = "edge";
export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    await enforceRateLimit({ bucket: "account_reconcile", subject: auth.user.id, limit: 20, windowSeconds: 60 });
    return json(await reconcileStaleOperations(new Date(), auth.user.id));
  } catch (error) { return errorResponse(error); }
}
