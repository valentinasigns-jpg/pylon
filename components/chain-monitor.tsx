"use client";

import { useEffect, useRef, useState } from "react";
import { usePoll } from "@/lib/use-poll";
import { num, gwei, compact, DASH } from "@/lib/format";

type Block = {
  number: number;
  hash: string;
  timestamp: number;
  txCount: number;
  gasUsed: number;
  baseFeeWei: number | null;
};
type Feed = { ok: boolean; blocks: Block[] };

const BARS = 28;
const LOG_LINES = 7;

/**
 * The hero's live panel: a terminal-framed monitor showing real block
 * activity as it lands. Bars are transaction counts, the log is a tail of
 * the chain. Everything here is the same data the blocks table uses.
 */
export function ChainMonitor() {
  const { data, live, loading } = usePoll<Feed>("/api/blocks", 5000);
  const [history, setHistory] = useState<Block[]>([]);
  const known = useRef<Set<number>>(new Set());

  // Accumulate a rolling window so the bar chart has depth beyond one poll.
  useEffect(() => {
    const incoming = data?.blocks ?? [];
    if (incoming.length === 0) return;
    const add = incoming.filter((b) => !known.current.has(b.number));
    if (add.length === 0) return;
    for (const b of add) known.current.add(b.number);
    if (known.current.size > 600) {
      known.current = new Set(incoming.map((b) => b.number));
    }
    setHistory((prev) =>
      [...add, ...prev].sort((a, b) => b.number - a.number).slice(0, 120),
    );
  }, [data]);

  const window_ = history.slice(0, BARS).reverse();
  const maxTx = Math.max(1, ...window_.map((b) => b.txCount));
  const log = history.slice(0, LOG_LINES);
  const head = history[0] ?? null;

  const avgTx =
    window_.length > 0
      ? window_.reduce((s, b) => s + b.txCount, 0) / window_.length
      : null;

  return (
    <div className="relative border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      {/* terminal chrome */}
      <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            <span className="h-1.5 w-1.5 bg-[color:var(--color-border)]" />
            <span className="h-1.5 w-1.5 bg-[color:var(--color-border)]" />
            <span className="h-1.5 w-1.5 bg-[color:var(--color-accent)]" />
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-dim)]">
            chain monitor
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em]">
          {live ? (
            <>
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]" />
              <span className="text-[color:var(--color-accent)]">streaming</span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 bg-[color:var(--color-dim)]" />
              <span className="text-[color:var(--color-dim)]">offline</span>
            </>
          )}
        </span>
      </div>

      {/* activity bars */}
      <div className="border-b border-[color:var(--color-border)] px-3 pb-3 pt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
            transactions per block
          </span>
          <span className="text-[10px] text-[color:var(--color-dim)]">
            peak {maxTx > 1 ? num(maxTx) : DASH}
          </span>
        </div>

        <div className="flex h-24 items-end gap-[3px]">
          {loading && window_.length === 0
            ? Array.from({ length: BARS }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton flex-1"
                  style={{ height: `${18 + ((i * 37) % 55)}%` }}
                />
              ))
            : window_.length === 0
              ? (
                <div className="flex h-full w-full items-center justify-center text-[11px] text-[color:var(--color-dim)]">
                  {DASH} no data
                </div>
              )
              : window_.map((b, i) => {
                  const h = Math.max(4, (b.txCount / maxTx) * 100);
                  const newest = i === window_.length - 1;
                  return (
                    <div
                      key={b.number}
                      className="group relative flex-1"
                      style={{ height: "100%" }}
                    >
                      <div
                        className={`absolute bottom-0 w-full transition-[height] duration-200 ease-out ${
                          newest
                            ? "bg-[color:var(--color-accent)]"
                            : "bg-[color:var(--color-accent)]/35 group-hover:bg-[color:var(--color-accent)]/70"
                        }`}
                        style={{ height: `${h}%` }}
                      />
                      <span className="pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-1 text-[9px] text-[color:var(--color-fg)] group-hover:block">
                        {b.txCount}
                      </span>
                    </div>
                  );
                })}
        </div>
      </div>

      {/* live log */}
      <div className="border-b border-[color:var(--color-border)] px-3 py-3">
        <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
          block feed
        </div>
        <div className="space-y-[3px]">
          {loading && log.length === 0
            ? Array.from({ length: LOG_LINES }).map((_, i) => (
                <div key={i} className="skeleton h-3.5 w-full" />
              ))
            : log.length === 0
              ? (
                <div className="py-4 text-center text-[11px] text-[color:var(--color-dim)]">
                  {DASH} awaiting blocks
                </div>
              )
              : log.map((b, i) => (
                  <div
                    key={b.number}
                    className={`flex items-baseline gap-2 whitespace-nowrap text-[11px] leading-[1.45] ${
                      i === 0 ? "slide-in" : ""
                    }`}
                    style={{ opacity: 1 - i * 0.11 }}
                  >
                    <span className="text-[color:var(--color-accent)]">›</span>
                    <span className="text-[color:var(--color-fg)]">
                      {num(b.number)}
                    </span>
                    <span className="text-[color:var(--color-dim)]">
                      {String(b.txCount).padStart(2, "0")} tx
                    </span>
                    <span className="text-[color:var(--color-dim)]">
                      {b.baseFeeWei != null ? gwei(b.baseFeeWei) : DASH}
                    </span>
                    <span className="ml-auto text-[color:var(--color-dim)]">
                      {compact(b.gasUsed)}
                    </span>
                  </div>
                ))}
        </div>
      </div>

      {/* footer readout */}
      <div className="grid grid-cols-3 divide-x divide-[color:var(--color-border)]">
        {[
          { l: "head", v: head ? num(head.number) : DASH },
          { l: "avg tx", v: avgTx != null ? avgTx.toFixed(1) : DASH },
          {
            l: "base fee",
            v: head?.baseFeeWei != null ? gwei(head.baseFeeWei) : DASH,
          },
        ].map((x) => (
          <div key={x.l} className="px-3 py-2.5">
            <div className="text-[9px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
              {x.l}
            </div>
            <div className="mt-0.5 truncate text-[13px] text-[color:var(--color-fg)]">
              {x.v}
            </div>
          </div>
        ))}
      </div>

      {/* corner ticks */}
      <span aria-hidden className="absolute -left-px -top-px h-2 w-2 border-l border-t border-[color:var(--color-accent)]" />
      <span aria-hidden className="absolute -right-px -top-px h-2 w-2 border-r border-t border-[color:var(--color-accent)]" />
      <span aria-hidden className="absolute -bottom-px -left-px h-2 w-2 border-b border-l border-[color:var(--color-accent)]" />
      <span aria-hidden className="absolute -bottom-px -right-px h-2 w-2 border-b border-r border-[color:var(--color-accent)]" />
    </div>
  );
}
