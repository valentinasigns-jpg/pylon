"use client";

import { useEffect, useRef } from "react";
import { usePoll } from "@/lib/use-poll";

type ChainFeed = { ok: boolean; height: number | null; baseFeeWei: number | null };

const NODES = 72;
const STIFFNESS = 0.34;
const DAMPING = 0.985;

/**
 * A string under tension, pinned at both ends.
 *
 * It carries no reading — it is here because the panel would otherwise end
 * in dead space. What it does do is react: every block that lands plucks it,
 * the wave travels out and damps, and the pointer drags it as it passes.
 * Base fee sets how hard a block plucks, so a busier chain leaves it more
 * unsettled.
 */
export function Oscillator({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { data } = usePoll<ChainFeed>("/api/chain");

  const lastHeight = useRef<number | null>(null);
  const pluck = useRef<number[]>([]);
  const strength = useRef(0.5);

  useEffect(() => {
    const h = data?.height ?? null;
    const fee = data?.baseFeeWei ?? null;
    if (fee != null) {
      strength.current = Math.max(0, Math.min(1, (fee - 3.2e7) / 1.4e7));
    }
    if (h == null) return;
    if (lastHeight.current === null) {
      lastHeight.current = h;
      return;
    }
    if (h > lastHeight.current) {
      lastHeight.current = h;
      // Pluck somewhere in the middle two thirds — the pinned ends barely
      // move, so an impulse there would be swallowed.
      pluck.current.push(0.18 + Math.random() * 0.64);
    }
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

    const y = new Float32Array(NODES);
    const v = new Float32Array(NODES);

    let pointerX = -1;
    let pointerY = -1;
    let pointerIn = false;

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

    function frame() {
      if (!ctx) return;
      if (!resize()) {
        if (running) raf = requestAnimationFrame(frame);
        return;
      }

      const mid = h / 2;
      const amp = h * 0.34;

      // consume any plucks queued since the last frame
      while (pluck.current.length) {
        const at = pluck.current.shift()!;
        const i = Math.round(at * (NODES - 1));
        const power = 0.55 + strength.current * 0.9;
        v[i] -= power;
        if (i > 0) v[i - 1] -= power * 0.45;
        if (i < NODES - 1) v[i + 1] -= power * 0.45;
      }

      if (!reduced) {
        // pointer drags the nearest node
        if (pointerIn && pointerX >= 0) {
          const i = Math.round((pointerX / w) * (NODES - 1));
          if (i > 0 && i < NODES - 1) {
            const want = (pointerY - mid) / amp;
            v[i] += (want - y[i]) * 0.22;
          }
        }

        // spring coupling, ends pinned
        for (let i = 1; i < NODES - 1; i++) {
          const a = (y[i - 1] + y[i + 1] - 2 * y[i]) * STIFFNESS;
          v[i] = (v[i] + a) * DAMPING;
        }
        for (let i = 1; i < NODES - 1; i++) y[i] += v[i] * 0.05;
        y[0] = 0;
        y[NODES - 1] = 0;
      }

      ctx.clearRect(0, 0, w, h);

      // rest line
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid + 0.5);
      ctx.lineTo(w, mid + 0.5);
      ctx.stroke();

      const px = (i: number) => (i / (NODES - 1)) * w;
      const py = (i: number) => mid + y[i] * amp;

      // the string
      ctx.beginPath();
      ctx.moveTo(px(0), py(0));
      for (let i = 1; i < NODES; i++) ctx.lineTo(px(i), py(i));
      ctx.strokeStyle = "rgba(0,255,156,0.55)";
      ctx.lineWidth = 1.3;
      ctx.lineJoin = "round";
      ctx.stroke();

      // glow under the displaced parts
      ctx.lineTo(w, mid);
      ctx.lineTo(0, mid);
      ctx.closePath();
      ctx.fillStyle = "rgba(0,255,156,0.055)";
      ctx.fill();

      // nodes, brighter where the string is moving fastest
      for (let i = 0; i < NODES; i += 3) {
        const speed = Math.min(1, Math.abs(v[i]) * 2.2);
        ctx.fillStyle = `rgba(0,255,156,${(0.16 + speed * 0.6).toFixed(3)})`;
        const s = 1.4 + speed * 1.6;
        ctx.fillRect(px(i) - s / 2, py(i) - s / 2, s, s);
      }

      if (running) raf = requestAnimationFrame(frame);
    }

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      pointerIn =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      pointerX = e.clientX - r.left;
      pointerY = e.clientY - r.top;
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    }

    frame();
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
    <div
      className={`relative flex flex-col bg-[color:var(--color-surface)] ${className}`}
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
          string
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
          plucked by each block · drag through it
        </span>
      </div>
      {/* The canvas is taken out of flow. Sizing its backing store from its
          own measured box while that box is itself flex-sized creates a
          feedback loop, and the element grows every frame. Absolute inside
          a relative parent means the container alone dictates the size. */}
      <div className="relative min-h-0 flex-1">
        <canvas ref={ref} aria-hidden className="absolute inset-0 block h-full w-full" />
      </div>
    </div>
  );
}
