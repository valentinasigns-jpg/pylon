"use client";

import { usePoll } from "@/lib/use-poll";
import { num, compact, DASH } from "@/lib/format";
import { CHAIN } from "@/lib/config";
import { WidgetFrame } from "./widget-frame";

type ChainFeed = {
  ok: boolean;
  height: number | null;
  totals: { transactions: number | null; addresses: number | null } | null;
};

// Lattice tower, drawn once. Y descends from 20 (top) to 250 (base).
const LEVELS = Array.from({ length: 9 }, (_, i) => {
  const t = i / 8;
  const y = 40 + t * 200;
  const halfW = 10 + t * 62;
  return { y: Number(y.toFixed(2)), halfW: Number(halfW.toFixed(2)) };
});

/**
 * A transmission pylon rendered as a lattice, with a signal pulse that
 * climbs it on a loop. Decorative structure, real numbers underneath.
 */
export function WPylonMast() {
  const { data, live } = usePoll<ChainFeed>("/api/chain");

  const CX = 100;

  return (
    <WidgetFrame title="pylon" status="transmitting" live={live}>
      <div className="relative px-3 py-3">
        <svg viewBox="0 0 200 270" className="h-[236px] w-full" aria-hidden>
          <defs>
            <linearGradient id="mast-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00FF9C" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#00FF9C" stopOpacity="0.22" />
            </linearGradient>
            <linearGradient id="pulse-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00FF9C" stopOpacity="0" />
              <stop offset="50%" stopColor="#00FF9C" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#00FF9C" stopOpacity="0" />
            </linearGradient>
            <clipPath id="mast-clip">
              <polygon points="28,250 172,250 110,40 90,40" />
            </clipPath>
          </defs>

          {/* ground line */}
          <line
            x1="14"
            y1="250"
            x2="186"
            y2="250"
            stroke="#1F1F1F"
            strokeWidth="1"
          />
          {[30, 60, 140, 170].map((x) => (
            <line
              key={x}
              x1={x}
              y1="250"
              x2={x}
              y2="258"
              stroke="#1F1F1F"
              strokeWidth="1"
            />
          ))}

          {/* legs */}
          <path
            d={`M ${CX - LEVELS[0].halfW} ${LEVELS[0].y} L ${CX - LEVELS[8].halfW} ${LEVELS[8].y}`}
            stroke="url(#mast-fade)"
            strokeWidth="1.6"
            fill="none"
          />
          <path
            d={`M ${CX + LEVELS[0].halfW} ${LEVELS[0].y} L ${CX + LEVELS[8].halfW} ${LEVELS[8].y}`}
            stroke="url(#mast-fade)"
            strokeWidth="1.6"
            fill="none"
          />

          {/* horizontal braces */}
          {LEVELS.map((l, i) => (
            <line
              key={`h${i}`}
              x1={CX - l.halfW}
              y1={l.y}
              x2={CX + l.halfW}
              y2={l.y}
              stroke="#00FF9C"
              strokeOpacity={0.32 - i * 0.018}
              strokeWidth="1"
            />
          ))}

          {/* cross braces */}
          {LEVELS.slice(0, -1).map((l, i) => {
            const n = LEVELS[i + 1];
            return (
              <g key={`x${i}`} stroke="#00FF9C" strokeOpacity="0.16" strokeWidth="1">
                <line x1={CX - l.halfW} y1={l.y} x2={CX + n.halfW} y2={n.y} />
                <line x1={CX + l.halfW} y1={l.y} x2={CX - n.halfW} y2={n.y} />
              </g>
            );
          })}

          {/* mast tip + arms */}
          <line x1={CX} y1="12" x2={CX} y2="40" stroke="#00FF9C" strokeWidth="1.4" />
          <line x1={CX - 26} y1="24" x2={CX + 26} y2="24" stroke="#00FF9C" strokeOpacity="0.6" strokeWidth="1" />
          <line x1={CX - 18} y1="32" x2={CX + 18} y2="32" stroke="#00FF9C" strokeOpacity="0.6" strokeWidth="1" />

          {/* beacon */}
          <circle cx={CX} cy="12" r="3" fill="#00FF9C" />
          <circle cx={CX} cy="12" r="7" fill="#00FF9C" fillOpacity="0.18">
            <animate
              attributeName="r"
              values="5;11;5"
              dur="2.4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="fill-opacity"
              values="0.26;0;0.26"
              dur="2.4s"
              repeatCount="indefinite"
            />
          </circle>

          {/* climbing signal pulse, clipped to the tower silhouette */}
          <g clipPath="url(#mast-clip)">
            <rect x="0" y="0" width="200" height="46" fill="url(#pulse-grad)">
              <animate
                attributeName="y"
                values="250;-46"
                dur="3.6s"
                repeatCount="indefinite"
              />
            </rect>
          </g>

          {/* emitted rings from the beacon */}
          {[0, 1.2, 2.4].map((delay) => (
            <circle
              key={delay}
              cx={CX}
              cy="12"
              r="6"
              fill="none"
              stroke="#00FF9C"
              strokeWidth="1"
            >
              <animate
                attributeName="r"
                values="6;62"
                dur="3.6s"
                begin={`${delay}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-opacity"
                values="0.45;0"
                dur="3.6s"
                begin={`${delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </svg>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[color:var(--color-border)] border-t border-[color:var(--color-border)]">
        {[
          { l: "chain id", v: String(CHAIN.id) },
          {
            l: "height",
            v: data?.height != null ? num(data.height) : DASH,
          },
          {
            l: "addresses",
            v:
              data?.totals?.addresses != null
                ? compact(data.totals.addresses)
                : DASH,
          },
        ].map((x) => (
          <div key={x.l} className="px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
              {x.l}
            </div>
            <div className="mt-0.5 truncate text-[12px] text-[color:var(--color-fg)]">
              {x.v}
            </div>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}
