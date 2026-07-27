"use client";

import { usePoll } from "@/lib/use-poll";
import { num, gwei, compact, DASH } from "@/lib/format";
import { CHAIN } from "@/lib/config";
import { LivePill, Skeleton } from "./primitives";
import { ChainForm } from "./chain-form";
import { Metric, Sparkline } from "./metric";

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

  const tiles: Array<{
    label: string;
    hint: string;
    metric?: { value: number | null; format: (n: number | null) => string };
    text?: string;
    accent?: boolean;
  }> = [
    {
      label: "Block height",
      hint: "latest sealed block",
      metric: {
        value: data?.height ?? null,
        format: (n) => num(n === null ? null : Math.round(n)),
      },
    },
    {
      label: "Gas price",
      hint: "gwei · eth_gasPrice",
      metric: { value: data?.gasPriceWei ?? null, format: (n) => gwei(n) },
    },
    {
      label: "Tx in latest block",
      hint: "transactions sealed",
      metric: {
        value: data?.txInLatest ?? null,
        format: (n) => num(n === null ? null : Math.round(n)),
      },
    },
    {
      label: "Chain status",
      hint: live ? `chain id ${CHAIN.id}` : "no response from rpc",
      text: live ? "OPERATIONAL" : DASH,
      accent: live,
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-[color:var(--color-border)]">
      {/* layered background — the grid itself comes from the global canvas */}
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
                  <div className="mt-2.5 flex h-7 items-center">
                    {loading ? (
                      <Skeleton className="h-6 w-20" />
                    ) : t.metric ? (
                      <Metric
                        value={t.metric.value}
                        format={t.metric.format}
                        className="truncate leading-none text-[color:var(--color-fg)]"
                      />
                    ) : (
                      <div
                        className={`truncate text-[22px] leading-none ${
                          t.accent
                            ? "text-[color:var(--color-accent)]"
                            : "text-[color:var(--color-fg)]"
                        }`}
                      >
                        {t.text}
                      </div>
                    )}
                  </div>
                  {/* readings taken since this page opened — starts empty,
                      nothing is back-filled */}
                  {t.metric ? (
                    <Sparkline value={t.metric.value} className="mt-1" />
                  ) : (
                    <div className="mt-1 h-5" aria-hidden />
                  )}
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
                  <div className="mt-1 flex h-4 items-center text-[color:var(--color-fg)]">
                    {loading ? (
                      <Skeleton className="h-3.5 w-16" />
                    ) : (
                      <Metric
                        value={x.v ?? null}
                        format={compact}
                        size="sm"
                        className="leading-none"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* right: the living form — a wireframe surface driven by the
              same chain readings shown on the left */}
          <div className="relative order-first lg:order-none lg:pt-1">
            <div className="relative aspect-square w-full max-w-[560px] lg:mx-auto">
              <ChainForm />

              {/* corner ticks, so it reads as a viewport and not a sticker */}
              <span aria-hidden className="absolute left-0 top-0 h-3 w-3 border-l border-t border-[color:var(--color-accent)]/45" />
              <span aria-hidden className="absolute right-0 top-0 h-3 w-3 border-r border-t border-[color:var(--color-accent)]/45" />
              <span aria-hidden className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-[color:var(--color-accent)]/45" />
              <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-[color:var(--color-accent)]/45" />

              <span className="absolute left-0 top-0 -translate-y-5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-dim)]">
                surface · live
              </span>
              <span className="absolute right-0 top-0 -translate-y-5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-dim)]">
                chain {CHAIN.id}
              </span>
            </div>

            <p className="mx-auto mt-6 max-w-[560px] text-[10px] uppercase leading-relaxed tracking-[0.14em] text-[color:var(--color-dim)]">
              amplitude ← base fee · brightness ← tx in block · ripple ← each
              new block · tilt ← pointer
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
