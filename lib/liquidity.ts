/**
 * Whether a token has a Uniswap V3 pool on this chain, and what is in it.
 *
 * An earlier version of /scan said no source published liquidity here. That
 * was wrong: Uniswap V3 is deployed on Robinhood Chain, and pool reserves
 * are a plain `balanceOf` away. What no source publishes is a *list* of
 * pools for a token — so this asks the factory directly, one question per
 * fee tier, and reports what comes back.
 *
 * The absence of a pool is itself a finding worth printing. Robinhood's own
 * stock tokens have none: they are not traded on a DEX. A token that claims
 * to be tradeable and has none is telling you something.
 *
 * Server-side only.
 */

import { rpcBatch } from "./rpc";
import { BLOCKSCOUT } from "./config";

/** Read off a deployed pool: UniswapV3Pool.factory() on this chain. */
export const V3_FACTORY = "0xEa561E058313B96011e5070Ca7d0f027A44E3748";

/** The two assets everything here is quoted against. */
const QUOTES = [
  { symbol: "USDG", address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168", decimals: 6 },
  { symbol: "WETH", address: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73", decimals: 18 },
] as const;

/** Uniswap V3's standard fee tiers, in hundredths of a basis point. */
const FEE_TIERS = [100, 500, 3000, 10000] as const;

const SELECTOR_GET_POOL = "0x1698ee82";
const SELECTOR_BALANCE_OF = "0x70a08231";

const pad = (hex: string) => hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");
const addrArg = (a: string) => pad(a);
const uintArg = (n: number) => pad(n.toString(16));
const readAddress = (result: string | null) => {
  if (!result || result.length < 42) return null;
  const a = `0x${result.slice(-40)}`;
  return /^0x0{40}$/.test(a) ? null : a;
};

export type Pool = {
  address: string;
  quoteSymbol: string;
  quoteAddress: string;
  feeTier: number;
  /** Raw balances held by the pool. Strings, because these overflow Number. */
  tokenReserve: string | null;
  quoteReserve: string | null;
  quoteDecimals: number;
  explorerUrl: string;
};

export type LiquidityReading =
  | { state: "pools"; pools: Pool[]; checked: number }
  | { state: "none"; checked: number }
  | { state: "unchecked"; reason: string };

const toBig = (res: unknown): string | null => {
  if (typeof res !== "string" || res === "0x" || res.length < 3) return null;
  try {
    return BigInt(res).toString();
  } catch {
    return null;
  }
};

/**
 * Ask the factory for every standard pairing of this token, then read the
 * balances of whatever it names.
 *
 * These go out as two batched requests rather than ten separate ones. Sent
 * individually and in parallel the public node answered the first few and
 * returned 429 for the rest, which produced a scan reporting "no pools" for
 * a token that has one — the exact failure this file is supposed to prevent.
 */
export async function readLiquidity(
  token: string,
  budgetMs = 5000,
): Promise<LiquidityReading> {
  const pairs = QUOTES.flatMap((q) =>
    FEE_TIERS.map((fee) => ({ quote: q, fee })),
  ).filter((p) => p.quote.address.toLowerCase() !== token.toLowerCase());

  let found: Array<{ address: string; quote: (typeof QUOTES)[number]; fee: number }>;
  try {
    const results = await rpcBatch<string>(
      pairs.map((p) => ({
        method: "eth_call",
        params: [
          {
            to: V3_FACTORY,
            data: `${SELECTOR_GET_POOL}${addrArg(token)}${addrArg(
              p.quote.address,
            )}${uintArg(p.fee)}`,
          },
          "latest",
        ],
      })),
      { timeoutMs: budgetMs, attempts: 1 },
    );
    found = [];
    pairs.forEach((p, i) => {
      const address = readAddress(results[i]);
      if (address) found.push({ address, quote: p.quote, fee: p.fee });
    });
  } catch (err) {
    console.error("[pylon] liquidity:", (err as Error)?.message);
    return {
      state: "unchecked",
      reason: `the node did not answer when asked which pools exist (${
        (err as Error)?.message ?? "no response"
      })`,
    };
  }

  if (found.length === 0) {
    return { state: "none", checked: pairs.length };
  }

  // Two balances per pool, one request for all of them.
  let balances: string[] = [];
  try {
    balances = await rpcBatch<string>(
      found.flatMap((f) => [
        {
          method: "eth_call",
          params: [
            { to: token, data: `${SELECTOR_BALANCE_OF}${addrArg(f.address)}` },
            "latest",
          ],
        },
        {
          method: "eth_call",
          params: [
            {
              to: f.quote.address,
              data: `${SELECTOR_BALANCE_OF}${addrArg(f.address)}`,
            },
            "latest",
          ],
        },
      ]),
      { timeoutMs: budgetMs, attempts: 1 },
    );
  } catch (err) {
    // The pools are established even if their contents are not. Reserves
    // come back null and the panel prints a dash rather than a zero.
    console.error("[pylon] liquidity balances:", (err as Error)?.message);
  }

  const pools: Pool[] = found.map((f, i) => ({
    address: f.address,
    quoteSymbol: f.quote.symbol,
    quoteAddress: f.quote.address,
    feeTier: f.fee,
    tokenReserve: toBig(balances[i * 2]),
    quoteReserve: toBig(balances[i * 2 + 1]),
    quoteDecimals: f.quote.decimals,
    explorerUrl: `${BLOCKSCOUT}/address/${f.address}`,
  }));

  return { state: "pools", pools, checked: pairs.length };
}
