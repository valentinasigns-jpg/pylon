"use client";

import { useEffect, useRef, useState } from "react";
import { usePoll } from "@/lib/use-poll";
import { num, gwei, age, truncMid, DASH } from "@/lib/format";
import { BLOCKSCOUT } from "@/lib/config";
import { LivePill, SectionHead, Skeleton, FeedMeta } from "./primitives";

type Block = {
  number: number;
  hash: string;
  timestamp: number;
  txCount: number;
  gasUsed: number;
  gasLimit: number;
  baseFeeWei: number | null;
};

type Feed = { ok: boolean; blocks: Block[] };

/** How long a row keeps its "just arrived" rail. */
const FRESH_MS = 800;

export function LiveBlocks({ limit = 15 }: { limit?: number }) {
  const { data, live, loading, updatedAt, reason, source, fellBack, stale } =
    usePoll<Feed>("/api/blocks");
  const [now, setNow] = useState(() => Date.now());
  const [freshUntil, setFreshUntil] = useState<Map<number, number>>(new Map());
  const [ping, setPing] = useState(0);
  const seen = useRef<Set<number>>(new Set());

  // Ages tick every second without refetching.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const blocks = (data?.blocks ?? []).slice(0, limit);

  // Mark genuinely new rows and fire the header ping on real arrivals.
  useEffect(() => {
    if (blocks.length === 0) return;
    const arrived = blocks.filter((b) => !seen.current.has(b.number));
    if (arrived.length === 0) return;

    const first = seen.current.size === 0;
    for (const b of blocks) seen.current.add(b.number);
    if (seen.current.size > 400) {
      seen.current = new Set(blocks.map((b) => b.number));
    }
    // Don't animate the initial paint — only later arrivals.
    if (first) return;

    const until = Date.now() + FRESH_MS;
    setFreshUntil((prev) => {
      const next = new Map(prev);
      for (const b of arrived) next.set(b.number, until);
      return next;
    });
    setPing((n) => n + 1);

    const t = setTimeout(() => {
      setFreshUntil((prev) => {
        const next = new Map(prev);
        for (const b of arrived) next.delete(b.number);
        return next;
      });
    }, FRESH_MS);
    return () => clearTimeout(t);
  }, [blocks]);

  const isFresh = (n: number) => (freshUntil.get(n) ?? 0) > now - FRESH_MS;

  return (
    <section id="blocks" className="scroll-mt-20">
      <SectionHead
        index="02"
        title="Live blocks"
        sub={`Newest first, capped at ${limit}. Polled from eth_getBlockByNumber.`}
        right={
          <span className="flex items-center gap-2">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-[color:var(--color-accent)]" />
              {/* keyed on the arrival counter, so it fires per real block */}
              <span
                key={ping}
                className={`absolute inset-0 ${ping > 0 ? "arrive-ping" : ""}`}
              />
            </span>
            <LivePill live={live} reason={reason} />
          </span>
        }
      />

      {/* desktop table */}
      <div className="hidden border border-[color:var(--color-border)] bg-[color:var(--color-surface)] md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)]">
              {["Block", "Txns", "Gas used", "Base fee", "Age"].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-2.5 text-[11px] font-normal uppercase tracking-[0.14em] text-[color:var(--color-dim)] ${
                    i === 0 ? "text-left" : "text-right"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[color:var(--color-border)]">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className={`h-3.5 ${j === 0 ? "w-24" : "ml-auto w-16"}`} />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && blocks.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[12px] text-[color:var(--color-dim)]"
                >
                  {DASH} no blocks returned
                </td>
              </tr>
            )}

            {blocks.map((b) => {
              const fresh = isFresh(b.number);
              return (
                <tr
                  key={b.number}
                  className={`row-settle relative border-b border-[color:var(--color-border)] last:border-b-0 hover:bg-[color:var(--color-raised)] ${
                    fresh ? "slide-in rail-new" : ""
                  }`}
                >
                  <td className="relative px-4 py-3 text-left">
                    <a
                      href={`${BLOCKSCOUT}/block/${b.number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-block-row
                      className="text-[13px] tabular-nums text-[color:var(--color-accent)] hover:underline"
                    >
                      {num(b.number)}
                    </a>
                    <div className="text-[10px] text-[color:var(--color-dim)]">
                      {truncMid(b.hash, 10, 6)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-[color:var(--color-fg)]">
                    {num(b.txCount)}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-[color:var(--color-fg)]">
                    {num(b.gasUsed)}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-[color:var(--color-fg)]">
                    {b.baseFeeWei != null ? `${gwei(b.baseFeeWei)}` : DASH}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums text-[color:var(--color-dim)]">
                    {age(b.timestamp, now)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* mobile cards */}
      <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:hidden">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[color:var(--color-surface)] p-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))}

        {!loading && blocks.length === 0 && (
          <div className="bg-[color:var(--color-surface)] p-6 text-center text-[12px] text-[color:var(--color-dim)]">
            {DASH} no blocks returned
          </div>
        )}

        {blocks.map((b) => {
          const fresh = isFresh(b.number);
          return (
            <div
              key={b.number}
              className={`row-settle relative bg-[color:var(--color-surface)] p-3 ${
                fresh ? "slide-in rail-new" : ""
              }`}
            >
              <div className="flex items-baseline justify-between">
                <a
                  href={`${BLOCKSCOUT}/block/${b.number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] tabular-nums text-[color:var(--color-accent)]"
                >
                  {num(b.number)}
                </a>
                <span className="text-[11px] tabular-nums text-[color:var(--color-dim)]">
                  {age(b.timestamp, now)}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <div className="text-[color:var(--color-dim)]">txns</div>
                  <div className="tabular-nums text-[color:var(--color-fg)]">
                    {num(b.txCount)}
                  </div>
                </div>
                <div>
                  <div className="text-[color:var(--color-dim)]">gas used</div>
                  <div className="tabular-nums text-[color:var(--color-fg)]">
                    {num(b.gasUsed)}
                  </div>
                </div>
                <div>
                  <div className="text-[color:var(--color-dim)]">base fee</div>
                  <div className="tabular-nums text-[color:var(--color-fg)]">
                    {b.baseFeeWei != null ? gwei(b.baseFeeWei) : DASH}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <FeedMeta
        updatedAt={updatedAt}
        source={source}
        fellBack={fellBack}
        stale={stale}
        className="mt-3"
      />
    </section>
  );
}
