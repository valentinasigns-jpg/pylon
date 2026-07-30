"use client";

import { useEffect, useRef, useState } from "react";
import { WidgetFrame } from "./widget-frame";

/**
 * A Merkle tree assembling itself, leaves upward.
 *
 * This is the page's own subject drawn out: sixteen entrants become eight
 * pairs, then four, then two, then a single root. The sweep climbs one
 * layer at a time and settles on the root before starting again — which is
 * exactly what happens in the form to the left when a list is pasted in.
 *
 * Nothing here is driven by chain data, because nothing about building a
 * commitment involves the chain. It is arithmetic, and it happens locally.
 */

const LEAVES = 16;
const LAYERS = 5; // 16 → 8 → 4 → 2 → 1
const W = 200;
const H = 236;
const TOP = 26;
const BOTTOM = 208;

/** Node positions, precomputed so server and client agree exactly. */
const NODES = Array.from({ length: LAYERS }, (_, layer) => {
  const count = LEAVES >> layer;
  const y = BOTTOM - (layer / (LAYERS - 1)) * (BOTTOM - TOP);
  const step = W / (count + 1);
  return Array.from({ length: count }, (_, i) => ({
    x: Number(((i + 1) * step).toFixed(2)),
    y: Number(y.toFixed(2)),
  }));
});

export function WMerkleTree() {
  const [layer, setLayer] = useState(0);
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
    if (reduced) {
      // Show the finished tree rather than a frozen half-built one.
      setLayer(LAYERS - 1);
      return;
    }
    timer.current = setInterval(() => {
      setLayer((l) => (l + 1) % (LAYERS + 1));
    }, 900);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [reduced]);

  const built = Math.min(layer, LAYERS - 1);

  return (
    <WidgetFrame title="commitment" status="hashing" live>
      <div className="px-3 py-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[236px] w-full" aria-hidden>
          {/* edges, drawn first so nodes sit on top */}
          {NODES.slice(1).map((row, li) =>
            row.map((n, i) => {
              const parentLayer = li + 1;
              const a = NODES[li][i * 2];
              const b = NODES[li][i * 2 + 1];
              const on = parentLayer <= built;
              return (
                <g key={`e-${parentLayer}-${i}`}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={n.x}
                    y2={n.y}
                    stroke="#00FF9C"
                    strokeWidth="0.7"
                    opacity={on ? 0.5 : 0.12}
                    style={{ transition: "opacity 450ms ease-out" }}
                  />
                  <line
                    x1={b.x}
                    y1={b.y}
                    x2={n.x}
                    y2={n.y}
                    stroke="#00FF9C"
                    strokeWidth="0.7"
                    opacity={on ? 0.5 : 0.12}
                    style={{ transition: "opacity 450ms ease-out" }}
                  />
                </g>
              );
            }),
          )}

          {NODES.map((row, li) =>
            row.map((n, i) => {
              const on = li <= built;
              const isRoot = li === LAYERS - 1;
              const size = isRoot ? 4 : li === 0 ? 2 : 3;
              return (
                <rect
                  key={`n-${li}-${i}`}
                  x={n.x - size}
                  y={n.y - size}
                  width={size * 2}
                  height={size * 2}
                  fill={on ? "#00FF9C" : "none"}
                  stroke="#00FF9C"
                  strokeWidth="0.8"
                  opacity={on ? (isRoot ? 1 : 0.75) : 0.2}
                  style={{ transition: "opacity 450ms ease-out, fill 450ms ease-out" }}
                />
              );
            }),
          )}

          {/* the layer being folded right now */}
          {!reduced && built > 0 && built < LAYERS && (
            <line
              x1="0"
              y1={NODES[built][0].y}
              x2={W}
              y2={NODES[built][0].y}
              stroke="#00FF9C"
              strokeWidth="0.5"
              opacity="0.25"
            />
          )}

          <text
            x={W / 2}
            y={TOP - 12}
            textAnchor="middle"
            fill="#00FF9C"
            fontSize="8"
            letterSpacing="1.6"
            opacity={built === LAYERS - 1 ? 0.9 : 0.3}
            style={{ transition: "opacity 450ms ease-out" }}
          >
            ROOT
          </text>
          <text
            x={W / 2}
            y={BOTTOM + 20}
            textAnchor="middle"
            fill="#7a7a7a"
            fontSize="7.5"
            letterSpacing="1.4"
          >
            {LEAVES} ENTRANTS
          </text>
        </svg>
      </div>
    </WidgetFrame>
  );
}
