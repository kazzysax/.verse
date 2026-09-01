import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
} from "viem";
import { polygon, polygonAmoy } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const root = fileURLToPath(new URL("..", import.meta.url));
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};
const network = process.env.VERSE_CHAIN_MODE === "amoy" ? "amoy" : "mainnet";
const expectedConfirmation = network === "mainnet" ? "DEPLOY_VERSE_REGISTRY_POLYGON" : "DEPLOY_VERSE_REGISTRY_AMOY";
if (required("REGISTRY_DEPLOYMENT_CONFIRMATION") !== expectedConfirmation) {
  throw new Error(`REGISTRY_DEPLOYMENT_CONFIRMATION must equal ${expectedConfirmation}.`);
}

const privateKey = required("REGISTRY_DEPLOYER_PRIVATE_KEY");
if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw new Error("REGISTRY_DEPLOYER_PRIVATE_KEY is invalid.");
const chain = network === "amoy" ? polygonAmoy : polygon;
const account = privateKeyToAccount(privateKey);
const transport = http(required("POLYGON_RPC_URL"), { retryCount: 2, timeout: 15_000 });
const walletClient = createWalletClient({ account, chain, transport });
const publicClient = createPublicClient({ chain, transport });
const abi = JSON.parse(readFileSync(path.join(root, ".contracts-build/VerseNameRegistry.abi.json"), "utf8"));
const bytecode = `0x${readFileSync(path.join(root, ".contracts-build/VerseNameRegistry.bin"), "utf8").trim()}`;
const args = [
  getAddress(required("REGISTRY_ADMIN_ADDRESS")),
  getAddress(required("REGISTRY_REGISTRAR_ADDRESS")),
  getAddress(required("REGISTRY_PAUSER_ADDRESS")),
  required("REGISTRY_TOKEN_BASE_URI"),
];

const hash = await walletClient.deployContract({ abi, bytecode, args });
const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 5, timeout: 180_000 });
if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("Registry deployment reverted.");
process.stdout.write(`${JSON.stringify({ network, chainId: chain.id, contractAddress: receipt.contractAddress, transactionHash: hash })}\n`);
