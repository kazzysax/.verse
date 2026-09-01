import { authenticate } from "@/lib/backend/auth";
import { errorResponse, json, readJson } from "@/lib/backend/http";
import { bootstrapUser } from "@/lib/backend/users";
import { bootstrapSchema } from "@/lib/backend/validation";
import { enforceRateLimit } from "@/lib/backend/rate-limit";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);
    await enforceRateLimit({
      bucket: "user_bootstrap",
      subject: auth.privyUserId,
      limit: 5,
      windowSeconds: 600,
    });
    const body = bootstrapSchema.parse(await readJson(request));
    const user = await bootstrapUser({
      privyUserId: auth.privyUserId,
      recoveryEmail: body.recoveryEmail,
    });
    return json(
      {
        user: {
          id: user?.id,
          status: user?.status,
          walletReady: Boolean(user?.walletAddress && user?.privyWalletId),
          email: user?.email,
        },
      },
      { status: auth.user ? 200 : 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
