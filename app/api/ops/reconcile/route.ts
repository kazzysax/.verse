import { errorResponse, json } from "@/lib/backend/http";
import { requireOperationsAuth } from "@/lib/backend/operations-auth";
import {
  cleanupOperationalTables,
  reconcileStaleOperations,
} from "@/lib/backend/reconciliation";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    await requireOperationsAuth(request);
    const [reconciliation, cleanup] = await Promise.all([
      reconcileStaleOperations(),
      cleanupOperationalTables(),
    ]);
    return json({ reconciliation, cleanup });
  } catch (error) {
    return errorResponse(error);
  }
}
