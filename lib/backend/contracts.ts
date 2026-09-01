export const VERSE_NAME_REGISTRY_ABI = [
  {
    type: "function",
    name: "mintName",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "label", type: "string" },
      { name: "requestId", type: "bytes32" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOfName",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ name: "owner", type: "address" }],
  },
  {
    type: "event",
    name: "NameMinted",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "label", type: "string", indexed: false },
      { name: "owner", type: "address", indexed: true },
      { name: "requestId", type: "bytes32", indexed: true },
    ],
  },
] as const;
