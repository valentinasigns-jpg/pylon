"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { selectWinners, toHex } from "@/lib/draw";
import { WidgetFrame } from "./widget-frame";

/**
 * A field of entrants with three of them coming up.
 *
 * The selection is not decorative and not random-looking — it is the real
 * `selectWinners`, the same partial Fisher-Yates the contract runs, fed a
 * fresh 32-byte value each cycle. What lights up here is what would light
 * up on chain given that value, which makes this the one animation on the
 * site that is also a demonstration.
 */

const COLS = 12;
const ROWS = 9;
const N = COLS * ROWS;
const K = 3;
const CYCLE_MS = 2600;

const K256 = (d: Uint8Array) => keccak_256(d);

const CELLS = Array.from({ length: N }, (_, i) => ({
  x: Number((10 + (i % COLS) * 15).toFixed(2)),
  y: Number((16 + Math.floor(i / COLS) * 15).toFixed(2)),
}));

/** A seed that does not depend on the clock during render. */
function seedFrom(counter: number): string {
  const bytes = new Uint8Array(8);
  let v = counter;
  for (let i = 7; i >= 0; i--) {
    bytes[i] = v & 0xff;
    v = Math.floor(v / 256);
  }
  return toHex(K256(bytes));
}

export function WDrawField() {
  const [tick, setTick] = useState(0);
  const [reduced, setReduced] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduced) return;
    timer.current = setInterval(() => setTick((t) => t + 1), CYCLE_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [reduced]);

  const { winners, seed } = useMemo(() => {
    const s = seedFrom(tick + 1);
    return { winners: selectWinners(K256, s, N, K), seed: s };
  }, [tick]);

  const chosen = new Set(winners);

  return (
    <WidgetFrame title="selection" status="drawing" live>
      <div className="px-3 py-3">
        <svg viewBox="0 0 200 236" className="h-[236px] w-full" aria-hidden>
          {CELLS.map((c, i) => {
            const on = chosen.has(i);
            return (
              <rect
                key={i}
                x={c.x - 3}
                y={c.y - 3}
                width={6}
                height={6}
                fill={on ? "#00FF9C" : "none"}
                stroke="#00FF9C"
                strokeWidth="0.7"
                opacity={on ? 1 : 0.18}
                style={{ transition: "opacity 320ms ease-out, fill 320ms ease-out" }}
              />
            );
          })}

          {/* rank markers, so it reads as an ordered draw rather than a blink */}
          {winners.map((idx, rank) => {
            const c = CELLS[idx];
            return (
              <g key={`r-${rank}`}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r="7"
                  fill="none"
                  stroke="#00FF9C"
                  strokeWidth="0.6"
                  opacity="0.45"
                />
                <text
                  x={c.x + 10}
                  y={c.y + 3}
                  fill="#00FF9C"
                  fontSize="7"
                  opacity="0.75"
                >
                  {rank + 1}
                </text>
              </g>
            );
          })}

          <text x="10" y="164" fill="#7a7a7a" fontSize="7.5" letterSpacing="1.2">
            {N} ENTRANTS · {K} WINNERS
          </text>
          <text x="10" y="178" fill="#7a7a7a" fontSize="6.5" letterSpacing="0.6">
            {seed.slice(0, 34)}…
          </text>
          <text x="10" y="192" fill="#00FF9C" fontSize="7" opacity="0.8" letterSpacing="1">
            → {winners.join("  ")}
          </text>
          <text x="10" y="212" fill="#7a7a7a" fontSize="6.5" letterSpacing="0.8">
            SAME FUNCTION THE CONTRACT RUNS
          </text>
        </svg>
      </div>
    </WidgetFrame>
  );
}
