import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { DrawDetail } from "@/components/draw-detail";
import { WProofPath } from "@/components/w-proof-path";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Draw #${id}`,
    description: `What was committed, what the oracle returned, and a way to recompute the winners yourself — draw #${id} on PylonDraw.`,
  };
}

export default async function DrawPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const n = Number(id);

  if (!Number.isInteger(n) || n < 1) {
    return (
      <PageShell title="Draw" lede="Draw numbers start at one.">
        <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 sm:p-6">
          <p className="text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            <span className="text-[color:var(--color-fg)]">{id}</span> is not a
            draw number.{" "}
            <Link
              href="/draws"
              className="text-[color:var(--color-accent)] hover:underline"
            >
              Every draw is listed here
            </Link>
            .
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`Draw #${n}`}
      lede="What was fixed before the randomness existed, what came back, and everything you need to recompute the result without believing a word of this page."
      aside={<WProofPath />}
    >
      <DrawDetail id={n} />

      <section>
        <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 sm:p-6">
          <h2 className="h-display text-[13px] text-[color:var(--color-fg)]">
            What a match above does and does not settle
          </h2>
          <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            If the root you compute matches the root on chain, the list you
            were given is the list that was committed to — nobody added a name
            or removed one after the fact. If the winners match, the selection
            follows from a random value the organiser did not choose.
          </p>
          <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            What neither check can tell you is whether the right people were
            in the list to begin with. That judgement stays with you, and no
            amount of cryptography moves it.
          </p>
          <p className="mt-3">
            <Link
              href="/draws"
              className="text-[12px] uppercase tracking-[0.14em] text-[color:var(--color-accent)] hover:underline"
            >
              ← every draw
            </Link>
          </p>
        </div>
      </section>
    </PageShell>
  );
}
