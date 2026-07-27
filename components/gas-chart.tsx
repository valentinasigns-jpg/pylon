"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePoll } from "@/lib/use-poll";
import { gwei, num, DASH } from "@/lib/format";
import { LivePill, SectionHead, Skeleton, FeedMeta } from "./primitives";

type Point = {
  block: number;
  baseFeeWei: number;
  gasUsed: number;
  txCount: number;
};
type Feed = { ok: boolean; points: Point[]; stride: number };

const W = 1000;
const H = 240;
const PAD = { t: 14, r: 10, b: 24, l: 10 };

export function GasChart() {
  const { data, live, loading, updatedAt, reason, source, fellBack, stale } =
    usePoll<Feed>("/api/gas", 10000);
  const target = useMemo(() => data?.points ?? [], [data]);

  // Values the line is currently drawn at. They ease toward `target`, so an
  // append reshapes the curve instead of snapping to a new one.
  const [shown, setShown] = useState<Point[]>([]);
  const shownRef = useRef<Point[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    if (target.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // First payload, a resize of the window, or reduced motion: adopt it.
    if (reduced || shownRef.current.length !== target.length) {
      shownRef.current = target;
      setShown(target);
      return;
    }

    cancelAnimationFrame(raf.current);
    const step = () => {
      let moved = false;
      const next = shownRef.current.map((p, i) => {
        const t = target[i];
        if (!t) return p;
        const d = t.baseFeeWei - p.baseFeeWei;
        if (Math.abs(d) < 1) {
          return t;
        }
        moved = true;
        return { ...t, baseFeeWei: p.baseFeeWei + d * 0.18 };
      });
      shownRef.current = next;
      setShown(next);
      if (moved) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);

  // --- brush zoom ---
  const [range, setRange] = useState<[number, number] | null>(null);
  const [drag, setDrag] = useState<[number, number] | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const view = useMemo(() => {
    if (!range) return shown;
    const [a, b] = range;
    return shown.slice(a, b + 1);
  }, [shown, range]);

  const geom = useMemo(() => {
    if (view.length < 2) return null;
    const fees = view.map((p) => p.baseFeeWei);
    const min = Math.min(...fees);
    const max = Math.max(...fees);
    const span = max - min || Math.max(1, max * 0.02);
    const lo = min - span * 0.25;
    const hi = max + span * 0.25;

    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;

    const x = (i: number) => PAD.l + (i / (view.length - 1)) * iw;
    const y = (v: number) => PAD.t + ih - ((v - lo) / (hi - lo)) * ih;

    const line = view
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(p.baseFeeWei).toFixed(2)}`)
      .join(" ");
    const area = `${line} L${x(view.length - 1).toFixed(2)},${(H - PAD.b).toFixed(
      2,
    )} L${x(0).toFixed(2)},${(H - PAD.b).toFixed(2)} Z`;

    return { min, max, x, y, line, area, iw, ih };
  }, [view]);

  /** Pointer x in SVG units → nearest sample index. */
  const idxAt = useCallback(
    (clientX: number): number | null => {
      const el = svgRef.current;
      if (!el || view.length < 2) return null;
      const r = el.getBoundingClientRect();
      const u = (clientX - r.left) / r.width;
      const sx = u * W;
      const i = Math.round(((sx - PAD.l) / (W - PAD.l - PAD.r)) * (view.length - 1));
      return Math.max(0, Math.min(view.length - 1, i));
    },
    [view.length],
  );

  const active = hover != null && view[hover] ? view[hover] : view[view.length - 1];

  function onDown(e: React.PointerEvent) {
    const i = idxAt(e.clientX);
    if (i === null) return;
    setDrag([i, i]);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    const i = idxAt(e.clientX);
    if (i === null) return;
    setHover(i);
    if (drag) setDrag([drag[0], i]);
  }
  function onUp() {
    if (drag) {
      const [a, b] = drag;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      // Ignore an accidental click; require a real span.
      if (hi - lo >= 3) {
        const base = range ? range[0] : 0;
        setRange([base + lo, base + hi]);
      }
      setDrag(null);
    }
  }

  const zoomed = range !== null;

  return (
    <section id="gas" className="scroll-mt-20">
      <SectionHead
        index="03"
        title="Base fee"
        sub={
          data?.stride
            ? `Last ${shown.length} samples, every ${data.stride}th block. Values in gwei.`
            : "Base fee per gas over recent blocks."
        }
        right={
          <span className="flex items-center gap-2">
            {zoomed && (
              <button
                type="button"
                onClick={() => setRange(null)}
                className="border border-[color:var(--color-border)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
              >
                reset zoom
              </button>
            )}
            <LivePill live={live} reason={reason} />
          </span>
        }
      />

      <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
        {/* readout */}
        <div className="grid grid-cols-2 gap-px border-b border-[color:var(--color-border)] bg-[color:var(--color-border)] sm:grid-cols-4">
          {[
            { l: "Current", v: active ? gwei(active.baseFeeWei) : DASH, accent: true },
            { l: "Low", v: geom ? gwei(geom.min) : DASH },
            { l: "High", v: geom ? gwei(geom.max) : DASH },
            { l: "At block", v: active ? num(active.block) : DASH },
          ].map((x) => (
            <div key={x.l} className="bg-[color:var(--color-surface)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                {x.l}
              </div>
              <div
                className={`mt-1 h-5 text-[15px] tabular-nums ${
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
        <div className="relative p-3 sm:p-4">
          {loading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : !geom ? (
            <div className="grid h-[240px] place-items-center text-[12px] text-[color:var(--color-dim)]">
              {DASH} not enough samples
            </div>
          ) : (
            <>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                className="block h-[240px] w-full cursor-crosshair touch-none"
                preserveAspectRatio="none"
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={() => {
                  setHover(null);
                  setDrag(null);
                }}
                role="img"
                aria-label="Base fee per gas over recent blocks"
              >
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

                {/* brush selection */}
                {drag && Math.abs(drag[1] - drag[0]) >= 1 && (
                  <rect
                    x={geom.x(Math.min(drag[0], drag[1]))}
                    y={PAD.t}
                    width={Math.abs(geom.x(drag[1]) - geom.x(drag[0]))}
                    height={geom.ih}
                    fill="rgba(0,255,156,0.10)"
                    stroke="rgba(0,255,156,0.45)"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                )}

                {/* crosshair */}
                {hover != null && view[hover] && !drag && (
                  <>
                    <line
                      x1={geom.x(hover)}
                      x2={geom.x(hover)}
                      y1={PAD.t}
                      y2={H - PAD.b}
                      stroke="#00FF9C"
                      strokeOpacity="0.45"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1={PAD.l}
                      x2={W - PAD.r}
                      y1={geom.y(view[hover].baseFeeWei)}
                      y2={geom.y(view[hover].baseFeeWei)}
                      stroke="#00FF9C"
                      strokeOpacity="0.20"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle
                      cx={geom.x(hover)}
                      cy={geom.y(view[hover].baseFeeWei)}
                      r="3"
                      fill="#00FF9C"
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                )}
              </svg>

              {/* tooltip, positioned in DOM so the text never stretches with
                  the non-uniform viewBox */}
              {hover != null && view[hover] && !drag && (
                <div
                  className="pointer-events-none absolute top-6 z-10 border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2.5 py-2"
                  style={{
                    left: `calc(${((geom.x(hover) / W) * 100).toFixed(3)}% ${
                      hover / Math.max(1, view.length - 1) > 0.75
                        ? "- 148px"
                        : "+ 14px"
                    })`,
                  }}
                >
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                    block
                  </div>
                  <div className="text-[13px] tabular-nums text-[color:var(--color-fg)]">
                    {num(view[hover].block)}
                  </div>
                  <div className="mt-1.5 text-[9px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                    base fee
                  </div>
                  <div className="text-[13px] tabular-nums text-[color:var(--color-accent)]">
                    {gwei(view[hover].baseFeeWei)} gwei
                  </div>
                  <div className="mt-1.5 text-[9px] tabular-nums text-[color:var(--color-dim)]">
                    {num(view[hover].txCount)} tx · {num(view[hover].gasUsed)} gas
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--color-border)] px-4 py-2.5">
          <span className="text-[11px] tabular-nums text-[color:var(--color-dim)]">
            {view.length > 0
              ? `blocks ${num(view[0].block)} → ${num(view[view.length - 1].block)}`
              : DASH}
          </span>
          <span className="text-[11px] text-[color:var(--color-dim)]">
            {zoomed ? "showing selection" : "drag to zoom · hover to inspect"}
          </span>
        </div>
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
