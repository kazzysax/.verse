import { requireUser } from "@/lib/backend/auth";
import { listContacts, saveContact } from "@/lib/backend/contacts";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { contactSchema } from "@/lib/backend/validation";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    return json({ contacts: await listContacts(auth.user.id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    const input = contactSchema.parse(await readJson(request));
    return json(await saveContact({ ownerUserId: auth.user.id, ...input }), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
