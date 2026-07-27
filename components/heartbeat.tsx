"use client";

import { useEffect, useRef, useState } from "react";
import { usePoll } from "@/lib/use-poll";

type ChainFeed = { ok: boolean; height: number | null };

/**
 * A hairline at the very top of the viewport that fills between block
 * arrivals and resets when one lands.
 *
 * The interval it fills against is measured from the gaps between arrivals
 * this page has actually observed — it is not a fixed timer, so it tracks
 * the chain's real cadence and drifts when the chain does.
 */
export function Heartbeat() {
  const { data, live } = usePoll<ChainFeed>("/api/chain");
  const [progress, setProgress] = useState(0);

  const lastAt = useRef<number | null>(null);
  const lastHeight = useRef<number | null>(null);
  const gaps = useRef<number[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    const h = data?.height ?? null;
    if (h === null) return;
    if (lastHeight.current === null) {
      lastHeight.current = h;
      lastAt.current = performance.now();
      return;
    }
    if (h === lastHeight.current) return;

    const now = performance.now();
    if (lastAt.current !== null) {
      const gap = now - lastAt.current;
      // Ignore absurd gaps from a backgrounded tab.
      if (gap > 200 && gap < 60000) {
        gaps.current.push(gap);
        if (gaps.current.length > 8) gaps.current.shift();
      }
    }
    lastHeight.current = h;
    lastAt.current = now;
  }, [data]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const step = () => {
      const at = lastAt.current;
      if (at !== null && gaps.current.length > 0) {
        const avg =
          gaps.current.reduce((s, g) => s + g, 0) / gaps.current.length;
        const p = Math.min(1, (performance.now() - at) / avg);
        setProgress(p);
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]"
    >
      <div
        className="heartbeat h-full bg-[color:var(--color-accent)]"
        style={{
          transform: `scaleX(${live ? progress : 0})`,
          opacity: live ? 0.55 : 0,
        }}
      />
    </div>
  );
}
