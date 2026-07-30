import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ScanPanel } from "@/components/scan-panel";
import { WMerkleTree } from "@/components/w-merkle-tree";
import { REGISTRY_URL } from "@/lib/canonical";
import { CHAIN, BLOCKSCOUT } from "@/lib/config";

export const metadata: Metadata = {
  title: "Check a token",
  description:
    "Paste a contract address on Robinhood Chain and see what is actually established about it — age, deployer, holders, verified source, and the functions its code exposes. No safety score.",
};

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string }>;
}) {
  const { address } = await searchParams;

  return (
    <PageShell
      title="Check a token"
      lede={`Paste a contract address on ${CHAIN.name}. PYLON reads what the public sources say about it — who deployed it, when, whether the source is verified, what the code can do, and how concentrated the holdings are — and prints each answer next to where it came from.`}
      aside={<WMerkleTree />}
    >
      <ScanPanel initial={address ?? ""} />

      <section>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              There is no verdict here
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              This page will never tell you a contract is safe. A checker that
              prints a green tick is making a promise it cannot keep, and the
              tokens worth worrying about are the ones built to earn that tick.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              What it does instead is show the facts a source actually
              published, name the source, and list plainly what it could not
              establish and why. A mint function is reported as present because
              it is in the ABI — not scored, not weighted, not folded into a
              number out of ten.
            </p>
          </div>

          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              The impostor check
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Robinhood publishes the contract address of every Stock Token it
              issues, and states that a token with a matching name or ticker at
              any other address is not one of theirs. This page reads that
              published list and compares.
            </p>
            <p className="mt-3 break-all text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              List:{" "}
              <span className="text-[color:var(--color-fg)]">
                {REGISTRY_URL}
              </span>
              , the same source that fills the table at{" "}
              <a
                href="https://docs.robinhood.com/chain/contracts/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                docs.robinhood.com/chain/contracts ↗
              </a>
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              If that list does not answer, no comparison is made and the panel
              says so. PYLON never guesses at identity.
            </p>
          </div>

          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Proxies are read through
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Most tokens on this chain sit behind a proxy, whose own ABI
              describes forwarding and nothing else. Reading the functions off
              it would report that a token can do nothing while everything it
              can do sits one hop away. The implementation&rsquo;s ABI is read
              instead, and the address it was read from is printed.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              A proxy also means the code can be replaced later. That is stated
              on its own, because no function in the implementation reveals it.
            </p>
          </div>

          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Liquidity is asked for, not guessed
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Nothing publishes a list of pools for a token, so the Uniswap V3
              factory on {CHAIN.name} is asked directly — this token against
              USDG and against WETH, at every standard fee tier. Any pool it
              names is shown with the balances that pool actually holds, read
              with balanceOf. No dollar figure is derived from them.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Finding none is a result, not a blank. Robinhood&rsquo;s own
              stock tokens have no pool, because they do not trade on a DEX. A
              token that presents itself as tradeable and has none is telling
              you something.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Sources:{" "}
              <a
                href={BLOCKSCOUT}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                the chain explorer ↗
              </a>{" "}
              for address, token, holder and verification records, and the
              registry above for identity. See{" "}
              <Link
                href="/status"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                upstream status
              </Link>{" "}
              if a scan comes back mostly empty.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
