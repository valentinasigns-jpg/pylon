"use client";

import { usePoll } from "@/lib/use-poll";
import { gwei, compact, num, DASH } from "@/lib/format";
import { Oscillator } from "./oscillator";

type ChainFeed = {
  ok: boolean;
  height: number | null;
  gasPriceWei: number | null;
  baseFeeWei: number | null;
  txInLatest: number | null;
  gasUsedLatest: number | null;
  totals: {
    blocks: number | null;
    transactions: number | null;
    addresses: number | null;
    txToday: number | null;
    avgBlockTimeMs: number | null;
  } | null;
};

// Gauge geometry constants, shared by the tick table below.
const G = { R: 46, CX: 60, CY: 58, START: 150, SWEEP: 240 };

// Precomputed once at module load and rounded, so the server-rendered
// markup is byte-identical to the client's.
const TICKS = Array.from({ length: 9 }, (_, i) => {
  const deg = G.START + (G.SWEEP * i) / 8;
  const r = (deg * Math.PI) / 180;
  const inner = G.R - 10;
  return {
    x1: (G.CX + G.R * Math.cos(r)).toFixed(3),
    y1: (G.CY + G.R * Math.sin(r)).toFixed(3),
    x2: (G.CX + inner * Math.cos(r)).toFixed(3),
    y2: (G.CY + inner * Math.sin(r)).toFixed(3),
  };
});

/** Radial arc gauge. `frac` is 0..1 of the sweep. */
function Arc({
  frac,
  label,
  value,
  unit,
}: {
  frac: number | null;
  label: string;
  value: string;
  unit?: string;
}) {
  const R = 46;
  const CX = 60;
  const CY = 58;
  // 240° sweep starting at 150°
  const START = 150;
  const SWEEP = 240;
  const toXY = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return [CX + R * Math.cos(r), CY + R * Math.sin(r)];
  };
  const [x0, y0] = toXY(START);
  const [x1, y1] = toXY(START + SWEEP);
  const track = `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 1 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;

  const f = frac == null ? 0 : Math.max(0, Math.min(1, frac));
  const [xv, yv] = toXY(START + SWEEP * f);
  const largeArc = SWEEP * f > 180 ? 1 : 0;
  const fill = `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${xv.toFixed(2)} ${yv.toFixed(2)}`;

  return (
    <div className="flex flex-col items-center bg-[color:var(--color-surface)] px-3 py-4">
      <svg viewBox="0 0 120 100" className="h-[92px] w-[112px]" aria-hidden>
        <path
          d={track}
          fill="none"
          stroke="#1F1F1F"
          strokeWidth="6"
          strokeLinecap="butt"
        />
        {frac != null && (
          <path
            d={fill}
            fill="none"
            stroke="#00FF9C"
            strokeWidth="6"
            strokeLinecap="butt"
            className="transition-[d] duration-300"
          />
        )}
        {/* tick marks — coordinates fixed to 3dp so SSR and client agree */}
        {TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="#1F1F1F"
            strokeWidth="1"
          />
        ))}
        <text
          x={CX}
          y={CY - 2}
          textAnchor="middle"
          fill="#EDEDED"
          fontSize="17"
          fontFamily="var(--font-jetbrains), monospace"
        >
          {value}
        </text>
        {unit && (
          <text
            x={CX}
            y={CY + 13}
            textAnchor="middle"
            fill="#7A7A7A"
            fontSize="9"
            fontFamily="var(--font-jetbrains), monospace"
          >
            {unit}
          </text>
        )}
      </svg>
      <div className="mt-1 text-center text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
        {label}
      </div>
    </div>
  );
}

function Meter({
  label,
  value,
  sub,
  frac,
}: {
  label: string;
  value: string;
  sub: string;
  frac: number | null;
}) {
  const f = frac == null ? 0 : Math.max(0.02, Math.min(1, frac));
  return (
    // Label sits above the value rather than beside it: these labels run to
    // three words and the values are large, so sharing a baseline row in a
    // column this narrow put them on top of each other. The reserved
    // heights keep all four cells aligned whatever the text length.
    <div className="flex h-full flex-col bg-[color:var(--color-surface)] px-4 py-4">
      <div className="min-h-[2.5em] text-[10px] uppercase leading-[1.25] tracking-[0.14em] text-[color:var(--color-dim)]">
        {label}
      </div>
      <div className="mt-2 text-[20px] leading-none tabular-nums text-[color:var(--color-fg)]">
        {value}
      </div>
      {/* segmented bar */}
      <div className="mt-3 flex h-2.5 gap-[2px]">
        {Array.from({ length: 24 }).map((_, i) => {
          const on = frac != null && i / 24 < f;
          return (
            <div
              key={i}
              className={`flex-1 transition-colors duration-200 ${
                on
                  ? "bg-[color:var(--color-accent)]"
                  : "bg-[color:var(--color-border)]"
              }`}
            />
          );
        })}
      </div>
      <div className="mt-2 min-h-[2.4em] text-[10px] leading-[1.35] text-[color:var(--color-dim)]">
        {sub}
      </div>
    </div>
  );
}

export function Gauges() {
  const { data } = usePoll<ChainFeed>("/api/chain");

  const baseFee = data?.baseFeeWei ?? null;
  const gasPrice = data?.gasPriceWei ?? null;
  const txLatest = data?.txInLatest ?? null;
  const gasUsed = data?.gasUsedLatest ?? null;
  const blockMs = data?.totals?.avgBlockTimeMs ?? null;
  const txToday = data?.totals?.txToday ?? null;

  // Scales chosen from observed ranges on this chain, stated in the caption
  // so the reader knows what "full" means.
  const feeFrac = baseFee != null ? baseFee / 1e8 : null; // 0 → 0.1 gwei
  const blockFrac = blockMs != null ? Math.min(1, blockMs / 500) : null; // 0 → 500ms
  const txFrac = txLatest != null ? Math.min(1, txLatest / 40) : null; // 0 → 40 tx

  return (
    // Full-width bands rather than an auto/1fr split. The arcs are short and
    // the meters are tall, so side by side left a large void under the dials
    // and stretched the meters apart.
    <div className="flex flex-col border border-[color:var(--color-border)] bg-[color:var(--color-border)]">
      {/* band one — dials */}
      <div className="grid grid-cols-3 gap-px">
        <Arc
          frac={feeFrac}
          label="base fee"
          value={baseFee != null ? gwei(baseFee, 3) : DASH}
          unit="gwei"
        />
        <Arc
          frac={blockFrac}
          label="block time"
          value={blockMs != null ? String(Math.round(blockMs)) : DASH}
          unit="ms"
        />
        <Arc
          frac={txFrac}
          label="tx / block"
          value={txLatest != null ? String(txLatest) : DASH}
          unit="latest"
        />
      </div>

      {/* band two — meters */}
      <div className="mt-px grid shrink-0 grid-cols-1 gap-px sm:grid-cols-2 xl:grid-cols-4">
        <Meter
          label="gas used, latest block"
          value={gasUsed != null ? compact(gasUsed) : DASH}
          sub="scale 0 → 5M gas"
          frac={gasUsed != null ? Math.min(1, gasUsed / 5e6) : null}
        />
        <Meter
          label="suggested gas price"
          value={gasPrice != null ? `${gwei(gasPrice)} gwei` : DASH}
          sub="eth_gasPrice · scale 0 → 0.1 gwei"
          frac={gasPrice != null ? Math.min(1, gasPrice / 1e8) : null}
        />
        <Meter
          label="transactions today"
          value={txToday != null ? compact(txToday) : DASH}
          sub="scale 0 → 10M · resets daily"
          frac={txToday != null ? Math.min(1, txToday / 1e7) : null}
        />
        <Meter
          label="total addresses"
          value={
            data?.totals?.addresses != null
              ? compact(data.totals.addresses)
              : DASH
          }
          sub="scale 0 → 10M · all time"
          frac={
            data?.totals?.addresses != null
              ? Math.min(1, data.totals.addresses / 1e7)
              : null
          }
        />
      </div>

      {/* band three — closes the panel on something moving rather than on a
          blank rectangle */}
      <Oscillator className="mt-px h-[172px]" />
    </div>
  );
}
