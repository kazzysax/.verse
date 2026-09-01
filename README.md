# .verse

Gas-sponsored peer-to-peer payments on Polygon using verified `.verse`, X, or Telegram identities. The first release supports USDC and VERSE, Privy embedded wallets, one free lifetime transferable `.verse` name per verified account, $1-equivalent additional names paid in VERSE, payment links, contacts, and notifications.

Users may sign up with verified email alone. X and Telegram are optional aliases that are required only when a user wants to receive payments through those handles.

## Safety model

- Live transaction execution defaults to `disabled` and fails closed.
- Mainnet requires the exact `MAINNET_ACTIVATION_CONFIRMATION=VERSE_MAINNET_APPROVED` setting plus every readiness dependency.
- Users authorize their own wallet transfers through Privy access tokens.
- Privy wallet policy IDs are mandatory for live payments; the registrar uses a separate policy and wallet.
- Every operation has a globally unique provider request ID and durable reconciliation state.
- Ambiguous provider responses are never retried as new payments automatically.
- A SQLite trigger enforces 20 active sponsored operations per user per UTC day under concurrency.
- Webhooks are signature verified, replay safe, and retry failed reconciliation.
- `.verse` recipient resolution checks the registry owner on Polygon before returning a recipient.
- Recovery email and social handles are accepted only from Privy verified linked accounts.
- Operations endpoints require a separate bearer secret.

## Commands

```bash
npm run dev
npm run lint
npm test
npm run db:generate
npm run db:load-test
npm run contracts:compile
```

`npm run contracts:deploy` is guarded and will not deploy without a network-specific confirmation phrase. Review [docs/mainnet-runbook.md](docs/mainnet-runbook.md) before any funded deployment.

## API groups

- `/api/users`, `/api/me`: account bootstrap and profile
- `/api/identities`: verified identity synchronization and exact resolution
- `/api/payments`: quote, submit, list, and inspect payments
- `/api/domains`: availability, free claim, paid purchase, import, and list
- `/api/payment-links`, `/api/contacts`, `/api/notifications`
- `/api/webhooks/privy`: signed Privy transaction events
- `/api/ops`: protected readiness, reconciliation, and manual-review queues

The public health response exposes readiness booleans only. Detailed missing configuration is available from the protected operations readiness route.
