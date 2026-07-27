"use client";

import { useMemo, useState } from "react";
import { usePoll } from "@/lib/use-poll";
import { gwei, num, DASH } from "@/lib/format";
import { LivePill, SectionHead, Skeleton } from "./primitives";

type Point = {
  block: number;
  baseFeeWei: number;
  gasUsed: number;
  txCount: number;
};
type Feed = { ok: boolean; points: Point[]; stride: number };

const W = 1000;
const H = 220;
const PAD = { t: 12, r: 8, b: 20, l: 8 };

export function GasChart() {
  const { data, live, loading } = usePoll<Feed>("/api/gas", 10000);
  const [hover, setHover] = useState<number | null>(null);

  const pts = data?.points ?? [];

  const geom = useMemo(() => {
    if (pts.length < 2) return null;
    const fees = pts.map((p) => p.baseFeeWei);
    const min = Math.min(...fees);
    const max = Math.max(...fees);
    // Pad the domain so a flat-ish series still reads as a line, not a wall.
    const span = max - min || Math.max(1, max * 0.02);
    const lo = min - span * 0.25;
    const hi = max + span * 0.25;

    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;

    const x = (i: number) => PAD.l + (i / (pts.length - 1)) * iw;
    const y = (v: number) => PAD.t + ih - ((v - lo) / (hi - lo)) * ih;

    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(p.baseFeeWei).toFixed(2)}`).join(" ");
    const area = `${line} L${x(pts.length - 1).toFixed(2)},${(H - PAD.b).toFixed(2)} L${x(0).toFixed(2)},${(H - PAD.b).toFixed(2)} Z`;

    return { min, max, lo, hi, x, y, line, area, iw, ih };
  }, [pts]);

  const active = hover != null && pts[hover] ? pts[hover] : pts[pts.length - 1];

  return (
    <section id="gas" className="scroll-mt-20">
      <SectionHead
        index="03"
        title="Base fee"
        sub={
          data?.stride
            ? `Last ${pts.length} samples, every ${data.stride}th block. Values in gwei.`
            : "Base fee per gas over recent blocks."
        }
        right={<LivePill live={live} />}
      />

      <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
        {/* readout row */}
        <div className="grid grid-cols-2 gap-px border-b border-[color:var(--color-border)] bg-[color:var(--color-border)] sm:grid-cols-4">
          {[
            { l: "Current", v: active ? `${gwei(active.baseFeeWei)}` : DASH, accent: true },
            { l: "Low", v: geom ? `${gwei(geom.min)}` : DASH },
            { l: "High", v: geom ? `${gwei(geom.max)}` : DASH },
            { l: "At block", v: active ? num(active.block) : DASH },
          ].map((x) => (
            <div key={x.l} className="bg-[color:var(--color-surface)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                {x.l}
              </div>
              <div
                className={`mt-1 h-5 text-[15px] ${
                  x.accent
                    ? "text-[color:var(--color-accent)]"
                    : "text-[color:var(--color-fg)]"
                }`}
              >
                {loading ? <Skeleton className="h-4 w-16" /> : x.v}
              </div>
            </div>
          ))}
        </div>

        {/* chart */}
        <div className="p-3 sm:p-4">
          {loading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : !geom ? (
            <div className="grid h-[220px] place-items-center text-[12px] text-[color:var(--color-dim)]">
              {DASH} not enough samples
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-[220px] w-full"
              preserveAspectRatio="none"
              onMouseLeave={() => setHover(null)}
              role="img"
              aria-label="Base fee per gas over recent blocks"
            >
              {/* horizontal guides */}
              {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                const yy = PAD.t + geom.ih * f;
                return (
                  <line
                    key={f}
                    x1={PAD.l}
                    x2={W - PAD.r}
                    y1={yy}
                    y2={yy}
                    stroke="#1F1F1F"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              <defs>
                <linearGradient id="gasfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00FF9C" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#00FF9C" stopOpacity="0" />
                </linearGradient>
              </defs>

              <path d={geom.area} fill="url(#gasfill)" />
              <path
                d={geom.line}
                fill="none"
                stroke="#00FF9C"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
              />

              {/* hover hit-areas + marker */}
              {pts.map((p, i) => (
                <rect
                  key={p.block}
                  x={geom.x(i) - geom.iw / pts.length / 2}
                  y={0}
                  width={geom.iw / pts.length}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
              ))}
              {hover != null && pts[hover] && (
                <>
                  <line
                    x1={geom.x(hover)}
                    x2={geom.x(hover)}
                    y1={PAD.t}
                    y2={H - PAD.b}
                    stroke="#00FF9C"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={geom.x(hover)}
                    cy={geom.y(pts[hover].baseFeeWei)}
                    r="3"
                    fill="#00FF9C"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}
            </svg>
          )}
        </div>

        {/* footnote */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--color-border)] px-4 py-2.5">
          <span className="text-[11px] text-[color:var(--color-dim)]">
            {pts.length > 0
              ? `blocks ${num(pts[0].block)} → ${num(pts[pts.length - 1].block)}`
              : DASH}
          </span>
          <span className="text-[11px] text-[color:var(--color-dim)]">
            hover to inspect
          </span>
        </div>
      </div>
    </section>
  );
}
