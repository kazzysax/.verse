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
    PRIVY_WALLET_POLICY_ID?: string;
    RATE_LIMIT_HASH_SALT?: string;
    AUDIT_HASH_SALT?: string;
    MAINNET_ACTIVATION_CONFIRMATION?: string;
    VERSE_REGISTRAR_WALLET_ID?: string;
    VERSE_REGISTRAR_POLICY_ID?: string;
    VERSE_TREASURY_ADDRESS?: string;
    POLYGON_RPC_URL?: string;
    OPERATIONS_API_SECRET?: string;
    DOMAIN_QUOTE_SIGNING_SECRET?: string;
    COINGECKO_API_KEY?: string;
  }
}
