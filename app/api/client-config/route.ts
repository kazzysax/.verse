import { optionalEnv } from "@/lib/backend/config";
import { AppError } from "@/lib/backend/errors";
import { errorResponse, json } from "@/lib/backend/http";

export const runtime = "edge";
const PUBLIC_PRIVY_APP_ID = "cmsyktv5102800cl13u40afrz";

export async function GET() {
  try {
    const privyAppId = optionalEnv("NEXT_PUBLIC_PRIVY_APP_ID") ?? optionalEnv("PRIVY_APP_ID") ?? PUBLIC_PRIVY_APP_ID;
    if (!privyAppId) {
      throw new AppError(503, "AUTH_NOT_CONFIGURED", "Authentication is not configured.");
    }
    return json({ privyAppId });
  } catch (error) {
    return errorResponse(error);
  }
}
