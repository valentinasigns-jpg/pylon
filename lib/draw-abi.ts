/**
 * The parts of PylonDraw the site talks to.
 *
 * Kept as a literal so viem can type the calls, and kept deliberately
 * small: this site only ever reads. Creating a draw is a transaction the
 * organiser sends themselves, from their own wallet, with calldata this
 * site hands them — see /create. Nothing here ever asks for a signature,
 * so there is no wallet to connect and nothing of yours to leak.
 */
export const PYLON_DRAW_ABI = [
  {
    type: "function",
    name: "drawCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "drawInfo",
    stateMutability: "view",
    inputs: [{ name: "drawId", type: "uint256" }],
    outputs: [
      { name: "organiser", type: "address" },
      { name: "entrantsRoot", type: "bytes32" },
      { name: "entrantCount", type: "uint32" },
      { name: "winnerCount", type: "uint16" },
      { name: "drawAt", type: "uint64" },
      { name: "sequenceNumber", type: "uint64" },
      { name: "randomValue", type: "bytes32" },
      { name: "status", type: "uint8" },
      { name: "metadataURI", type: "string" },
    ],
  },
  {
    type: "function",
    name: "getDraw",
    stateMutability: "view",
    inputs: [{ name: "drawId", type: "uint256" }],
    outputs: [
      { name: "entrantsRoot", type: "bytes32" },
      { name: "randomValue", type: "bytes32" },
      { name: "winnerIndices", type: "uint32[]" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "selectWinners",
    stateMutability: "pure",
    inputs: [
      { name: "randomValue", type: "bytes32" },
      { name: "n", type: "uint32" },
      { name: "k", type: "uint16" },
    ],
    outputs: [{ type: "uint32[]" }],
  },
  {
    type: "function",
    name: "verifyWinner",
    stateMutability: "view",
    inputs: [
      { name: "drawId", type: "uint256" },
      { name: "index", type: "uint32" },
      { name: "entrant", type: "address" },
      { name: "proof", type: "bytes32[]" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "createDraw",
    stateMutability: "payable",
    inputs: [
      { name: "entrantsRoot", type: "bytes32" },
      { name: "entrantCount", type: "uint32" },
      { name: "winnerCount", type: "uint16" },
      { name: "drawAt", type: "uint64" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "executeDraw",
    stateMutability: "payable",
    inputs: [{ name: "drawId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "retryDraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "drawId", type: "uint256" }],
    outputs: [],
  },
] as const;
