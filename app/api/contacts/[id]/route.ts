import { requireUser } from "@/lib/backend/auth";
import { deleteContact } from "@/lib/backend/contacts";
import { errorResponse, json } from "@/lib/backend/http";

export const runtime = "edge";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireUser(request);
    const { id } = await context.params;
    return json(await deleteContact(auth.user.id, id));
  } catch (error) {
    return errorResponse(error);
  }
}
