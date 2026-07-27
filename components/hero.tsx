"use client";

import { usePoll } from "@/lib/use-poll";
import { num, gwei, compact, DASH } from "@/lib/format";
import { CHAIN } from "@/lib/config";
import { LivePill, Skeleton } from "./primitives";
import { ChainMonitor } from "./chain-monitor";

type ChainFeed = {
  ok: boolean;
  height: number | null;
  gasPriceWei: number | null;
  baseFeeWei: number | null;
  txInLatest: number | null;
  totals: {
    blocks: number | null;
    transactions: number | null;
    addresses: number | null;
    txToday: number | null;
    avgBlockTimeMs: number | null;
  } | null;
};

export function Hero() {
  const { data, live, loading } = usePoll<ChainFeed>("/api/chain");

  const tiles = [
    {
      label: "Block height",
      value: data?.height != null ? num(data.height) : DASH,
      hint: "latest sealed block",
    },
    {
      label: "Gas price",
      value: data?.gasPriceWei != null ? `${gwei(data.gasPriceWei)}` : DASH,
      hint: "gwei · eth_gasPrice",
    },
    {
      label: "Tx in latest block",
      value: data?.txInLatest != null ? num(data.txInLatest) : DASH,
      hint: "transactions sealed",
    },
    {
      label: "Chain status",
      value: live ? "OPERATIONAL" : DASH,
      hint: live ? `chain id ${CHAIN.id}` : "no response from rpc",
      accent: live,
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-[color:var(--color-border)]">
      {/* layered background */}
      <div aria-hidden className="hero-grid absolute inset-0" />
      <div aria-hidden className="hero-glow absolute inset-0" />
      <div aria-hidden className="hero-scan absolute inset-0" />
      <div aria-hidden className="sweep absolute inset-0" />

      <div className="relative mx-auto max-w-[1400px] px-4 pb-10 pt-12 sm:px-6 sm:pt-16">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          {/* left: type */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <LivePill live={live} />
              <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                {CHAIN.name} · {CHAIN.stack} · chain id {CHAIN.id}
              </span>
            </div>

            <h1 className="h-display mt-6 text-4xl leading-[1.03] text-[color:var(--color-fg)] sm:text-5xl lg:text-[3.75rem]">
              Every block on {CHAIN.name},{" "}
              <span className="text-[color:var(--color-accent)]">
                as it lands.
              </span>
            </h1>

            <p className="mt-5 max-w-[58ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              A public, read-only dashboard for {CHAIN.name}. Live blocks, gas,
              and the tokenized equities issued on-chain. No login, no wallet,
              no tracking. Every figure is fetched from a public endpoint at
              request time — nothing here is stored or simulated.
            </p>

            {/* stat tiles */}
            <div className="mt-8 grid grid-cols-2 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-4">
              {tiles.map((t) => (
                <div
                  key={t.label}
                  className="bg-[color:var(--color-surface)] p-3.5"
                >
                  <div className="truncate text-[10px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
                    {t.label}
                  </div>
                  <div className="mt-2.5 h-7">
                    {loading ? (
                      <Skeleton className="h-6 w-20" />
                    ) : (
                      <div
                        className={`truncate text-[22px] leading-none ${
                          t.accent
                            ? "text-[color:var(--color-accent)]"
                            : "text-[color:var(--color-fg)]"
                        }`}
                      >
                        {t.value}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 truncate text-[10px] text-[color:var(--color-dim)]">
                    {t.hint}
                  </div>
                </div>
              ))}
            </div>

            {/* aggregate row */}
            <div className="mt-px grid grid-cols-2 gap-px border-x border-b border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-4">
              {[
                { l: "Total transactions", v: data?.totals?.transactions },
                { l: "Transactions today", v: data?.totals?.txToday },
                { l: "Total addresses", v: data?.totals?.addresses },
                { l: "Total blocks", v: data?.totals?.blocks },
              ].map((x) => (
                <div
                  key={x.l}
                  className="bg-[color:var(--color-surface)] px-3.5 py-2.5"
                >
                  <div className="truncate text-[9px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
                    {x.l}
                  </div>
                  <div className="mt-1 h-4 text-[13px] text-[color:var(--color-fg)]">
                    {loading ? (
                      <Skeleton className="h-3.5 w-16" />
                    ) : x.v != null ? (
                      compact(x.v)
                    ) : (
                      DASH
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* right: live monitor */}
          <div className="lg:pt-1">
            <ChainMonitor />
          </div>
        </div>
      </div>
    </section>
  );
}
