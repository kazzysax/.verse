import { errorResponse, json } from "@/lib/backend/http";
import { getPublicPaymentLink } from "@/lib/backend/payment-links";

export const runtime = "edge";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const link = await getPublicPaymentLink(token);
    return json({
      link: {
        recipient: link.recipientDisplay,
        asset: link.asset,
        amount: link.amountDisplay,
        memo: link.memo,
        expiresAt: link.expiresAt,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
