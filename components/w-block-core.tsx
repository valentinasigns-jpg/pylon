"use client";

import { useEffect, useRef, useState } from "react";
import { usePoll } from "@/lib/use-poll";
import { num, compact, DASH } from "@/lib/format";
import { WidgetFrame } from "./widget-frame";

type Block = {
  number: number;
  txCount: number;
  gasUsed: number;
  baseFeeWei: number | null;
};
type Feed = { ok: boolean; blocks: Block[] };

const ROWS = 14;

/**
 * A drill-core readout: one horizontal bar per block, newest at the top,
 * older ones pushed down and dimmed. Bar length is the transaction count.
 */
export function WBlockCore() {
  const { data, live } = usePoll<Feed>("/api/blocks", 5000);
  const [stack, setStack] = useState<Block[]>([]);
  const seen = useRef<Set<number>>(new Set());

  useEffect(() => {
    const incoming = data?.blocks ?? [];
    const add = incoming.filter((b) => !seen.current.has(b.number));
    if (add.length === 0) return;
    for (const b of add) seen.current.add(b.number);
    if (seen.current.size > 500) {
      seen.current = new Set(incoming.map((b) => b.number));
    }
    setStack((prev) =>
      [...add, ...prev].sort((a, b) => b.number - a.number).slice(0, ROWS),
    );
  }, [data]);

  const maxTx = Math.max(6, ...stack.map((b) => b.txCount));
  const totalTx = stack.reduce((s, b) => s + b.txCount, 0);

  return (
    <WidgetFrame title="block core" status="sealing" live={live}>
      <div className="px-3 py-3">
        {stack.length === 0 ? (
          <div className="space-y-[5px]">
            {Array.from({ length: ROWS }).map((_, i) => (
              <div key={i} className="skeleton h-[14px] w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-[5px]">
            {stack.map((b, i) => {
              const pct = (b.txCount / maxTx) * 100;
              const dim = 1 - (i / ROWS) * 0.72;
              return (
                <div
                  key={b.number}
                  className={`flex items-center gap-2 ${i === 0 ? "slide-in" : ""}`}
                  style={{ opacity: dim }}
                >
                  <span className="w-[68px] shrink-0 text-right text-[10px] text-[color:var(--color-dim)]">
                    {num(b.number).slice(-7)}
                  </span>
                  <div className="relative h-[13px] flex-1 bg-[color:var(--color-bg)]">
                    <div
                      className="absolute inset-y-0 left-0 transition-[width] duration-300 ease-out"
                      style={{
                        width: `${pct}%`,
                        background:
                          i === 0
                            ? "var(--color-accent)"
                            : "color-mix(in srgb, var(--color-accent) 45%, transparent)",
                      }}
                    />
                    {/* tick marks */}
                    <div className="pointer-events-none absolute inset-0 flex">
                      {Array.from({ length: 8 }).map((_, k) => (
                        <div
                          key={k}
                          className="flex-1 border-r border-[color:var(--color-surface)] last:border-r-0"
                        />
                      ))}
                    </div>
                  </div>
                  <span className="w-[26px] shrink-0 text-[10px] text-[color:var(--color-fg)]">
                    {String(b.txCount).padStart(2, "0")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 divide-x divide-[color:var(--color-border)] border-t border-[color:var(--color-border)]">
        {[
          { l: "depth", v: stack.length ? `${stack.length} blk` : DASH },
          { l: "tx in core", v: stack.length ? num(totalTx) : DASH },
          {
            l: "gas, head",
            v: stack[0] ? compact(stack[0].gasUsed) : DASH,
          },
        ].map((x) => (
          <div key={x.l} className="px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
              {x.l}
            </div>
            <div className="mt-0.5 truncate text-[12px] text-[color:var(--color-fg)]">
              {x.v}
            </div>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}
