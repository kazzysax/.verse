import {
  paymentExecutionReadiness,
  registryExecutionReadiness,
} from "@/lib/backend/config";
import { errorResponse, json } from "@/lib/backend/http";
import { requireOperationsAuth } from "@/lib/backend/operations-auth";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    await requireOperationsAuth(request);
    return json({
      payments: paymentExecutionReadiness(),
      registry: registryExecutionReadiness(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
