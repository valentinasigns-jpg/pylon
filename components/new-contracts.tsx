"use client";

import Link from "next/link";
import { usePoll } from "@/lib/use-poll";
import { truncMid, DASH } from "@/lib/format";
import { BLOCKSCOUT } from "@/lib/config";
import { LivePill, SectionHead, Skeleton, FeedMeta } from "./primitives";

type NewContract = {
  address: string;
  name: string | null;
  tokenSymbol: string | null;
  verifiedAt: string | null;
  deployedAt: string | null;
  blockNumber: number | null;
  deployer: string | null;
  language: string | null;
  isScam: boolean | null;
  proxyType: string | null;
};
type Feed = { ok: boolean; contracts: NewContract[] };

function since(iso: string | null, now: number): string {
  if (!iso) return DASH;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return DASH;
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NewContracts() {
  const { data, live, loading, updatedAt, reason, source, stale } =
    usePoll<Feed>("/api/new", 30000);
  const rows = data?.contracts ?? [];
  const now = Date.now();

  return (
    <section id="new" className="scroll-mt-20">
      <SectionHead
        title="Just deployed"
        sub="Recently verified contracts, ordered by when they were actually deployed. The time and the deployer come from each contract's own creating transaction, not from when the explorer got around to indexing it."
        right={<LivePill live={live} reason={reason} />}
      />

      <div className="overflow-x-auto border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)]">
              {["Contract", "Deployed", "Deployer", ""].map((h, i) => (
                <th
                  key={h + i}
                  className={`px-4 py-2.5 text-[11px] font-normal uppercase tracking-[0.14em] text-[color:var(--color-dim)] ${
                    i >= 3 ? "text-right" : "text-left"
                  } ${i === 1 ? "hidden sm:table-cell" : ""} ${
                    i === 2 ? "hidden lg:table-cell" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 10 }).map((_, i) => (
                <tr
                  key={i}
                  className="border-b border-[color:var(--color-border)] last:border-b-0"
                >
                  <td className="px-4 py-3" colSpan={4}>
                    <Skeleton className="h-3.5 w-full" />
                  </td>
                </tr>
              ))}

            {!loading &&
              rows.map((c) => (
                <tr
                  key={c.address}
                  className="border-b border-[color:var(--color-border)] last:border-b-0 hover:bg-[color:var(--color-raised)]"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-[13px] text-[color:var(--color-fg)]">
                        {c.name ?? "unnamed"}
                      </span>
                      {c.tokenSymbol && (
                        <span className="text-[11px] text-[color:var(--color-accent)]">
                          {c.tokenSymbol}
                        </span>
                      )}
                      {c.proxyType && (
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
                          proxy
                        </span>
                      )}
                      {c.isScam && (
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-warn)]">
                          flagged
                        </span>
                      )}
                    </div>
                    <a
                      href={`${BLOCKSCOUT}/address/${c.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[color:var(--color-dim)] hover:text-[color:var(--color-accent)]"
                    >
                      {truncMid(c.address, 10, 8)}
                    </a>
                    <div className="mt-0.5 text-[11px] text-[color:var(--color-dim)] sm:hidden">
                      {since(c.deployedAt ?? c.verifiedAt, now)}
                    </div>
                  </td>

                  <td className="hidden px-4 py-3 sm:table-cell">
                    <div className="text-[12px] text-[color:var(--color-fg)]">
                      {since(c.deployedAt, now)}
                    </div>
                    {!c.deployedAt && (
                      <div className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
                        verified {since(c.verifiedAt, now)}
                      </div>
                    )}
                  </td>

                  <td className="hidden px-4 py-3 lg:table-cell">
                    {c.deployer ? (
                      <a
                        href={`${BLOCKSCOUT}/address/${c.deployer}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-[color:var(--color-dim)] hover:text-[color:var(--color-accent)]"
                      >
                        {truncMid(c.deployer, 8, 6)}
                      </a>
                    ) : (
                      <span className="text-[12px] text-[color:var(--color-dim)]">
                        {DASH}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/scan?address=${c.address}`}
                      className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-accent)] hover:underline"
                    >
                      check
                    </Link>
                  </td>
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-[13px] text-[color:var(--color-dim)]"
                  colSpan={4}
                >
                  {DASH} the explorer returned no contracts. Nothing is shown
                  rather than something invented.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <FeedMeta
        updatedAt={updatedAt}
        source={source}
        stale={stale}
        className="mt-3"
      />
    </section>
  );
}
