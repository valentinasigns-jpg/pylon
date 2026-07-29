"use client";

import { usePoll } from "@/lib/use-poll";
import { num, DASH } from "@/lib/format";
import { Skeleton } from "./primitives";

type Source = {
  id: string;
  label: string;
  url: string;
  status: "up" | "down" | "not-deployed";
  latencyMs: number | null;
  detail: string | null;
};

type Health = {
  ok: boolean;
  ts: number;
  region: string;
  sources: Source[];
  cacheAgeMs: Record<string, number>;
};

export function StatusBoard() {
  const { data, live, loading } = usePoll<Health>("/api/health", 15000);
  const sources = data?.sources ?? [];
  const allUp = data?.ok === true;

  return (
    <div className="space-y-6">
      {/* summary */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 border-2 p-5 sm:p-6 ${
          loading
            ? "border-[color:var(--color-border)]"
            : allUp
              ? "border-[color:var(--color-accent)]"
              : "border-[color:var(--color-warn)]"
        } bg-[color:var(--color-surface)]`}
      >
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-dim)]">
            overall
          </div>
          <div
            className={`mt-2 text-3xl uppercase tracking-tight sm:text-4xl ${
              loading
                ? "text-[color:var(--color-dim)]"
                : allUp
                  ? "text-[color:var(--color-accent)]"
                  : "text-[color:var(--color-warn)]"
            }`}
          >
            {loading
              ? "checking…"
              : allUp
                ? "all systems up"
                : "degraded"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-dim)]">
            served from
          </div>
          <div className="mt-2 text-[15px] text-[color:var(--color-fg)]">
            {data?.region ?? DASH}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
            {live ? "probe reachable" : "probe unreachable"}
          </div>
        </div>
      </div>

      {/* per-source */}
      <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)]">
        {loading &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-[color:var(--color-surface)] p-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-3 h-3 w-full max-w-md" />
            </div>
          ))}

        {sources.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-start justify-between gap-4 bg-[color:var(--color-surface)] p-5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-2 w-2 shrink-0 ${
                    s.status === "not-deployed"
                      ? "bg-[color:var(--color-wait)]"
                      : s.status === "up"
                      ? "pulse-dot rounded-full bg-[color:var(--color-accent)]"
                      : "bg-[color:var(--color-warn)]"
                  }`}
                />
                <span className="text-[15px] text-[color:var(--color-fg)]">
                  {s.label}
                </span>
                <span
                  className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                    s.status === "not-deployed"
                      ? "text-[color:var(--color-wait)]"
                      : s.status === "up"
                      ? "border-[color:var(--color-accent)]/40 text-[color:var(--color-accent)]"
                      : "border-[color:var(--color-warn)]/40 text-[color:var(--color-warn)]"
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <div className="mt-2 break-all text-[11px] text-[color:var(--color-dim)]">
                {s.url}
              </div>
              {s.detail && (
                <div className="mt-1 text-[11px] text-[color:var(--color-fg)]/70">
                  {s.detail}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                latency
              </div>
              <div className="mt-1 text-[20px] tabular-nums text-[color:var(--color-fg)]">
                {s.latencyMs != null ? `${num(s.latencyMs)}ms` : DASH}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* cache */}
      <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
          server cache
        </div>
        <p className="mt-2 max-w-[70ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
          Each dataset is held in the serving instance&apos;s memory for a few
          seconds so a burst of visitors costs one upstream call rather than
          hundreds. Ages below are for the instance that answered this request;
          an empty list simply means it started cold.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(data?.cacheAgeMs ?? {}).length === 0 ? (
            <span className="text-[12px] text-[color:var(--color-dim)]">
              {DASH} nothing cached on this instance
            </span>
          ) : (
            Object.entries(data?.cacheAgeMs ?? {}).map(([k, v]) => (
              <span
                key={k}
                className="border border-[color:var(--color-border)] px-2 py-1 text-[11px] text-[color:var(--color-fg)]"
              >
                {k}{" "}
                <span className="tabular-nums text-[color:var(--color-dim)]">
                  {(v / 1000).toFixed(1)}s
                </span>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
