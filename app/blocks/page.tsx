import type { Metadata } from "next";
import { LiveBlocks } from "@/components/live-blocks";
import { PageShell } from "@/components/page-shell";
import { WBlockCore } from "@/components/w-block-core";
import { Endpoint } from "@/components/endpoint";
import { CHAIN, RPC_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Blocks",
  description:
    "Live block feed for Robinhood Chain — height, transaction count, gas used and base fee, refreshed continuously.",
};

export default function BlocksPage() {
  return (
    <PageShell
      index="02"
      title="Blocks"
      lede={`Every block sealed on ${CHAIN.name}, newest first. Each row is a direct read of eth_getBlockByNumber against the public RPC — no indexer sits in between.`}
      aside={<WBlockCore />}
    >
      <LiveBlocks limit={15} />

      <section>
        <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 sm:p-6">
          <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
            How this feed works
          </h2>
          <ul className="mt-3 max-w-[76ch] list-none space-y-2 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            <li>
              <span className="text-[color:var(--color-fg)]">Source.</span>{" "}
              A batched JSON-RPC call issued server-side, so the browser never
              talks to the node directly.
              <Endpoint url={RPC_URL} method="POST" className="mt-2 max-w-xl" />
            </li>
            <li>
              <span className="text-[color:var(--color-fg)]">Cadence.</span>{" "}
              The client polls every six seconds while the tab is visible.{" "}
              {CHAIN.name} produces blocks far faster than that, so the list
              advances in jumps rather than one row at a time — that is the
              chain being fast, not the feed dropping data.
            </li>
            <li>
              <span className="text-[color:var(--color-fg)]">Failure.</span>{" "}
              If the node stops answering, the last good rows stay on screen and
              the pill flips to{" "}
              <span className="text-[color:var(--color-fg)]">feed offline</span>.
              Nothing is invented to fill the gap.
            </li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
