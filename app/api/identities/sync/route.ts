import { requireUser } from "@/lib/backend/auth";
import { errorResponse, json } from "@/lib/backend/http";
import { syncPrivyIdentities } from "@/lib/backend/users";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    await syncPrivyIdentities(auth.user.id, auth.privyUserId);
    return json({ synced: true });
  } catch (error) {
    return errorResponse(error);
  }
}
