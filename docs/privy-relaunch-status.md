# Privy relaunch checkpoint — 2026-09-05

App: `cmtop07r7001f0dky090bgjq9`. Signing keys and the app secret are stored in hosting only.

| Role | Privy wallet ID | Polygon address |
| --- | --- | --- |
| Admin / deployer | zy1rv28br52ea2rtumfboa6x | 0x51F0d7149aA2add9655daD5ff367afC7b192D2BC |
| Registrar | dxs8nfwfld0kviizbb8o6xwb | 0x509603E6c75d29Dd19c3160FfCBDf6bc8b4cb2DA |
| Pauser | k06weztna7ks0l7957tr0esn | 0xA045F00973fecbcbda80A17e4b0E8fF9f6141151 |

User payment policy: `mok804tk2nncpmnnz4s4o993` (Polygon USDC/VERSE ERC20 transfer only). Server-created user wallets attach this policy. Existing browser-created wallets must be inspected separately; no claim that they have this policy attached.

Registrar policy: `trvt764kg8u8htw27ho2pxn0`, owned by the admin authorization key. It now permits only eth_sendTransaction on Polygon 137, zero native value, to the new registry, with decoded mintName calldata. Update was confirmed by Privy.

Payments default to user-funded POL. Registrar sponsorship defaults off. Mainnet execution remains disabled; this is not a completed launch.

## Remaining gates

Update: registry deployed successfully on Polygon at `0x21958067226ef833294972418772fc215c994862`, transaction `0x9c021bb869177bafcc2563f99e100d44838a4646e6e015b58e14991b31892218`, after five confirmations. See contracts/deployment-polygon.json. Do not deploy another registry. The first request v1 failed before broadcast for insufficient automatic gas allowance; v2 supplied explicit gas/fee bounds and succeeded. X is enabled and the Sites origin is allowed. Telegram and Telegram OAuth are still disabled in the most recent verified app settings. Lookup of the specifically authorized email web3kingley@gmail.com returned user-not-found; ask for the actual test email before investigating that user's wallet.

- Enable Telegram in this exact Privy app, then perform actual OAuth and Telegram account linking. X was verified enabled.
- Complete live email OTP with secure browser authentication, confirm a real Privy wallet ID/address, and bootstrap the matching user.
- Fund the registrar for minting. Deployment used 0.525029419137272688 POL; admin has 0.474970580862727312 POL remaining at the verification block. Bytecode (7332 bytes), .verse collection name, all three roles and ERC721 interface were verified through RPC.
- Configure treasury for paid extra names. Metadata URI is fixed to the implemented /api/domains/metadata/ endpoint. Add an authenticated NFT-transfer app flow and matching user-wallet policy before claiming in-app name transfers are usable.
- Configure Privy webhook signing secret and actual webhook destination; retain execution gates until reconciliation is operational.
- Configure the quote price API key for paid extra names. Confirm a free mint on Polygon, resolve its actual owner and complete an authorized funded token payment by name.
- Do not treat a reserved name, a login form render, or an accepted transaction request as proof of a completed mint, login or payment.
