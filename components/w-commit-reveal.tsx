"use client";

import { useEffect, useRef, useState } from "react";
import { WidgetFrame } from "./widget-frame";

/**
 * Two streams meeting, which is how the randomness is actually made.
 *
 * The oracle combines a value the requester supplies with one the provider
 * pre-committed to and only then reveals. Neither side alone decides the
 * result, and that is the whole reason the number can be trusted — so it is
 * drawn as two lines converging on a single point rather than one arrow
 * arriving from somewhere unspecified.
 */

const W = 200;
const H = 236;
const MID_Y = 112;
const JOIN_X = 130;
const STEPS = 34;

/** Precomputed so server and client render identical markup. */
const LEFT = Array.from({ length: STEPS }, (_, i) => {
  const t = i / (STEPS - 1);
  return {
    x: Number((16 + t * (JOIN_X - 16)).toFixed(2)),
    y: Number((MID_Y - 44 + t * 44).toFixed(2)),
  };
});
const RIGHT = Array.from({ length: STEPS }, (_, i) => {
  const t = i / (STEPS - 1);
  return {
    x: Number((16 + t * (JOIN_X - 16)).toFixed(2)),
    y: Number((MID_Y + 44 - t * 44).toFixed(2)),
  };
});

export function WCommitReveal() {
  const [phase, setPhase] = useState(0);
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
      setPhase(STEPS - 1);
      return;
    }
    timer.current = setInterval(() => {
      setPhase((p) => (p + 1) % (STEPS + 10));
    }, 70);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [reduced]);

  const head = Math.min(phase, STEPS - 1);
  const joined = phase >= STEPS - 1;

  return (
    <WidgetFrame title="entropy" status={joined ? "revealed" : "combining"} live>
      <div className="px-3 py-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[236px] w-full" aria-hidden>
          <text x="14" y="26" fill="#7a7a7a" fontSize="7" letterSpacing="1.2">
            YOUR VALUE
          </text>
          <text x="14" y={H - 32} fill="#7a7a7a" fontSize="7" letterSpacing="1.2">
            PROVIDER&apos;S REVEAL
          </text>

          {/* the two rails */}
          <polyline
            points={LEFT.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#00FF9C"
            strokeWidth="0.6"
            opacity="0.2"
          />
          <polyline
            points={RIGHT.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#00FF9C"
            strokeWidth="0.6"
            opacity="0.2"
          />

          {/* travelled portion */}
          <polyline
            points={LEFT.slice(0, head + 1).map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#00FF9C"
            strokeWidth="1.1"
            opacity="0.8"
          />
          <polyline
            points={RIGHT.slice(0, head + 1).map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#00FF9C"
            strokeWidth="1.1"
            opacity="0.8"
          />

          <circle cx={LEFT[head].x} cy={LEFT[head].y} r="2.4" fill="#00FF9C" />
          <circle cx={RIGHT[head].x} cy={RIGHT[head].y} r="2.4" fill="#00FF9C" />

          {/* the join */}
          <circle
            cx={JOIN_X}
            cy={MID_Y}
            r={joined ? 6 : 3}
            fill="none"
            stroke="#00FF9C"
            strokeWidth="1"
            opacity={joined ? 0.9 : 0.3}
            style={{ transition: "r 260ms ease-out, opacity 260ms ease-out" }}
          />
          <line
            x1={JOIN_X}
            y1={MID_Y}
            x2={W - 22}
            y2={MID_Y}
            stroke="#00FF9C"
            strokeWidth="1"
            opacity={joined ? 0.8 : 0.15}
            style={{ transition: "opacity 260ms ease-out" }}
          />
          <text
            x={W - 20}
            y={MID_Y - 8}
            textAnchor="end"
            fill="#00FF9C"
            fontSize="7"
            letterSpacing="1.2"
            opacity={joined ? 0.9 : 0.25}
            style={{ transition: "opacity 260ms ease-out" }}
          >
            KECCAK256
          </text>

          <text x="14" y={H - 14} fill="#7a7a7a" fontSize="6.5" letterSpacing="0.8">
            NEITHER SIDE DECIDES ALONE
          </text>
        </svg>
      </div>
    </WidgetFrame>
  );
}
