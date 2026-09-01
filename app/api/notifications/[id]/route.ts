import { and, eq } from "drizzle-orm";
import { notifications } from "@/db/schema";
import { getDb } from "@/db";
import { requireUser } from "@/lib/backend/auth";
import { AppError } from "@/lib/backend/errors";
import { errorResponse, json } from "@/lib/backend/http";

export const runtime = "edge";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser(request);
    const { id } = await context.params;
    const now = new Date().toISOString();
    const updated = await getDb()
      .update(notifications)
      .set({ status: "read", readAt: now })
      .where(and(eq(notifications.id, id), eq(notifications.userId, auth.user.id)))
      .returning({ id: notifications.id });
    if (!updated.length) throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notification not found.");
    return json({ read: true });
  } catch (error) {
    return errorResponse(error);
  }
}
