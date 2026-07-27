import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, Prose } from "@/components/page-shell";
import { WPylonMast } from "@/components/w-pylon-mast";
import { CHAIN, RPC_URL, BLOCKSCOUT } from "@/lib/config";

export const metadata: Metadata = {
  title: "About",
  description:
    "What PYLON is, where its data comes from, and its relationship to Robinhood Markets, Inc. — none.",
};

export default function AboutPage() {
  return (
    <PageShell
      index="06"
      title="About"
      lede={`PYLON is a public, read-only dashboard for ${CHAIN.name}. It exists because watching a chain should not require an account.`}
      aside={<WPylonMast />}
    >
      <section>
        <Prose>
          <h2>What it does</h2>
          <p>
            PYLON reads {CHAIN.name} — an {CHAIN.stack} L2 running as chain id{" "}
            {CHAIN.id} — and renders what it finds. Blocks as they seal. The
            base fee trend across a rolling window. The ERC-20 equity tokens
            issued on the chain. A search box that resolves a block number, a
            transaction hash, or an address against the node directly.
          </p>
          <p>
            That is the entire product. There is no account, no wallet
            connection, no signing prompt, no newsletter, and no analytics
            script watching you read this sentence.
          </p>

          <h2>Where the numbers come from</h2>
          <p>
            Two public endpoints, both free and both unauthenticated:
          </p>
          <p>
            <strong>JSON-RPC</strong> —{" "}
            <a href={RPC_URL} target="_blank" rel="noopener noreferrer">
              {RPC_URL}
            </a>
            . Supplies block height, block contents, gas price, base fee,
            balances, transaction receipts, and contract code. Everything on the
            blocks page, the gas page, and the search results comes from here.
          </p>
          <p>
            <strong>Blockscout</strong> —{" "}
            <a href={BLOCKSCOUT} target="_blank" rel="noopener noreferrer">
              {BLOCKSCOUT}
            </a>
            . Supplies chain-wide aggregates and token metadata: total
            transactions, total addresses, token prices, holder counts, 24h
            volume, and issuer logos.
          </p>
          <p>
            Calls are made server-side through Next.js route handlers, cached
            for a few seconds, and re-polled by the browser on an interval. You
            can call those same handlers yourself — see the{" "}
            <Link href="/docs">API documentation</Link>.
          </p>

          <h2>The rule this site is built on</h2>
          <p>
            Every figure rendered here is fetched at request time from a
            source named above. Nothing is estimated, extrapolated, simulated,
            or hardcoded. When a feed fails, the panel shows{" "}
            <strong>—</strong> and a <strong>feed offline</strong> pill rather
            than a plausible-looking placeholder.
          </p>
          <p>
            One consequence worth stating plainly: the tokenized equities cards
            carry no daily percentage change. The upstream endpoint publishes a
            current rate but no prior close, and manufacturing a delta from two
            page loads would produce a confident-looking number that means
            nothing. Holders and 24h volume are shown instead, because those are
            actually reported.
          </p>

          <h2>Not affiliated with Robinhood Markets, Inc.</h2>
          <p>
            PYLON is an independent project with no relationship to Robinhood
            Markets, Inc., Robinhood Crypto, LLC, or any of their subsidiaries
            or affiliates. It is not endorsed by, sponsored by, or operated in
            partnership with any of them.
          </p>
          <p>
            &ldquo;{CHAIN.name}&rdquo; is used here strictly as the name of a
            public blockchain network. Token names, ticker symbols, and logos
            shown on the equities pages are metadata published on-chain by the
            token issuer and are reproduced without modification for
            identification purposes.
          </p>
          <p>
            Nothing on this site is financial advice, investment advice, an
            offer, or a solicitation to buy or sell anything. The data is
            provided as-is with no warranty of accuracy, completeness, or
            availability. Verify anything that matters against the chain
            yourself.
          </p>
        </Prose>
      </section>
    </PageShell>
  );
}
