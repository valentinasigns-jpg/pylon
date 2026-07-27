"use client";

import { useEffect, useRef } from "react";
import { usePoll } from "@/lib/use-poll";
import { gwei, num, DASH } from "@/lib/format";
import { WidgetFrame } from "./widget-frame";

type Point = { block: number; baseFeeWei: number };
type Feed = { ok: boolean; points: Point[] };

/**
 * Oscilloscope-style trace of base fee, with a sweeping playhead that
 * paints the line left to right on a loop the way a real scope does.
 */
export function WGasScope() {
  const { data, live } = usePoll<Feed>("/api/gas", 10000);
  const ref = useRef<HTMLCanvasElement | null>(null);
  const pointsRef = useRef<Point[]>([]);

  pointsRef.current = data?.points ?? [];

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let sweep = 0;

    function resize() {
      if (!canvas || !ctx) return;
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      // graticule
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 5; i++) {
        const y = (h / 5) * i;
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
      }
      for (let i = 1; i < 8; i++) {
        const x = (w / 8) * i;
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
      }
      ctx.stroke();

      const pts = pointsRef.current;
      if (pts.length > 1) {
        const fees = pts.map((p) => p.baseFeeWei);
        const min = Math.min(...fees);
        const max = Math.max(...fees);
        const span = max - min || Math.max(1, max * 0.02);
        const lo = min - span * 0.35;
        const hi = max + span * 0.35;
        const pad = 6;

        const X = (i: number) => (i / (pts.length - 1)) * w;
        const Y = (v: number) =>
          pad + (h - pad * 2) - ((v - lo) / (hi - lo)) * (h - pad * 2);

        // how much of the trace the sweep has revealed
        const cut = reduced ? pts.length - 1 : Math.floor(sweep * (pts.length - 1));

        // trailing (already-swept) portion
        ctx.beginPath();
        for (let i = 0; i <= cut; i++) {
          const x = X(i);
          const y = Y(pts[i].baseFeeWei);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(0,255,156,0.85)";
        ctx.lineWidth = 1.4;
        ctx.lineJoin = "round";
        ctx.stroke();

        // glow under the swept part
        if (cut > 0) {
          ctx.lineTo(X(cut), h);
          ctx.lineTo(X(0), h);
          ctx.closePath();
          const g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, "rgba(0,255,156,0.16)");
          g.addColorStop(1, "rgba(0,255,156,0)");
          ctx.fillStyle = g;
          ctx.fill();
        }

        // ghost of the full trace ahead of the sweep
        ctx.beginPath();
        for (let i = cut; i < pts.length; i++) {
          const x = X(i);
          const y = Y(pts[i].baseFeeWei);
          if (i === cut) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(0,255,156,0.16)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // playhead
        if (!reduced && cut > 0 && cut < pts.length) {
          const hx = X(cut);
          const hy = Y(pts[cut].baseFeeWei);
          ctx.strokeStyle = "rgba(0,255,156,0.32)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(hx + 0.5, 0);
          ctx.lineTo(hx + 0.5, h);
          ctx.stroke();

          ctx.fillStyle = "#00FF9C";
          ctx.beginPath();
          ctx.arc(hx, hy, 2.6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "rgba(0,255,156,0.22)";
          ctx.beginPath();
          ctx.arc(hx, hy, 6.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!reduced) {
        sweep += 0.0035;
        if (sweep > 1) sweep = 0;
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const pts = data?.points ?? [];
  const cur = pts.length ? pts[pts.length - 1] : null;
  const fees = pts.map((p) => p.baseFeeWei);

  return (
    <WidgetFrame title="base fee scope" status="tracing" live={live}>
      <div className="px-3 pb-2 pt-3">
        <canvas ref={ref} className="block h-[184px] w-full" aria-hidden />
      </div>
      <div className="grid grid-cols-3 divide-x divide-[color:var(--color-border)] border-t border-[color:var(--color-border)]">
        {[
          { l: "current", v: cur ? gwei(cur.baseFeeWei) : DASH, accent: true },
          { l: "low", v: fees.length ? gwei(Math.min(...fees)) : DASH },
          { l: "high", v: fees.length ? gwei(Math.max(...fees)) : DASH },
        ].map((x) => (
          <div key={x.l} className="px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
              {x.l}
            </div>
            <div
              className={`mt-0.5 truncate text-[12px] ${
                x.accent
                  ? "text-[color:var(--color-accent)]"
                  : "text-[color:var(--color-fg)]"
              }`}
            >
              {x.v}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-[color:var(--color-border)] px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
        {pts.length
          ? `${pts.length} samples · block ${num(pts[0].block)} → ${num(pts[pts.length - 1].block)}`
          : DASH}
      </div>
    </WidgetFrame>
  );
}
