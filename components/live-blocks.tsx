"use client";

import { useEffect, useRef, useState } from "react";
import { usePoll } from "@/lib/use-poll";
import { num, gwei, age, truncMid, DASH } from "@/lib/format";
import { BLOCKSCOUT } from "@/lib/config";
import { LivePill, SectionHead, Skeleton } from "./primitives";

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

export function LiveBlocks({ limit = 15 }: { limit?: number }) {
  const { data, live, loading } = usePoll<Feed>("/api/blocks");
  const [now, setNow] = useState(() => Date.now());
  const seen = useRef<Set<number>>(new Set());

  // Re-render ages once a second without refetching.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const blocks = (data?.blocks ?? []).slice(0, limit);

  // Track which block numbers are new so only they animate.
  const fresh = new Set<number>();
  for (const b of blocks) {
    if (!seen.current.has(b.number)) fresh.add(b.number);
  }
  useEffect(() => {
    for (const b of blocks) seen.current.add(b.number);
    // keep the set from growing forever
    if (seen.current.size > 400) {
      seen.current = new Set(blocks.map((b) => b.number));
    }
  });

  return (
    <section id="blocks" className="scroll-mt-20">
      <SectionHead
        index="02"
        title="Live blocks"
        sub={`Newest first, capped at ${limit}. Polled from eth_getBlockByNumber.`}
        right={<LivePill live={live} />}
      />

      {/* desktop table */}
      <div className="hidden border border-[color:var(--color-border)] md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
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

            {blocks.map((b) => (
              <tr
                key={b.number}
                className={`border-b border-[color:var(--color-border)] last:border-b-0 hover:bg-[color:var(--color-surface)] ${
                  fresh.has(b.number) ? "slide-in" : ""
                }`}
              >
                <td className="px-4 py-3 text-left">
                  <a
                    href={`${BLOCKSCOUT}/block/${b.number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-[color:var(--color-accent)] hover:underline"
                  >
                    {num(b.number)}
                  </a>
                  <div className="text-[10px] text-[color:var(--color-dim)]">
                    {truncMid(b.hash, 10, 6)}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-[13px] text-[color:var(--color-fg)]">
                  {num(b.txCount)}
                </td>
                <td className="px-4 py-3 text-right text-[13px] text-[color:var(--color-fg)]">
                  {num(b.gasUsed)}
                </td>
                <td className="px-4 py-3 text-right text-[13px] text-[color:var(--color-fg)]">
                  {b.baseFeeWei != null ? `${gwei(b.baseFeeWei)}` : DASH}
                </td>
                <td className="px-4 py-3 text-right text-[13px] text-[color:var(--color-dim)]">
                  {age(b.timestamp, now)}
                </td>
              </tr>
            ))}
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

        {blocks.map((b) => (
          <div
            key={b.number}
            className={`bg-[color:var(--color-surface)] p-3 ${
              fresh.has(b.number) ? "slide-in" : ""
            }`}
          >
            <div className="flex items-baseline justify-between">
              <a
                href={`${BLOCKSCOUT}/block/${b.number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] text-[color:var(--color-accent)]"
              >
                {num(b.number)}
              </a>
              <span className="text-[11px] text-[color:var(--color-dim)]">
                {age(b.timestamp, now)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <div className="text-[color:var(--color-dim)]">txns</div>
                <div className="text-[color:var(--color-fg)]">{num(b.txCount)}</div>
              </div>
              <div>
                <div className="text-[color:var(--color-dim)]">gas used</div>
                <div className="text-[color:var(--color-fg)]">{num(b.gasUsed)}</div>
              </div>
              <div>
                <div className="text-[color:var(--color-dim)]">base fee</div>
                <div className="text-[color:var(--color-fg)]">
                  {b.baseFeeWei != null ? gwei(b.baseFeeWei) : DASH}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
