# .verse Polygon mainnet runbook

This runbook is a release gate, not a request to place secrets in source control or chat. Use the hosting secret store and a secure deployment runner. Keep `PAYMENTS_EXECUTION_MODE=disabled` until every verification below is complete.

## 1. Establish production control

1. Create separate Polygon addresses for registry admin, registrar, and emergency pauser.
2. Put admin and pauser control behind organizational multisig custody. Do not make the web application wallet the contract admin.
3. Create a dedicated Privy registrar wallet. Attach a policy that permits sponsored calls only to the deployed registry and only for `mintName`.
4. Create the user-wallet policy. Allow only Polygon USDC and VERSE transfers, cap transaction and rolling spend, and deny arbitrary contract calls.
5. Configure account recovery, operator access, alert recipients, and an incident owner.

## 2. Deploy and verify the registry

Compile reproducible Paris-target bytecode:

```bash
npm ci
npm run contracts:compile
```

Run the guarded deploy command from a secure runner. It requires the RPC URL, deployer key, distinct role addresses, metadata base URI, chain mode, and an exact deployment confirmation phrase. For Polygon mainnet the phrase is `DEPLOY_VERSE_REGISTRY_POLYGON`; for Amoy it is `DEPLOY_VERSE_REGISTRY_AMOY`.

After deployment:

1. Verify the source and constructor arguments on Polygonscan.
2. Confirm `DEFAULT_ADMIN_ROLE`, `REGISTRAR_ROLE`, and `PAUSER_ROLE` on-chain.
3. Mint a canary name, transfer it, pause, verify transfers fail, then unpause.
4. Confirm the deployer has no role unless it is intentionally one of the controlled addresses.
5. Record the contract address and transaction hash in the release record.

## 3. Configure runtime secrets

Required for payments:

- `PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- `PRIVY_WEBHOOK_SIGNING_SECRET`
- `PRIVY_WALLET_POLICY_ID`
- `RATE_LIMIT_HASH_SALT`
- `AUDIT_HASH_SALT`

Additionally required for registry minting and paid domains:

- `VERSE_REGISTRY_ADDRESS`
- `VERSE_REGISTRAR_WALLET_ID`
- `VERSE_REGISTRAR_POLICY_ID`
- `VERSE_TREASURY_ADDRESS`
- `POLYGON_RPC_URL`
- `DOMAIN_QUOTE_SIGNING_SECRET`
- `COINGECKO_API_KEY`

Operations require `OPERATIONS_API_SECRET`. Keep all values in the hosting secret store. Never commit them.

## 4. Verify external integrations

1. Configure Privy to send signed transaction events to `/api/webhooks/privy`.
2. Schedule `POST /api/ops/reconcile` at least every two minutes with the operations bearer secret.
3. Monitor `GET /api/ops/manual-review` and alert when any item appears.
4. Configure an email delivery worker for pending notification rows before promising email delivery publicly.
5. Test price-feed failure, RPC failure, webhook delay, provider timeout, policy rejection, insufficient balance, and duplicate submission.

## 5. Canary activation

1. Apply all D1 migrations and confirm the 14 expected tables plus both gas-limit triggers.
2. Set `PAYMENTS_EXECUTION_MODE=amoy`; verify readiness and the full USDC/name flow.
3. Return execution to `disabled`, configure mainnet addresses, and re-check readiness.
4. Fund sponsorship and treasury accounts with the smallest safe operational balances.
5. Set `PAYMENTS_EXECUTION_MODE=mainnet` and `MAINNET_ACTIVATION_CONFIRMATION=VERSE_MAINNET_APPROVED` in one controlled change.
6. Execute low-value canaries for USDC, VERSE, free-domain mint, paid-domain payment, domain transfer, X resolution, and Telegram resolution.
7. Review transaction receipts, database states, audit events, notifications, and sponsored-usage counts before opening access.

## 6. Emergency response

- To stop all app-initiated transfers, set `PAYMENTS_EXECUTION_MODE=disabled`.
- To stop name minting and transfers, call registry `pause` from the pauser authority.
- Revoke or tighten Privy policies if a wallet or route is suspected.
- Do not release an ambiguous domain reservation until its transaction is definitively absent or failed.
- Reconcile pending/unknown operations and preserve audit records before remediation.
- Rotate any exposed secret, update the hosting store, then invalidate the old value at its provider.

## Release evidence

Archive the tested commit, build/deployment version, migration list, contract address, verified-source URL, policy IDs, canary transaction hashes, readiness output, and operator approvals. Do not include private keys or secret values.
