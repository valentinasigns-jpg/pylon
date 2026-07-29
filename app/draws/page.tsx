import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { DrawList } from "@/components/draw-list";
import { Verifier } from "@/components/verifier";
import { WPylonMast } from "@/components/w-pylon-mast";
import { CHAIN } from "@/lib/config";

export const metadata: Metadata = {
  title: "Draws",
  description:
    "Every draw created on PylonDraw, newest first — committed, waiting on the oracle, or drawn. Read straight from the chain.",
};

export default function DrawsPage() {
  return (
    <PageShell
      title="Draws"
      lede={`Every draw anyone has created, read from ${CHAIN.name} at request time. There is no database behind this page and nothing is curated — a draw appears here because it exists, not because someone decided to show it.`}
      aside={<WPylonMast />}
    >
      <DrawList />

      <section>
        <h2 className="h-display mb-1 text-lg text-[color:var(--color-fg)] sm:text-xl">
          Check any draw without opening it
        </h2>
        <p className="mb-4 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
          The same tool that sits on every draw&rsquo;s own page, standing
          alone. Give it a list and a random value from anywhere — this one, a
          different chain, a screenshot someone sent you — and it will tell you
          who that combination selects. It never asks this site anything.
        </p>
        <Verifier />
      </section>

      <section>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Three states, and why the middle one has its own colour
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              A draw is committed, waiting on the oracle, or drawn. The middle
              state lasts a second or two and is neither a result nor a
              failure, so it is neither green nor red. Calling it either would
              be a small lie told several times a day.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              A draw stuck waiting is not lost. Anyone can call{" "}
              <span className="text-[color:var(--color-fg)]">retryDraw</span>:
              the oracle fee returns to whoever paid it and the draw goes back
              to committed, ready to run again.
            </p>
          </div>
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Everything is here, including what nobody announced
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              An organiser can create several draws and mention one. Every
              draw they created is on this list, under their address, in the
              order it happened. That is the whole defence against picking a
              favourable outcome, and it works only because nothing here is
              filtered.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Running one of your own starts at{" "}
              <Link
                href="/create"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                commit a list
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
