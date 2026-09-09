import { readFileSync } from "node:fs";
import { PrivyClient } from "@privy-io/node";
import { createPublicClient, encodeDeployData, formatEther, getAddress, http } from "viem";
import { polygon } from "viem/chains";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};
const abi = JSON.parse(readFileSync(new URL("../.contracts-build/VerseNameRegistry.abi.json", import.meta.url), "utf8"));
const bytecode = `0x${readFileSync(new URL("../.contracts-build/VerseNameRegistry.bin", import.meta.url), "utf8").trim()}`;
const account = getAddress(required("REGISTRY_ADMIN_ADDRESS"));
const data = encodeDeployData({ abi, bytecode, args: [
  account,
  getAddress(required("REGISTRY_REGISTRAR_ADDRESS")),
  getAddress(required("REGISTRY_PAUSER_ADDRESS")),
  required("REGISTRY_TOKEN_BASE_URI"),
] });
const rpc = createPublicClient({ chain: polygon, transport: http(required("POLYGON_RPC_URL"), { timeout: 15000, retryCount: 1 }) });
if (await rpc.getChainId() !== 137) throw new Error("RPC is not Polygon mainnet.");
const [balance, gas, fees] = await Promise.all([
  rpc.getBalance({ address: account }),
  rpc.estimateGas({ account, data }),
  rpc.estimateFeesPerGas(),
]);
const gasLimit = (gas * 120n + 99n) / 100n;
const maximumFee = gasLimit * fees.maxFeePerGas;
console.log(JSON.stringify({ chainId: 137, deployer: account, balancePOL: formatEther(balance), estimatedBudgetPOL: formatEther(maximumFee), funded: balance >= maximumFee }));
// Estimate-only is the default. A stable request ID prevents accidental repeat submission.
if (!process.argv.includes("--submit")) process.exit(0);
if (required("REGISTRY_DEPLOYMENT_CONFIRMATION") !== "DEPLOY_VERSE_REGISTRY_POLYGON") throw new Error("Deployment confirmation is missing.");
if (balance < maximumFee) throw new Error("Fund the deployer with POL before deploying.");
const privy = new PrivyClient({ appId: required("PRIVY_APP_ID"), appSecret: required("PRIVY_APP_SECRET") });
const walletId = required("VERSE_ADMIN_WALLET_ID");
const wallet = await privy.wallets().get(walletId);
if (getAddress(wallet.address) !== account) throw new Error("Privy wallet does not match the deployer.");
const result = await privy.wallets().ethereum().sendTransaction(walletId, {
  caip2: "eip155:137", sponsor: false,
  idempotency_key: required("REGISTRY_DEPLOYMENT_REQUEST_ID"),
  authorization_context: { authorization_private_keys: [required("VERSE_ADMIN_AUTHORIZATION_KEY")] },
  params: { transaction: {
    chain_id: 137, data, value: "0x0",
    gas_limit: `0x${gasLimit.toString(16)}`,
    max_fee_per_gas: `0x${fees.maxFeePerGas.toString(16)}`,
    max_priority_fee_per_gas: `0x${fees.maxPriorityFeePerGas.toString(16)}`,
  } },
});
console.log(JSON.stringify({ transactionId: result.transaction_id, transactionHash: result.hash }));
if (!result.hash) throw new Error("Transaction accepted; obtain its hash from Privy before continuing. Do not create a new deployment request.");
const receipt = await rpc.waitForTransactionReceipt({ hash: result.hash, confirmations: 5, timeout: 180000 });
if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("Registry deployment failed.");
console.log(JSON.stringify({ contractAddress: receipt.contractAddress, transactionHash: result.hash }));
