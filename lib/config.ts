// Data sources. All public, no API keys required.
// Robinhood Chain is an Arbitrum Orbit L2, chain id 4663.

export const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
export const BLOCKSCOUT = "https://robinhoodchain.blockscout.com";

/**
 * Blockscout exposes a JSON-RPC proxy, so the same method names can be
 * served from a second, independently operated host when the node is
 * unreachable. Verified: eth_blockNumber answers here.
 */
export const RPC_FALLBACK_URL = `${BLOCKSCOUT}/api/eth-rpc`;

export const CHAIN = {
  name: "Robinhood Chain",
  id: 4663,
  stack: "Arbitrum Orbit",
  currency: "ETH",
  explorer: BLOCKSCOUT,
};

// TODO: replace with the real X handle before launch.
export const X_HANDLE = "https://x.com/PLACEHOLDER";
export const GITHUB_URL = "https://github.com/valentinasigns-jpg/pylon";

export const SOURCES = {
  rpc: { label: "JSON-RPC", url: RPC_URL },
  explorer: { label: "Blockscout", url: BLOCKSCOUT },
};

/**
 * Tokenized equities issued on Robinhood Chain.
 * Addresses verified via the Blockscout token search — every one is an
 * admin-verified "• Robinhood Token" contract. Prices come from the same
 * explorer, so this grid is on-chain data, not an equities feed.
 */
export const STOCK_TOKENS: Array<{ symbol: string; address: string }> = [
  { symbol: "AAPL",  address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9" },
  { symbol: "NVDA",  address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC" },
  { symbol: "TSLA",  address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d" },
  { symbol: "MSFT",  address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74" },
  { symbol: "AMZN",  address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54" },
  { symbol: "GOOGL", address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3" },
  { symbol: "META",  address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35" },
  { symbol: "SPY",   address: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C" },
];

export const NAV = [
  { label: "Dashboard", href: "/app" },
  { label: "Just deployed", href: "/new" },
  { label: "Check a token", href: "/scan" },
  { label: "Blocks", href: "/blocks" },
  { label: "Base fee", href: "/gas" },
  { label: "Equities", href: "/stocks" },
  { label: "About", href: "/about" },
];

/** Client poll interval, ms. Server caches for less than this. */
export const POLL_MS = 6000;
