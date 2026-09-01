import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ganache from "ganache";
import solc from "solc";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  getAddress,
  keccak256,
  stringToHex,
} from "viem";

const root = fileURLToPath(new URL("..", import.meta.url));

function compileRegistry() {
  const sourceName = "contracts/VerseNameRegistry.sol";
  const input = {
    language: "Solidity",
    sources: {
      [sourceName]: { content: readFileSync(path.join(root, sourceName), "utf8") },
    },
    settings: {
      evmVersion: "paris",
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const output = JSON.parse(
    solc.compile(JSON.stringify(input), {
      import: (importPath) => {
        try {
          return { contents: readFileSync(path.join(root, "node_modules", importPath), "utf8") };
        } catch {
          return { error: `Import not found: ${importPath}` };
        }
      },
    }),
  );
  const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
  assert.deepEqual(errors, [], errors.map((entry) => entry.formattedMessage).join("\n"));
  const contract = output.contracts[sourceName].VerseNameRegistry;
  return { abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}` };
}

async function expectRevert(publicClient, send) {
  const hash = await send().catch(() => null);
  if (!hash) return;
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, "reverted");
}

test("registry enforces registrar roles, replay protection, transfers, and pause", async () => {
  const provider = ganache.provider({
    chain: { chainId: 1337, hardfork: "shanghai" },
    logging: { quiet: true },
    wallet: { totalAccounts: 5 },
  });
  try {
    const chain = defineChain({
      id: 1337,
      name: "Ganache",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["http://127.0.0.1"] } },
    });
    const transport = custom(provider);
    const publicClient = createPublicClient({ chain, transport });
    const walletClient = createWalletClient({ chain, transport });
    const [admin, registrar, pauser, owner, recipient] = await walletClient.getAddresses();
    const { abi, bytecode } = compileRegistry();
    const deployHash = await walletClient.deployContract({
      abi,
      bytecode,
      account: admin,
      gas: 8_000_000n,
      args: [admin, registrar, pauser, "https://metadata.example/verse/"],
    });
    const deployment = await publicClient.waitForTransactionReceipt({ hash: deployHash });
    assert.equal(deployment.status, "success");
    assert.ok(deployment.contractAddress);
    const address = deployment.contractAddress;
    const requestOne = keccak256(stringToHex("domain-order-1"));
    const requestTwo = keccak256(stringToHex("domain-order-2"));

    await expectRevert(publicClient, () =>
      walletClient.writeContract({
        address,
        abi,
        functionName: "mintName",
        args: [owner, "alice", requestOne],
        account: owner,
        gas: 1_000_000n,
      }),
    );

    const mintHash = await walletClient.writeContract({
      address,
      abi,
      functionName: "mintName",
      args: [owner, "alice", requestOne],
      account: registrar,
      gas: 1_000_000n,
    });
    assert.equal((await publicClient.waitForTransactionReceipt({ hash: mintHash })).status, "success");
    assert.equal(
      getAddress(await publicClient.readContract({ address, abi, functionName: "ownerOfName", args: ["alice"] })),
      getAddress(owner),
    );

    await expectRevert(publicClient, () =>
      walletClient.writeContract({
        address,
        abi,
        functionName: "mintName",
        args: [recipient, "bob", requestOne],
        account: registrar,
        gas: 1_000_000n,
      }),
    );
    await expectRevert(publicClient, () =>
      walletClient.writeContract({
        address,
        abi,
        functionName: "mintName",
        args: [recipient, "alice", requestTwo],
        account: registrar,
        gas: 1_000_000n,
      }),
    );

    const transferHash = await walletClient.writeContract({
      address,
      abi,
      functionName: "transferFrom",
      args: [owner, recipient, 1n],
      account: owner,
      gas: 1_000_000n,
    });
    assert.equal((await publicClient.waitForTransactionReceipt({ hash: transferHash })).status, "success");

    const pauseHash = await walletClient.writeContract({
      address,
      abi,
      functionName: "pause",
      account: pauser,
      gas: 1_000_000n,
    });
    await publicClient.waitForTransactionReceipt({ hash: pauseHash });
    await expectRevert(publicClient, () =>
      walletClient.writeContract({
        address,
        abi,
        functionName: "transferFrom",
        args: [recipient, owner, 1n],
        account: recipient,
        gas: 1_000_000n,
      }),
    );

    const unpauseHash = await walletClient.writeContract({
      address,
      abi,
      functionName: "unpause",
      account: pauser,
      gas: 1_000_000n,
    });
    await publicClient.waitForTransactionReceipt({ hash: unpauseHash });
    const returnHash = await walletClient.writeContract({
      address,
      abi,
      functionName: "transferFrom",
      args: [recipient, owner, 1n],
      account: recipient,
      gas: 1_000_000n,
    });
    assert.equal((await publicClient.waitForTransactionReceipt({ hash: returnHash })).status, "success");
  } finally {
    await provider.disconnect();
  }
});
