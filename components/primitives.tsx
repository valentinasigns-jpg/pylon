"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DASH } from "@/lib/format";
import type { FeedReason } from "@/lib/use-poll";

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
  /** Omit where the number is decoration rather than sequence. */
  index?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--color-border)] pb-3">
      <div>
        <div className="flex items-baseline gap-3">
          {index && (
            <span className="text-[11px] text-[color:var(--color-accent)]">
              [{index}]
            </span>
          )}
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

/**
 * Offline is not one situation. A silent endpoint is an outage; an answer
 * with nothing in it is an absence. Saying which costs a word and saves
 * the reader guessing.
 */
export function OfflinePill({ reason }: { reason?: FeedReason }) {
  const text =
    reason === "empty" ? "no data yet" : reason ? "no response" : "feed offline";
  return (
    <span className="inline-flex items-center gap-2 border border-[color:var(--color-border)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
      <span className="h-1.5 w-1.5 bg-[color:var(--color-dim)]" />
      {text}
    </span>
  );
}

export function LivePill({
  live,
  reason,
}: {
  live: boolean;
  reason?: FeedReason;
}) {
  if (!live) return <OfflinePill reason={reason} />;
  return (
    <span className="inline-flex items-center gap-2 border border-[color:var(--color-accent)]/40 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-accent)]">
      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]" />
      live
    </span>
  );
}

/**
 * When a panel last managed to refresh, and from where.
 *
 * Built from the same label tokens the metrics captions use — same size,
 * tracking and muted colour — so it reads as part of the existing chrome
 * rather than as something bolted on.
 */
export function FeedMeta({
  updatedAt,
  source,
  fellBack,
  stale,
  className = "",
}: {
  updatedAt: number | null;
  source?: string | null;
  fellBack?: boolean;
  stale?: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ago =
    updatedAt === null
      ? DASH
      : (() => {
          const s = Math.max(0, Math.floor((now - updatedAt) / 1000));
          if (s < 1) return "just now";
          if (s < 60) return `${s}s ago`;
          if (s < 3600) return `${Math.floor(s / 60)}m ago`;
          return `${Math.floor(s / 3600)}h ago`;
        })();

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)] ${className}`}
    >
      <span>updated {ago}</span>
      {source && <span>via {source}</span>}
      {fellBack && (
        <span className="text-[color:var(--color-fg)]/70">
          primary unreachable
        </span>
      )}
      {stale && (
        <span className="text-[color:var(--color-fg)]/70">cached</span>
      )}
    </div>
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
