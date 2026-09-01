import { desc, eq } from "drizzle-orm";
import { notifications } from "@/db/schema";
import { getDb } from "@/db";
import { requireUser } from "@/lib/backend/auth";
import { errorResponse, json } from "@/lib/backend/http";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    const rows = await getDb()
      .select()
      .from(notifications)
      .where(eq(notifications.userId, auth.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
    return json({ notifications: rows });
  } catch (error) {
    return errorResponse(error);
  }
}
