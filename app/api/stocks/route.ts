import { NextResponse } from "next/server";
import { scout } from "@/lib/rpc";
import { STOCK_TOKENS } from "@/lib/config";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type ScoutToken = {
  address_hash?: string;
  name?: string;
  symbol?: string;
  decimals?: string;
  exchange_rate?: string | null;
  circulating_market_cap?: string | null;
  volume_24h?: string | null;
  holders_count?: string | null;
  total_supply?: string | null;
  icon_url?: string | null;
};

const n = (v: string | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

export async function GET() {
  const results = await Promise.all(
    STOCK_TOKENS.map(async (t) => {
      try {
        const d = await scout<ScoutToken>(`/api/v2/tokens/${t.address}`, 10);
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

  const anyOk = results.some((r) => r.ok && r.price !== null);

  return NextResponse.json({
    ok: anyOk,
    ts: Date.now(),
    stocks: results,
  });
}
