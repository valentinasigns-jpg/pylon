import { NextResponse } from "next/server";
import { scout } from "@/lib/rpc";
import { memo } from "@/lib/upstream";
import { STOCK_TOKENS } from "@/lib/config";
import { checkCanonical, getRegistry } from "@/lib/canonical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Equity token prices move on a far slower clock than blocks do.
const TTL_MS = 20000;

type ScoutToken = {
  name?: string;
  exchange_rate?: string | null;
  circulating_market_cap?: string | null;
  volume_24h?: string | null;
  holders_count?: string | null;
  icon_url?: string | null;
};

const n = (v: string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

// Eight tokens are fetched at once. A generous per-request deadline
// multiplied across that fan-out is how this route used to hang past its
// own limit, so each call gets a tight budget and no retry — a token that
// misses simply reports itself as unavailable.
const PER_TOKEN_TIMEOUT_MS = 4500;

async function load() {
  /**
   * Every address this panel puts on screen is compared against Robinhood's
   * published contract list before it is shown. The list is the reason the
   * comparison is possible at all: Robinhood states that a token carrying a
   * matching ticker at a different address is not theirs, and a page that
   * displays equity tickers without checking that is repeating the claim
   * rather than verifying it.
   */
  const registry = await getRegistry();

  return Promise.all(
    STOCK_TOKENS.map(async (t) => {
      const canonical = checkCanonical(registry, t.address, t.symbol);
      try {
        const d = await scout<ScoutToken>(`/api/v2/tokens/${t.address}`, {
          timeoutMs: PER_TOKEN_TIMEOUT_MS,
          attempts: 1,
        });
        return {
          symbol: t.symbol,
          address: t.address,
          name: d.name ?? null,
          price: n(d.exchange_rate),
          marketCap: n(d.circulating_market_cap),
          volume24h: n(d.volume_24h),
          holders: n(d.holders_count),
          icon: d.icon_url ?? null,
          canonical,
          ok: true as const,
        };
      } catch {
        return {
          symbol: t.symbol,
          address: t.address,
          name: null,
          price: null,
          marketCap: null,
          volume24h: null,
          holders: null,
          icon: null,
          canonical,
          ok: false as const,
        };
      }
    }),
  );
}

export async function GET() {
  try {
    const { value, stale } = await memo("stocks", TTL_MS, load);
    const anyOk = value.some((r) => r.ok && r.price !== null);
    const anyReached = value.some((r) => r.ok);
    return NextResponse.json({
      ok: anyOk,
      stale,
      // Reached the indexer but it had no price for anything: an absence,
      // not an outage. Nothing reached at all: an outage.
      reason: anyOk ? null : anyReached ? "empty" : "unreachable",
      ts: Date.now(),
      // Token metadata is indexer-only — a bare node cannot produce holder
      // counts or prices, so this route has no second source by design.
      source: "blockscout" as const,
      fellBack: false,
      stocks: value,
    });
  } catch (err) {
    console.error("[pylon] /api/stocks:", (err as Error).message);
    return NextResponse.json(
      {
        ok: false,
        reason: "unreachable",
        error: (err as Error).message,
        ts: Date.now(),
        stocks: [],
      },
      { status: 200 },
    );
  }
}
