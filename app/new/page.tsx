import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { NewContracts } from "@/components/new-contracts";
import { SiblingLinks } from "@/components/sibling-links";
import { WBlockCore } from "@/components/w-block-core";
import { CHAIN, BLOCKSCOUT } from "@/lib/config";

export const metadata: Metadata = {
  title: "Just deployed",
  description:
    "Contracts recently deployed on Robinhood Chain — address, deployment time, deployer, and a link straight into the token checker.",
};

export default function NewPage() {
  return (
    <PageShell
      title="Just deployed"
      lede={`What has recently appeared on ${CHAIN.name}, newest first. Each row links straight into the checker, because the moment a contract is worth looking at is the moment it turns up.`}
      aside={<WBlockCore />}
    >
      <NewContracts />

      <SiblingLinks current="new" />

      <section>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              What this list can and cannot see
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              The explorer publishes no feed of contract creations ordered by
              time. What it does publish is the contracts whose source it has
              verified, newest first, and that is what this reads. For each
              one, the deployment time and the deployer are then taken from
              that contract&rsquo;s own creating transaction, so the times in
              the table are deployment times and not indexing times.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              The consequence is worth stating plainly: a contract deployed
              without published source never appears here at all. This is not
              a complete record of what was deployed — it is a complete record
              of what was deployed <em className="not-italic text-[color:var(--color-fg)]">and verified</em>.
              A quiet hour on this page does not mean a quiet hour on the
              chain.
            </p>
          </div>

          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Being here means nothing
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Appearing in this table is not a listing, a recommendation, or a
              sign that anyone has looked at the contract. Most of what lands
              on a young chain is launcher output, deployed in batches by a
              factory, and PYLON has no opinion about any of it.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Use the{" "}
              <Link
                href="/scan"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                checker
              </Link>{" "}
              on anything that interests you. It will show you the deployer,
              the holder concentration and what the code can do — and it will
              not tell you the contract is safe, because nothing here can.
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              Source:{" "}
              <a
                href={BLOCKSCOUT}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                the chain explorer ↗
              </a>
              . Verification records are indexer-only, so this feed has no
              second source — a bare node does not know which contracts have
              published source.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
