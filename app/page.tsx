import Link from "next/link";
import { Hero } from "@/components/hero";
import { LiveBlocks } from "@/components/live-blocks";
import { GasChart } from "@/components/gas-chart";
import { StocksGrid } from "@/components/stocks-grid";
import { SearchPanel } from "@/components/search-panel";
import { Gauges } from "@/components/gauges";
import { Endpoint } from "@/components/endpoint";
import { SectionHead } from "@/components/primitives";
import { CHAIN, RPC_URL, BLOCKSCOUT } from "@/lib/config";

export default function Home() {
  return (
    <main>
      <Hero />

      <div className="mx-auto max-w-[1400px] space-y-14 px-4 py-14 sm:px-6">
        {/* network gauges */}
        <section id="network" className="scroll-mt-20">
          <SectionHead
            index="01"
            title="Network"
            sub="Instantaneous readings from the head of the chain. Every gauge states the range it is scaled against — none of them are normalised to look busy."
          />
          <Gauges />
        </section>

        <LiveBlocks limit={15} />
        <GasChart />
        <StocksGrid />
        <SearchPanel />

        {/* about */}
        <section id="about" className="scroll-mt-20">
          <SectionHead
            index="06"
            title="About"
            sub="What this is, and where the numbers come from."
          />

          <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
            <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
              <h3 className="h-display text-[13px] text-[color:var(--color-accent)]">
                What PYLON is
              </h3>
              <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                A read-only view of {CHAIN.name}, an {CHAIN.stack} L2 running as
                chain id {CHAIN.id}. It shows blocks as they seal, the base fee
                trend, and the tokenized equities issued on the chain. There is
                no account, no wallet connection, and nothing to sign. Every
                request is a plain GET against a public endpoint.
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                If a feed stops responding, the affected panel shows{" "}
                <span className="text-[color:var(--color-fg)]">—</span> and a{" "}
                <span className="text-[color:var(--color-fg)]">feed offline</span>{" "}
                pill. Nothing is cached long enough to go stale silently, and no
                figure on this site is estimated, simulated, or filled in.
              </p>
            </div>

            <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
              <h3 className="h-display text-[13px] text-[color:var(--color-accent)]">
                Data sources
              </h3>
              <dl className="mt-3 space-y-3">
                <div>
                  <dt className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
                    Blocks, gas, search
                  </dt>
                  <dd>
                    <Endpoint url={RPC_URL} method="POST" />
                  </dd>
                </div>
                <div>
                  <dt className="mb-1.5 text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
                    Aggregates, tokens
                  </dt>
                  <dd className="break-all text-[12px] text-[color:var(--color-fg)]">
                    <a
                      href={BLOCKSCOUT}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[color:var(--color-accent)]"
                    >
                      {BLOCKSCOUT} ↗
                    </a>
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
                Read the{" "}
                <Link href="/docs" className="text-[color:var(--color-accent)] hover:underline">
                  API documentation
                </Link>{" "}
                to call the same endpoints this page uses.
              </p>
            </div>

            <div className="bg-[color:var(--color-surface)] p-5 sm:p-6 lg:col-span-2">
              <h3 className="h-display text-[13px] text-[color:var(--color-fg)]">
                Not affiliated with Robinhood Markets, Inc.
              </h3>
              <p className="mt-3 max-w-4xl text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                PYLON is an independent project. It is not affiliated with,
                endorsed by, sponsored by, or connected to Robinhood Markets,
                Inc., Robinhood Crypto, or any of their subsidiaries. The name{" "}
                &ldquo;{CHAIN.name}&rdquo; refers to the public blockchain
                network only. Token names and logos shown in the equities
                section are metadata published on-chain by the token issuer and
                are reproduced as-is. Nothing on this site is financial advice,
                an offer, or a solicitation.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
