import type { Metadata } from "next";
import { GasChart } from "@/components/gas-chart";
import { PageShell } from "@/components/page-shell";
import { WGasScope } from "@/components/w-gas-scope";
import { SiblingLinks } from "@/components/sibling-links";
import { CHAIN } from "@/lib/config";

export const metadata: Metadata = {
  title: "Gas",
  description:
    "Base fee per gas on Robinhood Chain, sampled across recent blocks and plotted as a live series.",
};

export default function GasPage() {
  return (
    <PageShell
      index="03"
      title="Gas"
      lede={`Base fee per gas across recent blocks on ${CHAIN.name}. Sampled every fourth block so the window covers a meaningful stretch of chain history rather than a single second.`}
      aside={<WGasScope />}
    >
      <GasChart />

      <SiblingLinks current="gas" />

      <section>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Reading the chart
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              The vertical axis is auto-scaled to the visible window with a
              small pad on each side. {CHAIN.name} runs cheap and steady, so
              without that pad a healthy series would render as a flat line
              pinned to the top of the box. The shape you see is real movement
              inside a narrow band, not amplified noise.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Hover any point to pin the readout row above the chart to that
              block.
            </p>
          </div>
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Why base fee and not gas price
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Base fee is the protocol-set floor burned by every transaction in
              a block, so it is the honest measure of what the chain charges.
              The <span className="text-[color:var(--color-fg)]">eth_gasPrice</span>{" "}
              figure shown in the header is a node-side suggestion that includes
              a priority tip, which makes it useful for submitting a transaction
              but noisier as a chart.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
