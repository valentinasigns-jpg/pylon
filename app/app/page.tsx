import type { Metadata } from "next";
import { LiveBlocks } from "@/components/live-blocks";
import { GasChart } from "@/components/gas-chart";
import { StocksGrid } from "@/components/stocks-grid";
import { SearchPanel } from "@/components/search-panel";
import { Gauges } from "@/components/gauges";
import { ChainMonitor } from "@/components/chain-monitor";
import { Reveal } from "@/components/reveal";
import { PageShell } from "@/components/page-shell";
import { SectionHead } from "@/components/primitives";
import { CHAIN } from "@/lib/config";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Live blocks, base fee and tokenized equities on Robinhood Chain, read from public endpoints.",
};

export default function AppPage() {
  return (
    <PageShell
      title="Dashboard"
      lede={`Everything ${CHAIN.name} is doing right now, read from public endpoints at request time. Each panel names the source that answered it and when it last refreshed.`}
    >
      {/* network gauges + live monitor */}
      <section id="network" className="scroll-mt-20">
        <SectionHead
          index="01"
          title="Network"
          sub="Instantaneous readings from the head of the chain. Every gauge states the range it is scaled against — none of them are normalised to look busy."
        />
        {/* items-start so neither panel is stretched to the other's height —
            a stretched panel just relocates the blank space rather than
            removing it */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Gauges />
          <ChainMonitor />
        </div>
      </section>

      <Reveal delay={0}>
        <LiveBlocks limit={15} index="02" />
      </Reveal>
      <Reveal delay={40}>
        <GasChart index="03" />
      </Reveal>
      <Reveal delay={80}>
        <StocksGrid index="04" />
      </Reveal>
      <Reveal delay={120}>
        <SearchPanel index="05" />
      </Reveal>
    </PageShell>
  );
}
