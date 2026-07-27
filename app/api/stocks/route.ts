import { NextResponse } from "next/server";
import { scout } from "@/lib/rpc";
import { memo } from "@/lib/upstream";
import { STOCK_TOKENS } from "@/lib/config";

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

async function load() {
  return Promise.all(
    STOCK_TOKENS.map(async (t) => {
      try {
        const d = await scout<ScoutToken>(`/api/v2/tokens/${t.address}`);
        return {
          symbol: t.symbol,
          address: t.address,
          name: d.name ?? null,
          price: n(d.exchange_rate),
          marketCap: n(d.circulating_market_cap),
          volume24h: n(d.volume_24h),
          holders: n(d.holders_count),
          icon: d.icon_url ?? null,
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
    return NextResponse.json({
      ok: anyOk,
      stale,
      ts: Date.now(),
      stocks: value,
    });
  } catch (err) {
    console.error("[pylon] /api/stocks:", (err as Error).message);
    return NextResponse.json(
      { ok: false, error: (err as Error).message, ts: Date.now(), stocks: [] },
      { status: 200 },
    );
  }
}
