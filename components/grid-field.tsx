"use client";

import { useEffect, useRef } from "react";

const CELL = 64;
const RADIUS = 300; // cursor influence radius, px
const FLASH_MS = 2000;
const FLASH_EVERY = [1400, 3600] as const;

type Flash = { cx: number; cy: number; born: number };

/**
 * Fixed full-viewport grid that reacts to the pointer.
 *
 * Painted bottom to top:
 *   1. base grid at low alpha
 *   2. every cell inside RADIUS filled with alpha proportional to its
 *      distance from the pointer — this is the part you actually notice
 *   3. the same grid restroked through a radial gradient, so lines near
 *      the pointer brighten without any per-line maths
 *   4. bloom, the cell directly under the pointer, and thin crosshair rails
 *   5. rare single-cell flashes that fade over two seconds
 *
 * Note on stacking: this canvas sits at a negative z-index inside <body>,
 * so <body> must not have a background of its own or it would cover it.
 * The page colour lives on <html> instead.
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

    let px = -9999;
    let py = -9999;
    let tx = -9999;
    let ty = -9999;
    let pointerSeen = false;

    const flashes: Flash[] = [];
    let nextFlashAt = 0;
    let raf = 0;
    let running = true;

    /**
     * Returns true once the viewport reports a usable size. A canvas that
     * mounts into a zero-sized viewport (prerender, backgrounded tab, an
     * iframe that has not been laid out yet) would otherwise stay blank
     * forever, since `resize` never fires for it.
     */
    function resize() {
      if (!canvas || !ctx) return false;
      const nw = window.innerWidth || document.documentElement.clientWidth;
      const nh = window.innerHeight || document.documentElement.clientHeight;
      if (nw === 0 || nh === 0) return false;
      if (nw === w && nh === h) return true;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = nw;
      h = nh;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    function strokeGrid(bx?: number, by?: number, br?: number) {
      if (!ctx) return;
      ctx.beginPath();
      if (bx !== undefined && by !== undefined && br !== undefined) {
        const x0 = Math.floor((bx - br) / CELL) * CELL;
        const x1 = Math.ceil((bx + br) / CELL) * CELL;
        const y0 = Math.floor((by - br) / CELL) * CELL;
        const y1 = Math.ceil((by + br) / CELL) * CELL;
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
      // Re-check size every frame: cheap when unchanged, and it lets a
      // canvas that mounted at zero size recover the moment layout lands.
      if (!resize()) {
        if (running) raf = requestAnimationFrame(frame);
        return;
      }
      ctx.clearRect(0, 0, w, h);

      px += (tx - px) * 0.14;
      py += (ty - py) * 0.14;

      const active = pointerSeen && px > -9000 && tx > -9000;

      // --- 1. base grid ---
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.026)";
      strokeGrid();

      if (active) {
        // --- 2. per-cell falloff fill ---
        const cx0 = Math.floor((px - RADIUS) / CELL) * CELL;
        const cx1 = Math.ceil((px + RADIUS) / CELL) * CELL;
        const cy0 = Math.floor((py - RADIUS) / CELL) * CELL;
        const cy1 = Math.ceil((py + RADIUS) / CELL) * CELL;
        const hotX = Math.floor(px / CELL) * CELL;
        const hotY = Math.floor(py / CELL) * CELL;

        for (let x = cx0; x <= cx1; x += CELL) {
          if (x + CELL < 0 || x > w) continue;
          for (let y = cy0; y <= cy1; y += CELL) {
            if (y + CELL < 0 || y > h) continue;
            // distance from pointer to the cell's centre
            const dx = x + CELL / 2 - px;
            const dy = y + CELL / 2 - py;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > RADIUS) continue;
            // smooth falloff, squared for a tighter core
            const f = (1 - d / RADIUS) ** 2;
            if (f < 0.01) continue;
            ctx.fillStyle = `rgba(0,255,156,${(f * 0.10).toFixed(4)})`;
            ctx.fillRect(x + 1, y + 1, CELL - 1, CELL - 1);
          }
        }

        // --- 3. grid lines brighten near the pointer ---
        const g = ctx.createRadialGradient(px, py, 0, px, py, RADIUS);
        g.addColorStop(0, "rgba(0,255,156,0.46)");
        g.addColorStop(0.4, "rgba(0,255,156,0.16)");
        g.addColorStop(1, "rgba(0,255,156,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1;
        strokeGrid(px, py, RADIUS);

        // --- 4a. bloom ---
        const bloom = ctx.createRadialGradient(px, py, 0, px, py, RADIUS * 0.8);
        bloom.addColorStop(0, "rgba(0,255,156,0.075)");
        bloom.addColorStop(0.5, "rgba(0,255,156,0.022)");
        bloom.addColorStop(1, "rgba(0,255,156,0)");
        ctx.fillStyle = bloom;
        ctx.fillRect(px - RADIUS, py - RADIUS, RADIUS * 2, RADIUS * 2);

        // --- 4b. the cell under the pointer ---
        ctx.fillStyle = "rgba(0,255,156,0.10)";
        ctx.fillRect(hotX + 1, hotY + 1, CELL - 1, CELL - 1);
        ctx.strokeStyle = "rgba(0,255,156,0.55)";
        ctx.lineWidth = 1;
        ctx.strokeRect(hotX + 0.5, hotY + 0.5, CELL, CELL);

        // --- 4c. crosshair rails across the viewport ---
        const railH = ctx.createLinearGradient(px - RADIUS, 0, px + RADIUS, 0);
        railH.addColorStop(0, "rgba(0,255,156,0)");
        railH.addColorStop(0.5, "rgba(0,255,156,0.13)");
        railH.addColorStop(1, "rgba(0,255,156,0)");
        ctx.strokeStyle = railH;
        ctx.beginPath();
        ctx.moveTo(px - RADIUS, hotY + 0.5);
        ctx.lineTo(px + RADIUS, hotY + 0.5);
        ctx.moveTo(px - RADIUS, hotY + CELL + 0.5);
        ctx.lineTo(px + RADIUS, hotY + CELL + 0.5);
        ctx.stroke();

        const railV = ctx.createLinearGradient(0, py - RADIUS, 0, py + RADIUS);
        railV.addColorStop(0, "rgba(0,255,156,0)");
        railV.addColorStop(0.5, "rgba(0,255,156,0.13)");
        railV.addColorStop(1, "rgba(0,255,156,0)");
        ctx.strokeStyle = railV;
        ctx.beginPath();
        ctx.moveTo(hotX + 0.5, py - RADIUS);
        ctx.lineTo(hotX + 0.5, py + RADIUS);
        ctx.moveTo(hotX + CELL + 0.5, py - RADIUS);
        ctx.lineTo(hotX + CELL + 0.5, py + RADIUS);
        ctx.stroke();
      }

      // --- 5. idle flashes ---
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
          const a = Math.sin(t * Math.PI) * 0.085;
          ctx.fillStyle = `rgba(0,255,156,${a.toFixed(4)})`;
          ctx.fillRect(f.cx + 1, f.cy + 1, CELL - 1, CELL - 1);
          ctx.strokeStyle = `rgba(0,255,156,${(a * 2.4).toFixed(4)})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(f.cx + 0.5, f.cy + 0.5, CELL, CELL);
        }
      }

      if (running) raf = requestAnimationFrame(frame);
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
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    }

    const onResize = () => {
      resize();
    };

    // Paint once synchronously so the grid is there before the first
    // animation frame — and so it exists even if rAF is throttled.
    frame(performance.now());

    // Covers the case where the viewport gains its size after mount without
    // ever firing a window resize event.
    const ro = new ResizeObserver(onResize);
    ro.observe(document.documentElement);

    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", onResize);
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
