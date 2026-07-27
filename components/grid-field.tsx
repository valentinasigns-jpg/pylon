"use client";

import { useEffect, useRef } from "react";

const CELL = 64;
const RADIUS = 240; // cursor influence radius, px
const FLASH_MS = 2000;
const FLASH_EVERY = [1400, 3600] as const; // random interval range, ms

type Flash = { cx: number; cy: number; born: number };

/**
 * Fixed full-viewport grid that reacts to the pointer.
 *
 * Three layers, all on one canvas:
 *   1. base grid at very low alpha
 *   2. the same grid redrawn with a radial-gradient stroke centred on the
 *      pointer, which gives a free falloff without per-line maths
 *   3. rare single-cell flashes that fade out over two seconds
 *
 * Skipped entirely when the visitor prefers reduced motion.
 */
export function GridField() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let w = 0;
    let h = 0;
    let dpr = 1;

    // Pointer state, eased toward the raw position so the glow trails softly.
    let px = -9999;
    let py = -9999;
    let tx = -9999;
    let ty = -9999;
    let pointerSeen = false;

    const flashes: Flash[] = [];
    let nextFlashAt = 0;
    let raf = 0;

    function resize() {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /** Stroke the whole grid with whatever strokeStyle is currently set. */
    function strokeGrid(clipX?: number, clipY?: number, clipR?: number) {
      if (!ctx) return;
      ctx.beginPath();
      if (clipX !== undefined && clipY !== undefined && clipR !== undefined) {
        // Only bother with lines inside the pointer's bounding box.
        const x0 = Math.floor((clipX - clipR) / CELL) * CELL;
        const x1 = Math.ceil((clipX + clipR) / CELL) * CELL;
        const y0 = Math.floor((clipY - clipR) / CELL) * CELL;
        const y1 = Math.ceil((clipY + clipR) / CELL) * CELL;
        for (let x = x0; x <= x1; x += CELL) {
          ctx.moveTo(x + 0.5, Math.max(0, y0));
          ctx.lineTo(x + 0.5, Math.min(h, y1));
        }
        for (let y = y0; y <= y1; y += CELL) {
          ctx.moveTo(Math.max(0, x0), y + 0.5);
          ctx.lineTo(Math.min(w, x1), y + 0.5);
        }
      } else {
        for (let x = 0; x <= w; x += CELL) {
          ctx.moveTo(x + 0.5, 0);
          ctx.lineTo(x + 0.5, h);
        }
        for (let y = 0; y <= h; y += CELL) {
          ctx.moveTo(0, y + 0.5);
          ctx.lineTo(w, y + 0.5);
        }
      }
      ctx.stroke();
    }

    function frame(now: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      // ease pointer
      px += (tx - px) * 0.12;
      py += (ty - py) * 0.12;

      // --- layer 1: base grid ---
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.020)";
      strokeGrid();

      // --- layer 2: pointer falloff ---
      if (pointerSeen && px > -9000) {
        const g = ctx.createRadialGradient(px, py, 0, px, py, RADIUS);
        g.addColorStop(0, "rgba(0,255,156,0.22)");
        g.addColorStop(0.45, "rgba(0,255,156,0.08)");
        g.addColorStop(1, "rgba(0,255,156,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1;
        strokeGrid(px, py, RADIUS);

        // soft bloom
        const bloom = ctx.createRadialGradient(px, py, 0, px, py, RADIUS * 0.75);
        bloom.addColorStop(0, "rgba(0,255,156,0.045)");
        bloom.addColorStop(1, "rgba(0,255,156,0)");
        ctx.fillStyle = bloom;
        ctx.fillRect(
          px - RADIUS,
          py - RADIUS,
          RADIUS * 2,
          RADIUS * 2,
        );

        // the cell directly under the pointer
        const cx = Math.floor(px / CELL) * CELL;
        const cy = Math.floor(py / CELL) * CELL;
        ctx.fillStyle = "rgba(0,255,156,0.035)";
        ctx.fillRect(cx, cy, CELL, CELL);
      }

      // --- layer 3: idle flashes ---
      if (!reduced) {
        if (now > nextFlashAt) {
          const cols = Math.ceil(w / CELL);
          const rows = Math.ceil(h / CELL);
          flashes.push({
            cx: Math.floor(Math.random() * cols) * CELL,
            cy: Math.floor(Math.random() * rows) * CELL,
            born: now,
          });
          nextFlashAt =
            now +
            FLASH_EVERY[0] +
            Math.random() * (FLASH_EVERY[1] - FLASH_EVERY[0]);
        }
        for (let i = flashes.length - 1; i >= 0; i--) {
          const f = flashes[i];
          const t = (now - f.born) / FLASH_MS;
          if (t >= 1) {
            flashes.splice(i, 1);
            continue;
          }
          // ease in then out
          const a = Math.sin(t * Math.PI) * 0.07;
          ctx.fillStyle = `rgba(0,255,156,${a.toFixed(4)})`;
          ctx.fillRect(f.cx, f.cy, CELL, CELL);
          ctx.strokeStyle = `rgba(0,255,156,${(a * 2.2).toFixed(4)})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(f.cx + 0.5, f.cy + 0.5, CELL, CELL);
        }
      }

      raf = requestAnimationFrame(frame);
    }

    function onMove(e: PointerEvent) {
      tx = e.clientX;
      ty = e.clientY;
      if (!pointerSeen) {
        pointerSeen = true;
        px = tx;
        py = ty;
      }
    }
    function onLeave() {
      tx = -9999;
      ty = -9999;
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(frame);
      }
    }

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
