import {
  executionMode,
  optionalEnv,
  paymentExecutionReadiness,
  registryExecutionReadiness,
} from "@/lib/backend/config";
import { json } from "@/lib/backend/http";

export const runtime = "edge";

export async function GET() {
  const payments = paymentExecutionReadiness();
  const registry = registryExecutionReadiness();
  return json({
    service: "verse-pay-api",
    status: "ok",
    executionMode: executionMode(),
    confirmationMode: optionalEnv("TRANSACTION_CONFIRMATION_MODE") ?? "webhook",
    capabilities: {
      privy: Boolean(optionalEnv("PRIVY_APP_ID") && optionalEnv("PRIVY_APP_SECRET")),
      domainRegistry: Boolean(optionalEnv("VERSE_REGISTRY_ADDRESS")),
      webhookVerification: Boolean(optionalEnv("PRIVY_WEBHOOK_SIGNING_SECRET")),
      emailDelivery: Boolean(optionalEnv("EMAIL_PROVIDER_API_KEY")),
    },
    readiness: {
      payments: { ready: payments.ready },
      registry: { ready: registry.ready },
    },
  });
}
