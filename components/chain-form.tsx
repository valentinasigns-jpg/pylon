"use client";

import { useEffect, useRef } from "react";
import { usePoll } from "@/lib/use-poll";

type ChainFeed = {
  ok: boolean;
  height: number | null;
  baseFeeWei: number | null;
  txInLatest: number | null;
};

// Mesh resolution. Kept low on purpose — this should read as an instrument
// plot, not a solid object.
const LAT = 17; // rings from pole to pole
const LON = 30; // meridians around
const FOV = 3.2;
const BUCKETS = 9; // depth buckets, so a frame is 9 strokes and not ~2000

type Pulse = { born: number; from: number };

/**
 * A wireframe sphere that never holds still: several harmonics push its
 * radius around, it turns on two axes, and it leans toward the pointer.
 *
 * It is also an instrument. Base fee sets how hard the harmonics push, the
 * transaction count in the latest block sets the mesh brightness, and every
 * new block sends a ripple from the pole down through the surface.
 */
export function ChainForm({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { data } = usePoll<ChainFeed>("/api/chain");

  // Feed the latest reading to the animation loop without restarting it.
  const feed = useRef({ height: 0, amp: 0.5, bright: 0.5 });
  const pulses = useRef<Pulse[]>([]);

  useEffect(() => {
    const h = data?.height ?? 0;
    const prev = feed.current.height;
    if (h && prev && h > prev) {
      pulses.current.push({ born: performance.now(), from: 0 });
      if (pulses.current.length > 4) pulses.current.shift();
    }
    // Base fee on this chain sits around 0.035-0.040 gwei. Map that band to
    // a usable 0..1 rather than pretending the full gwei range is in play.
    const fee = data?.baseFeeWei ?? null;
    const amp = fee == null ? 0.5 : Math.max(0, Math.min(1, (fee - 3.2e7) / 1.4e7));
    const tx = data?.txInLatest ?? null;
    const bright = tx == null ? 0.5 : Math.max(0, Math.min(1, tx / 26));
    feed.current = { height: h, amp, bright };
  }, [data]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;
    let t0 = performance.now();

    // pointer lean, eased
    let leanX = 0;
    let leanY = 0;
    let targetLeanX = 0;
    let targetLeanY = 0;

    // smoothed data so changes glide instead of jumping
    let amp = 0.5;
    let bright = 0.5;

    function resize() {
      if (!canvas || !ctx) return false;
      const r = canvas.getBoundingClientRect();
      const nw = Math.round(r.width);
      const nh = Math.round(r.height);
      if (nw === 0 || nh === 0) return false;
      if (nw === w && nh === h) return true;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = nw;
      h = nh;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    /** Radial displacement at a surface coordinate. */
    function radius(theta: number, phi: number, t: number, a: number, now: number) {
      let r =
        1 +
        a * 0.17 * Math.sin(3 * phi + 1.05 * t) * Math.sin(2 * theta) +
        a * 0.13 * Math.sin(2 * theta + 0.82 * t + 1.7) +
        a * 0.09 * Math.sin(5 * phi - 0.66 * t) * Math.cos(3 * theta) +
        0.05 * Math.sin(1.4 * t + theta * 2);

      // ripples travelling from the north pole toward the south
      for (const p of pulses.current) {
        const age = (now - p.born) / 1500;
        if (age > 1) continue;
        const front = age * Math.PI * 1.25;
        const d = theta - front;
        if (Math.abs(d) < 0.55) {
          const shape = Math.cos((d / 0.55) * (Math.PI / 2));
          r += 0.16 * shape * shape * (1 - age);
        }
      }
      return r;
    }

    function frame(now: number) {
      if (!ctx) return;
      if (!resize()) {
        if (running) raf = requestAnimationFrame(frame);
        return;
      }

      const t = reduced ? 6.2 : (now - t0) / 1000;

      // ease data + pointer
      amp += (feed.current.amp - amp) * 0.04;
      bright += (feed.current.bright - bright) * 0.04;
      leanX += (targetLeanX - leanX) * 0.05;
      leanY += (targetLeanY - leanY) * 0.05;

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) * 0.34;

      const ry = reduced ? 0.6 : t * 0.22 + leanX;
      const rx = (reduced ? -0.25 : Math.sin(t * 0.16) * 0.34) + leanY;

      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);

      // --- build the projected mesh once ---
      const P: Array<Array<{ x: number; y: number; z: number }>> = [];
      for (let i = 0; i < LAT; i++) {
        const theta = (i / (LAT - 1)) * Math.PI;
        const row: Array<{ x: number; y: number; z: number }> = [];
        for (let j = 0; j < LON; j++) {
          const phi = (j / LON) * Math.PI * 2;
          const r = radius(theta, phi, t, 0.55 + amp * 0.75, now);

          const sx = Math.sin(theta) * Math.cos(phi) * r;
          const sy = Math.cos(theta) * r;
          const sz = Math.sin(theta) * Math.sin(phi) * r;

          // rotate Y then X
          const x1 = sx * cosY + sz * sinY;
          const z1 = -sx * sinY + sz * cosY;
          const y2 = sy * cosX - z1 * sinX;
          const z2 = sy * sinX + z1 * cosX;

          const f = FOV / (FOV + z2);
          row.push({ x: cx + x1 * f * scale, y: cy + y2 * f * scale, z: z2 });
        }
        P.push(row);
      }

      // --- bucket every segment by depth, then stroke once per bucket ---
      const paths: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D());
      const bucketOf = (z: number) => {
        const u = Math.max(0, Math.min(1, (z + 1.35) / 2.7)); // 0 far … 1 near
        return Math.min(BUCKETS - 1, Math.floor(u * BUCKETS));
      };

      // rings
      for (let i = 0; i < LAT; i++) {
        for (let j = 0; j < LON; j++) {
          const a = P[i][j];
          const b = P[i][(j + 1) % LON];
          const p = paths[bucketOf((a.z + b.z) / 2)];
          p.moveTo(a.x, a.y);
          p.lineTo(b.x, b.y);
        }
      }
      // meridians
      for (let j = 0; j < LON; j++) {
        for (let i = 0; i < LAT - 1; i++) {
          const a = P[i][j];
          const b = P[i + 1][j];
          const p = paths[bucketOf((a.z + b.z) / 2)];
          p.moveTo(a.x, a.y);
          p.lineTo(b.x, b.y);
        }
      }

      for (let k = 0; k < BUCKETS; k++) {
        const u = k / (BUCKETS - 1); // 0 far … 1 near
        const alpha = (0.045 + u * u * 0.52) * (0.62 + bright * 0.55);
        ctx.strokeStyle = `rgba(0,255,156,${alpha.toFixed(4)})`;
        ctx.lineWidth = 0.6 + u * 0.7;
        ctx.stroke(paths[k]);
      }

      // --- vertex dots on the near face only ---
      ctx.fillStyle = `rgba(0,255,156,${(0.30 + bright * 0.28).toFixed(3)})`;
      for (let i = 0; i < LAT; i += 2) {
        for (let j = 0; j < LON; j += 3) {
          const p = P[i][j];
          if (p.z < 0.75) continue;
          ctx.fillRect(p.x - 0.9, p.y - 0.9, 1.8, 1.8);
        }
      }

      // --- core glow ---
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 1.5);
      g.addColorStop(0, `rgba(0,255,156,${(0.05 + bright * 0.05).toFixed(3)})`);
      g.addColorStop(0.55, "rgba(0,255,156,0.014)");
      g.addColorStop(1, "rgba(0,255,156,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // drop ripples that have finished
      if (pulses.current.length) {
        pulses.current = pulses.current.filter((p) => now - p.born < 1500);
      }

      if (running) raf = requestAnimationFrame(frame);
    }

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      // lean is relative to the canvas centre, clamped so it never spins away
      targetLeanX = ((e.clientX - (r.left + r.width / 2)) / r.width) * 0.9;
      targetLeanY = ((e.clientY - (r.top + r.height / 2)) / r.height) * 0.55;
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        t0 = performance.now() - 6200;
        raf = requestAnimationFrame(frame);
      }
    }

    frame(performance.now());

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`block h-full w-full ${className}`}
    />
  );
}
