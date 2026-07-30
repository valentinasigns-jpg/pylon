"use client";

import { useEffect, useRef, useState } from "react";
import { WidgetFrame } from "./widget-frame";

/**
 * One leaf climbing to the root, carrying its siblings.
 *
 * A Merkle proof is exactly this walk: at each level you hold one hash and
 * are handed its sibling, and the pair folds into the level above until you
 * either land on the published root or you do not. Drawn from the leaf up
 * because that is the direction a verifier travels, and the direction the
 * SDK's `verifyProof` runs.
 */

const LAYERS = 5;
const LEAVES = 16;
const W = 200;
const H = 236;
const TOP = 34;
const BOTTOM = 196;
const PATH_LEAF = 5; // the leaf being proved

const NODES = Array.from({ length: LAYERS }, (_, layer) => {
  const count = LEAVES >> layer;
  const y = BOTTOM - (layer / (LAYERS - 1)) * (BOTTOM - TOP);
  const step = W / (count + 1);
  return Array.from({ length: count }, (_, i) => ({
    x: Number(((i + 1) * step).toFixed(2)),
    y: Number(y.toFixed(2)),
  }));
});

/** Which node is on the path, and which sibling is handed over, per layer. */
const WALK = Array.from({ length: LAYERS }, (_, layer) => {
  const idx = PATH_LEAF >> layer;
  const sibling = layer === LAYERS - 1 ? null : idx ^ 1;
  return { idx, sibling };
});

export function WProofPath() {
  const [step, setStep] = useState(0);
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
      setStep(LAYERS - 1);
      return;
    }
    timer.current = setInterval(() => {
      setStep((s) => (s + 1) % (LAYERS + 2));
    }, 780);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [reduced]);

  const at = Math.min(step, LAYERS - 1);
  const done = step >= LAYERS - 1;

  return (
    <WidgetFrame title="proof" status={done ? "verified" : "climbing"} live>
      <div className="px-3 py-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[236px] w-full" aria-hidden>
          {/* the whole tree, faint */}
          {NODES.slice(1).map((row, li) =>
            row.map((n, i) => (
              <g key={`e-${li}-${i}`}>
                <line
                  x1={NODES[li][i * 2].x}
                  y1={NODES[li][i * 2].y}
                  x2={n.x}
                  y2={n.y}
                  stroke="#00FF9C"
                  strokeWidth="0.5"
                  opacity="0.1"
                />
                <line
                  x1={NODES[li][i * 2 + 1].x}
                  y1={NODES[li][i * 2 + 1].y}
                  x2={n.x}
                  y2={n.y}
                  stroke="#00FF9C"
                  strokeWidth="0.5"
                  opacity="0.1"
                />
              </g>
            )),
          )}
          {NODES.map((row, li) =>
            row.map((n, i) => (
              <rect
                key={`b-${li}-${i}`}
                x={n.x - 2}
                y={n.y - 2}
                width={4}
                height={4}
                fill="none"
                stroke="#00FF9C"
                strokeWidth="0.5"
                opacity="0.14"
              />
            )),
          )}

          {/* the climb */}
          {WALK.slice(0, at + 1).map((w, li) => {
            const n = NODES[li][w.idx];
            const sib = w.sibling !== null ? NODES[li][w.sibling] : null;
            return (
              <g key={`w-${li}`}>
                {sib && (
                  <>
                    <rect
                      x={sib.x - 3}
                      y={sib.y - 3}
                      width={6}
                      height={6}
                      fill="none"
                      stroke="#00FF9C"
                      strokeWidth="0.9"
                      opacity="0.55"
                    />
                    <line
                      x1={sib.x}
                      y1={sib.y}
                      x2={NODES[li + 1][w.idx >> 1].x}
                      y2={NODES[li + 1][w.idx >> 1].y}
                      stroke="#00FF9C"
                      strokeWidth="0.7"
                      opacity="0.35"
                    />
                  </>
                )}
                <rect
                  x={n.x - 3.5}
                  y={n.y - 3.5}
                  width={7}
                  height={7}
                  fill="#00FF9C"
                  opacity={li === LAYERS - 1 ? 1 : 0.85}
                />
                {li < at && (
                  <line
                    x1={n.x}
                    y1={n.y}
                    x2={NODES[li + 1][w.idx >> 1].x}
                    y2={NODES[li + 1][w.idx >> 1].y}
                    stroke="#00FF9C"
                    strokeWidth="1.2"
                    opacity="0.85"
                  />
                )}
              </g>
            );
          })}

          <text
            x={W / 2}
            y={TOP - 14}
            textAnchor="middle"
            fill="#00FF9C"
            fontSize="7.5"
            letterSpacing="1.6"
            opacity={done ? 0.95 : 0.25}
            style={{ transition: "opacity 300ms ease-out" }}
          >
            {done ? "MATCHES THE ROOT" : "ROOT"}
          </text>
          <text
            x={NODES[0][PATH_LEAF].x}
            y={BOTTOM + 18}
            textAnchor="middle"
            fill="#7a7a7a"
            fontSize="7"
            letterSpacing="1"
          >
            LEAF {PATH_LEAF}
          </text>
          <text x="12" y={H - 12} fill="#7a7a7a" fontSize="6.5" letterSpacing="0.8">
            {LAYERS - 1} SIBLINGS · NO NETWORK
          </text>
        </svg>
      </div>
    </WidgetFrame>
  );
}
