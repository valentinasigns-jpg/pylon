import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-[color:var(--color-border)] bg-[color:var(--color-surface)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHead({
  index,
  title,
  sub,
  right,
}: {
  index: string;
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--color-border)] pb-3">
      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-[11px] text-[color:var(--color-accent)]">
            [{index}]
          </span>
          <h2 className="h-display text-lg text-[color:var(--color-fg)] sm:text-xl">
            {title}
          </h2>
        </div>
        {sub && (
          <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function OfflinePill() {
  return (
    <span className="inline-flex items-center gap-2 border border-[color:var(--color-border)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
      <span className="h-1.5 w-1.5 bg-[color:var(--color-dim)]" />
      feed offline
    </span>
  );
}

export function LivePill({ live }: { live: boolean }) {
  if (!live) return <OfflinePill />;
  return (
    <span className="inline-flex items-center gap-2 border border-[color:var(--color-accent)]/40 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-accent)]">
      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]" />
      live
    </span>
  );
}

export function KV({
  k,
  v,
  mono = true,
  accent = false,
}: {
  k: string;
  v: ReactNode;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[color:var(--color-border)] py-2.5 last:border-b-0">
      <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
        {k}
      </span>
      <span
        className={`break-all text-right text-[13px] ${
          accent ? "text-[color:var(--color-accent)]" : "text-[color:var(--color-fg)]"
        } ${mono ? "" : "font-sans"}`}
      >
        {v}
      </span>
    </div>
  );
}
