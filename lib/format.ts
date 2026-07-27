/** Formatting helpers. Everything renders "—" when the value is absent. */

export const DASH = "—";

export function num(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function usd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function price(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toExponential(2)}`;
}

/** wei -> gwei, adaptive precision (this chain runs ~0.036 gwei). */
export function gwei(wei: number | null | undefined, digits?: number): string {
  if (wei === null || wei === undefined || !Number.isFinite(wei)) return DASH;
  const g = wei / 1e9;
  if (digits !== undefined) return g.toFixed(digits);
  if (g >= 100) return g.toFixed(1);
  if (g >= 1) return g.toFixed(3);
  return g.toFixed(4);
}

export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

/** Seconds-since-epoch -> "4s ago" / "2m ago". Sub-second chains show "now". */
export function age(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return DASH;
  const secs = Math.max(0, Math.floor(now / 1000 - ts));
  if (secs < 1) return "now";
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function truncMid(s: string | null | undefined, head = 10, tail = 8): string {
  if (!s) return DASH;
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function pct(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  return `${n.toFixed(digits)}%`;
}
