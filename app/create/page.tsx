import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { CreateForm } from "@/components/create-form";
import { WPylonMast } from "@/components/w-pylon-mast";
import { PROTOCOL_FEE_ETH, DRAW_ADDRESS } from "@/lib/draw";

export const metadata: Metadata = {
  title: "Commit a list",
  description:
    "Build the Merkle root for a giveaway in your own browser and get the exact call to make. No wallet connection, and the list never leaves the page.",
};

export default function CreatePage() {
  return (
    <PageShell
      title="Commit a list"
      lede="Paste the entrants, set the terms, and take away a root and a transaction to send. The list is hashed in this tab and never uploaded — this page has no server to upload it to."
      aside={<WPylonMast />}
    >
      <CreateForm />

      <section>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-3">
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <div className="text-[11px] text-[color:var(--color-accent)]">[01]</div>
            <h2 className="h-display mt-2 text-[13px] text-[color:var(--color-fg)]">
              Publish the list first
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              In the order shown, unchanged. Entrant number seven is bound to
              position seven; reorder the file later and nobody can rebuild
              the root. Download it here and put it somewhere durable, then
              name that location in the form.
            </p>
          </div>
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <div className="text-[11px] text-[color:var(--color-accent)]">[02]</div>
            <h2 className="h-display mt-2 text-[13px] text-[color:var(--color-fg)]">
              Send the transaction yourself
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Copy the calldata into whatever you already use — your wallet,
              the explorer&rsquo;s write tab, a script. It carries{" "}
              <span className="text-[color:var(--color-fg)]">
                {PROTOCOL_FEE_ETH} ETH
              </span>
              {DRAW_ADDRESS ? " to the contract." : " to the contract once one is deployed."}
            </p>
          </div>
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <div className="text-[11px] text-[color:var(--color-accent)]">[03]</div>
            <h2 className="h-display mt-2 text-[13px] text-[color:var(--color-fg)]">
              Then wait, and let anyone run it
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              After the time you set, anybody can trigger the draw — you do
              not have to be there and cannot prevent it. It appears on{" "}
              <Link
                href="/draws"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                the ledger
              </Link>{" "}
              the moment it is created.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 sm:p-6">
          <h2 className="h-display text-[13px] text-[color:var(--color-fg)]">
            Decide these before you commit, not after
          </h2>
          <ul className="mt-3 max-w-[76ch] space-y-2 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            <li>
              <span className="text-[color:var(--color-fg)]">
                Repeated addresses stay.
              </span>{" "}
              Each occupies a position and carries its own chance. Weighting
              entries by listing someone twice is a legitimate design — it is
              simply not reversible once the root is on chain.
            </li>
            <li>
              <span className="text-[color:var(--color-fg)]">
                The count is a promise you are making.
              </span>{" "}
              Nothing on chain can check how many leaves a root has. Declare
              more than you committed and the extra positions can win, with no
              proof for anyone to produce — which is visible to everybody the
              moment somebody looks.
            </li>
            <li>
              <span className="text-[color:var(--color-fg)]">
                The draw time is a floor, not a schedule.
              </span>{" "}
              Nothing runs the draw automatically. It happens when someone
              calls it, which can be you, a winner, or a stranger.
            </li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
