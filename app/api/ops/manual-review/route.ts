import { desc, eq, inArray } from "drizzle-orm";
import { chainOperations, domainOrders, domains } from "@/db/schema";
import { getDb } from "@/db";
import { errorResponse, json } from "@/lib/backend/http";
import { requireOperationsAuth } from "@/lib/backend/operations-auth";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    await requireOperationsAuth(request);
    const db = getDb();
    const [operations, orders] = await Promise.all([
      db
        .select({
          id: chainOperations.id,
          kind: chainOperations.kind,
          aggregateId: chainOperations.aggregateId,
          status: chainOperations.status,
          txHash: chainOperations.txHash,
          failureCode: chainOperations.failureCode,
          updatedAt: chainOperations.updatedAt,
        })
        .from(chainOperations)
        .where(inArray(chainOperations.status, ["unknown", "failed"]))
        .orderBy(desc(chainOperations.updatedAt))
        .limit(100),
      db
        .select({
          id: domainOrders.id,
          kind: domainOrders.kind,
          status: domainOrders.status,
          name: domains.name,
          paymentOperationId: domainOrders.paymentOperationId,
          mintOperationId: domainOrders.mintOperationId,
          failureCode: domainOrders.failureCode,
          updatedAt: domainOrders.updatedAt,
        })
        .from(domainOrders)
        .innerJoin(domains, eq(domainOrders.domainId, domains.id))
        .where(eq(domainOrders.status, "manual_review"))
        .orderBy(desc(domainOrders.updatedAt))
        .limit(100),
    ]);
    return json({ operations, domainOrders: orders });
  } catch (error) {
    return errorResponse(error);
  }
}
