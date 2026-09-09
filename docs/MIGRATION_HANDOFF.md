# .verse migration handoff

This repository contains the application, Polygon contract, ABI, D1 schema,
and all four immutable database migrations. It intentionally contains no live
secret values.

## What moves with Git

- Frontend and Worker/API source
- D1 schema and migrations in `drizzle/`
- Registry contract source and deployment record
- Polygon registry and token addresses
- Privy app, policy and wallet identifiers (identifiers are not signing keys)
- Safe environment template at `config/production.env.example`

## What does not move with Git

- Privy app secret or authorization private keys
- D1 production rows
- App HMAC salts/secrets
- Provider API keys
- Hosting access tokens

Putting any of those values in Git makes wallet and user data vulnerable.

## Required provider access

### Privy

Use the Privy project `cmtop07r7001f0dky090bgjq9`. In its dashboard:

1. Add the new production origin and callback URLs.
2. Keep Email enabled and X/Telegram linking enabled.
3. Rotate the app secret because a previous value was shared in chat.
4. Copy the new app secret into the new host's encrypted secret store.
5. Preserve access to the admin, registrar and pauser wallets listed in the
   environment template. Do not recreate them unless the on-chain roles are
   transferred first.
6. Retrieve or rotate the three authorization keys. The registrar key must
   remain authorized by policy `trvt764kg8u8htw27ho2pxn0`.
7. If using webhook confirmation, create a webhook for
   `/api/webhooks/privy`, store its signing secret, and change
   `TRANSACTION_CONFIRMATION_MODE` from `polling` to `webhook`.

### Database

The current database is a Sites-managed Cloudflare D1 binding named `DB`.
The source migrations recreate its structure, but credentials cannot convert
that managed binding into a portable database. Create a D1 database on the new
Cloudflare account, bind it as `DB`, and apply `drizzle/*.sql` in order.

Current tables: `users`, `identities`, `domains`, `payments`,
`chain_operations`, `gas_sponsorships`, `gas_usage`, `domain_orders`,
`contacts`, `notifications`, `payment_links`, `webhook_events`,
`api_rate_limits`, and `audit_events`.

Export the production rows from the current Sites database before cutover,
then import them into the new D1 database. Do not commit that export: it
contains user emails, wallet identifiers and transaction history.

### Polygon

- Network: Polygon mainnet, chain ID `137`
- Registry: `0x21958067226ef833294972418772fc215c994862`
- USDC: `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` (6 decimals)
- VERSE: `0xc708d6f2153933daa50b2d0758955be0a93a8fec` (18 decimals)
- Registry deployment transaction:
  `0x9c021bb869177bafcc2563f99e100d44838a4646e6e015b58e14991b31892218`

The deployed registry remains usable after moving hosts. Update its metadata
base URL only if the contract exposes and authorizes such an update; otherwise
keep the existing metadata route available.

## Cutover order

1. Clone this repository and install dependencies with `npm run install:ci`.
2. Create/bind D1 as `DB`; apply the committed migrations.
3. Export and import production rows through a private, encrypted path.
4. Add public values and secrets from `config/production.env.example`.
5. Add the new origin in Privy before testing login.
6. Keep payments disabled during setup, then build and run the tests.
7. Test email login, wallet creation, `.verse` resolution and one minimal
   user-approved payment on Polygon.
8. Enable mainnet only after the receipt and database record are confirmed.
9. Move DNS/traffic, monitor errors, then revoke the old host credentials.

## Security cleanup

Rotate the Privy app secret and the Cloudflare API token previously shared in
chat. Rotate app-owned HMAC secrets during cutover. Do not rotate registrar,
admin or pauser authorization keys until replacement keys are attached and
their on-chain/Privy permissions are verified.
