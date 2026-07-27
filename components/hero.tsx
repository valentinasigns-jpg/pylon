"use client";

import Link from "next/link";
import { usePoll } from "@/lib/use-poll";
import { num, gwei, compact } from "@/lib/format";
import { CHAIN, GITHUB_URL } from "@/lib/config";
import { LivePill, Skeleton, FeedMeta } from "./primitives";
import { ChainForm } from "./chain-form";
import { Metric, Sparkline } from "./metric";
import { SearchPanel } from "./search-panel";

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
  const { data, live, loading, updatedAt, reason, source, fellBack, stale } =
    usePoll<ChainFeed>("/api/chain");

  /**
   * Three figures, and only three. Height says the chain is moving,
   * transactions say how much is in it, base fee says what it costs — the
   * whole state of the network in one glance. Gas price and the aggregate
   * counters carry on below and in the dashboard; putting eight numbers here
   * meant none of them was the answer to anything.
   */
  const headline: Array<{
    label: string;
    hint: string;
    value: number | null;
    format: (n: number | null) => string;
    unit?: string;
  }> = [
    {
      label: "Block height",
      hint: "latest sealed block",
      value: data?.height ?? null,
      format: (n) => num(n === null ? null : Math.round(n)),
    },
    {
      label: "Tx in latest block",
      hint: "transactions sealed",
      value: data?.txInLatest ?? null,
      format: (n) => num(n === null ? null : Math.round(n)),
    },
    {
      label: "Base fee",
      hint: "protocol floor per gas",
      value: data?.baseFeeWei ?? null,
      format: (n) => gwei(n, 4),
      unit: "gwei",
    },
  ];

  return (
    <section className="relative overflow-hidden border-b border-[color:var(--color-border)]">
      {/* layered background — the grid itself comes from the global canvas */}
      <div aria-hidden className="hero-glow absolute inset-0" />
      <div aria-hidden className="hero-scan absolute inset-0" />
      <div aria-hidden className="sweep absolute inset-0" />

      <div className="relative mx-auto max-w-[1400px] px-4 pb-10 pt-10 sm:px-6 sm:pt-10">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          {/* left: type */}
          <div>
            {/* The live pill is the strongest trust signal on the site, so it
                leads — with the source repository next to it, because the
                other half of trusting a number is being able to read the
                code that fetched it. */}
            <div className="flex flex-wrap items-center gap-2.5">
              <LivePill live={live} reason={reason} />
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-[color:var(--color-border)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
              >
                source on github ↗
              </a>
              <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                {CHAIN.name} · chain id {CHAIN.id}
              </span>
            </div>

            <h1 className="h-display mt-5 text-4xl leading-[1.03] text-[color:var(--color-fg)] sm:text-5xl lg:text-[3.75rem]">
              Numbers nobody{" "}
              <span className="text-[color:var(--color-accent)]">
                touched up.
              </span>
            </h1>

            <p className="mt-4 max-w-[58ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              {CHAIN.name}, read straight from its public endpoints and shown
              as it comes back. No login, no wallet, no tracking. Nothing here
              is estimated, smoothed or filled in — when a source has nothing
              to say, the field stays empty and the panel says why.
            </p>

            {/* the three figures */}
            <div className="mt-6 grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] sm:grid-cols-3">
              {headline.map((t) => (
                <div
                  key={t.label}
                  className="bg-[color:var(--color-surface)] p-4"
                >
                  <div className="truncate text-[10px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
                    {t.label}
                  </div>
                  <div className="mt-3 flex h-[2.75rem] items-baseline gap-1.5 sm:h-[3.5rem]">
                    {loading ? (
                      <Skeleton className="h-9 w-28 self-center" />
                    ) : (
                      <>
                        <Metric
                          value={t.value}
                          format={t.format}
                          size="xl"
                          className="truncate leading-none text-[color:var(--color-fg)]"
                        />
                        {t.unit && (
                          <span className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
                            {t.unit}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {/* readings taken since this page opened — starts empty,
                      nothing is back-filled */}
                  <Sparkline value={t.value} className="mt-2" />
                  <div className="mt-1 truncate text-[10px] text-[color:var(--color-dim)]">
                    {t.hint}
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

        {/* Looking something up is the most common reason anyone opens an
            explorer, so the field sits on the first screen rather than six
            sections down. */}
        <div className="mt-6">
          <SearchPanel bare />
        </div>

        {/* aggregate row — context for the three figures above, deliberately
            subordinate to them */}
        <div className="mt-10 grid grid-cols-2 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-4">
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <FeedMeta
            updatedAt={updatedAt}
            source={source}
            fellBack={fellBack}
            stale={stale}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/app"
              className="border border-[color:var(--color-accent)]/50 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] transition-colors hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-bg)]"
            >
              open dashboard
            </Link>
            <Link
              href="/docs"
              className="border border-[color:var(--color-border)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-dim)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
            >
              api
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
