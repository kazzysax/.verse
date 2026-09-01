declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    PRIVY_APP_ID?: string;
    PRIVY_APP_SECRET?: string;
    NEXT_PUBLIC_PRIVY_APP_ID?: string;
    PAYMENTS_EXECUTION_MODE?: string;
    PRIVY_WEBHOOK_SIGNING_SECRET?: string;
    VERSE_REGISTRY_ADDRESS?: string;
    EMAIL_PROVIDER_API_KEY?: string;
  }
}
