"use client";

import { useAnimatedNumber, useHistory } from "@/lib/use-animated-number";
import { DASH } from "@/lib/format";

/**
 * A metric that moves when the chain does.
 *
 * The figure tweens toward each new reading and the digit group flashes —
 * accent when it rose, red when it fell — then decays. Digits are tabular
 * so nothing shifts width mid-count.
 */
export function Metric({
  value,
  format,
  className = "",
  size = "md",
}: {
  value: number | null;
  format: (n: number | null) => string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { value: shown, direction, flash } = useAnimatedNumber(value);

  const tint =
    flash > 0.01 && direction
      ? direction === "up"
        ? `rgba(0,255,156,${(flash * 0.9).toFixed(3)})`
        : `rgba(255,77,77,${(flash * 0.9).toFixed(3)})`
      : undefined;

  const sizes = {
    sm: "text-[15px]",
    md: "text-[22px]",
    lg: "text-[28px]",
  } as const;

  return (
    <span
      className={`tabular-nums transition-colors duration-150 ${sizes[size]} ${className}`}
      style={tint ? { color: tint } : undefined}
    >
      {shown === null ? DASH : format(shown)}
    </span>
  );
}

/**
 * A sparkline of the readings this metric has taken since the page opened.
 * It starts empty and fills as data arrives — nothing is back-filled.
 */
export function Sparkline({
  value,
  points = 50,
  className = "",
}: {
  value: number | null;
  points?: number;
  className?: string;
}) {
  const hist = useHistory(value, points);

  if (hist.length < 2) {
    return <div className={`h-5 ${className}`} aria-hidden />;
  }

  const min = Math.min(...hist);
  const max = Math.max(...hist);
  const span = max - min || Math.max(1, Math.abs(max) * 0.01);
  const W = 100;
  const H = 20;

  const d = hist
    .map((v, i) => {
      const x = (i / (hist.length - 1)) * W;
      const y = H - 2 - ((v - min) / span) * (H - 4);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const lastX = W;
  const lastY = H - 2 - ((hist[hist.length - 1] - min) / span) * (H - 4);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`h-5 w-full ${className}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={`${d} L${W},${H} L0,${H} Z`}
        fill="rgba(0,255,156,0.10)"
        stroke="none"
      />
      <path
        d={d}
        fill="none"
        stroke="rgba(0,255,156,0.55)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="1.6" fill="#00FF9C" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
