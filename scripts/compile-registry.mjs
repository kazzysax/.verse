import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceName = "contracts/VerseNameRegistry.sol";
const input = {
  language: "Solidity",
  sources: {
    [sourceName]: { content: readFileSync(path.join(root, sourceName), "utf8") },
  },
  settings: {
    evmVersion: "paris",
    optimizer: { enabled: true, runs: 200 },
    metadata: { bytecodeHash: "ipfs" },
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
const diagnostics = output.errors ?? [];
for (const diagnostic of diagnostics) {
  const stream = diagnostic.severity === "error" ? process.stderr : process.stdout;
  stream.write(`${diagnostic.formattedMessage}\n`);
}
if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) process.exit(1);

const contract = output.contracts[sourceName].VerseNameRegistry;
const outputDir = path.join(root, ".contracts-build");
mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, "VerseNameRegistry.abi.json"), `${JSON.stringify(contract.abi, null, 2)}\n`);
writeFileSync(path.join(outputDir, "VerseNameRegistry.bin"), `${contract.evm.bytecode.object}\n`);
process.stdout.write("Compiled VerseNameRegistry for the Paris EVM target.\n");
