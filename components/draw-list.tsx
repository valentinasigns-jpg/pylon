"use client";

import Link from "next/link";
import { usePoll } from "@/lib/use-poll";
import { num, truncMid, DASH } from "@/lib/format";
import { BLOCKSCOUT } from "@/lib/config";
import { LivePill, SectionHead, Skeleton, FeedMeta } from "./primitives";

type Draw = {
  id: number;
  organiser: string;
  entrantsRoot: string;
  entrantCount: number;
  winnerCount: number;
  drawAt: number;
  status: number;
};
type Feed = {
  ok: boolean;
  reason: "unreachable" | "empty" | "not-deployed" | null;
  error?: string;
  draws: Draw[];
};

/**
 * Three states worth telling apart, and the palette already had two of
 * them. Waiting on the oracle is the third: it is not finished and it has
 * not failed, and calling it either would be a small lie told several times
 * a day.
 */
function StatusTag({ status, drawAt }: { status: number; drawAt: number }) {
  const now = Math.floor(Date.now() / 1000);
  if (status === 3) {
    return (
      <span className="text-[10px] uppercase tracking-[0.13em] text-[color:var(--color-accent)]">
        drawn
      </span>
    );
  }
  if (status === 2) {
    return (
      <span className="text-[10px] uppercase tracking-[0.13em] text-[color:var(--color-wait)]">
        waiting on the oracle
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
      {now >= drawAt ? "ready to draw" : "committed"}
    </span>
  );
}

function when(ts: number): string {
  const now = Math.floor(Date.now() / 1000);
  const d = Math.abs(ts - now);
  const unit =
    d < 60
      ? `${d}s`
      : d < 3600
        ? `${Math.floor(d / 60)}m`
        : d < 86400
          ? `${Math.floor(d / 3600)}h`
          : `${Math.floor(d / 86400)}d`;
  return ts > now ? `in ${unit}` : `${unit} ago`;
}

export function DrawList() {
  const { data, live, loading, updatedAt, reason, source, stale } =
    usePoll<Feed>("/api/draws", 12000);
  const draws = data?.draws ?? [];
  const notDeployed = data?.reason === "not-deployed";

  return (
    <section id="draws" className="scroll-mt-20">
      <SectionHead
        title="Every draw"
        sub="Newest first. Every draw an organiser created, whether or not they mentioned it afterwards."
        right={notDeployed ? undefined : <LivePill live={live} reason={reason} />}
      />

      {notDeployed ? (
        <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 sm:p-6">
          <div className="h-display text-[13px] text-[color:var(--color-wait)]">
            Nothing to list — the contract is not deployed
          </div>
          <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            {data?.error}
          </p>
          <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            This page reads draws straight from the chain. There is no
            database behind it and no seed data, so with no contract there is
            genuinely nothing to show — and inventing a few to fill the space
            would make every other number on this site worth less.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)]">
                {["Draw", "Entrants", "Winners", "When", ""].map((h, i) => (
                  <th
                    key={h + i}
                    className={`px-4 py-2.5 text-[11px] font-normal uppercase tracking-[0.14em] text-[color:var(--color-dim)] ${
                      i === 0 ? "text-left" : "text-right"
                    } ${i === 1 || i === 2 ? "hidden sm:table-cell" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[color:var(--color-border)]">
                    <td className="px-4 py-3" colSpan={5}>
                      <Skeleton className="h-3.5 w-full" />
                    </td>
                  </tr>
                ))}

              {!loading &&
                draws.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-[color:var(--color-border)] last:border-b-0 hover:bg-[color:var(--color-raised)]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <Link
                          href={`/draws/${d.id}`}
                          className="text-[13px] text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)]"
                        >
                          #{d.id}
                        </Link>
                        <StatusTag status={d.status} drawAt={d.drawAt} />
                      </div>
                      <a
                        href={`${BLOCKSCOUT}/address/${d.organiser}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[color:var(--color-dim)] hover:text-[color:var(--color-accent)]"
                      >
                        by {truncMid(d.organiser, 8, 6)}
                      </a>
                    </td>
                    <td className="hidden px-4 py-3 text-right text-[12px] text-[color:var(--color-fg)] sm:table-cell">
                      {num(d.entrantCount)}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-[12px] text-[color:var(--color-fg)] sm:table-cell">
                      {num(d.winnerCount)}
                    </td>
                    <td className="px-4 py-3 text-right text-[12px] text-[color:var(--color-dim)]">
                      {when(d.drawAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/draws/${d.id}`}
                        className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-accent)] hover:underline"
                      >
                        open
                      </Link>
                    </td>
                  </tr>
                ))}

              {!loading && draws.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-6 text-[13px] text-[color:var(--color-dim)]"
                    colSpan={5}
                  >
                    {DASH} no draws yet. Nothing is shown rather than something
                    invented.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!notDeployed && (
        <FeedMeta
          updatedAt={updatedAt}
          source={source}
          stale={stale}
          className="mt-3"
        />
      )}
    </section>
  );
}
