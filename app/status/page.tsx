import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { StatusBoard } from "@/components/status-board";

export const metadata: Metadata = {
  title: "Status",
  description:
    "Live health of the upstreams PYLON reads: the Robinhood Chain JSON-RPC endpoint and the Blockscout explorer.",
};

export default function StatusPage() {
  return (
    <PageShell
      index="10"
      title="Status"
      lede="Every panel on this site is only as good as the two endpoints behind it. This page probes both directly, on the same request path the dashboard uses, and reports what came back."
    >
      <StatusBoard />

      <section>
        <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 sm:p-6">
          <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
            How to read this
          </h2>
          <ul className="mt-3 max-w-[76ch] space-y-2 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            <li>
              <span className="text-[color:var(--color-fg)]">Up</span> means the
              endpoint answered a real probe — the RPC returned the expected
              chain id, or Blockscout returned an indexed block count. A 200
              with the wrong payload still counts as down.
            </li>
            <li>
              <span className="text-[color:var(--color-fg)]">Latency</span> is
              measured from the serving region, not from your browser, so it
              reflects what the dashboard experiences rather than your
              connection.
            </li>
            <li>
              <span className="text-[color:var(--color-fg)]">Degraded</span>{" "}
              does not necessarily mean the site is blank. A failed refresh
              falls back to the last good reading, and panels only show{" "}
              <span className="text-[color:var(--color-fg)]">feed offline</span>{" "}
              after two consecutive misses.
            </li>
          </ul>
          <p className="mt-4 text-[12px] text-[color:var(--color-dim)]">
            The raw probe is at{" "}
            <Link href="/api/health" className="text-[color:var(--color-accent)] hover:underline">
              /api/health
            </Link>
            , documented alongside the rest on the{" "}
            <Link href="/docs" className="text-[color:var(--color-accent)] hover:underline">
              API page
            </Link>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}
