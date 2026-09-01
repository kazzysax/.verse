import { requireUser } from "@/lib/backend/auth";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { createPaymentLink, listPaymentLinks } from "@/lib/backend/payment-links";
import { paymentLinkSchema } from "@/lib/backend/validation";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    return json({ links: await listPaymentLinks(auth.user.id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request);
    const input = paymentLinkSchema.parse(await readJson(request));
    const link = await createPaymentLink({ creatorUserId: auth.user.id, ...input });
    return json(
      {
        link: {
          ...link,
          url: `${new URL(request.url).origin}/pay/${link.publicToken}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
