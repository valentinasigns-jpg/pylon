"use client";

import Link from "next/link";
import { usePoll } from "@/lib/use-poll";
import { num, DASH } from "@/lib/format";
import { CHAIN } from "@/lib/config";
import { DRAW_REPO } from "@/lib/draw";
import { LivePill } from "./primitives";
import { ChainForm } from "./chain-form";
import { Metric } from "./metric";

type ChainFeed = { ok: boolean; height: number | null };

/**
 * The first screen.
 *
 * The chain readings that used to be the whole product are now a sign of
 * life: the pill and the height say the protocol sits on a chain that is
 * moving. They are not the point any more, so they are small.
 */
export function ProtocolHero() {
  const { data, live, reason } = usePoll<ChainFeed>("/api/chain");

  return (
    <section className="relative overflow-hidden border-b border-[color:var(--color-border)]">
      <div aria-hidden className="hero-glow absolute inset-0" />
      <div aria-hidden className="hero-scan absolute inset-0" />
      <div aria-hidden className="sweep absolute inset-0" />

      <div className="relative mx-auto max-w-[1400px] px-4 pb-12 pt-10 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <LivePill live={live} reason={reason} />
              <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                {CHAIN.name} · chain id {CHAIN.id}
              </span>
              <span className="inline-flex items-baseline gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                block
                <Metric
                  value={data?.height ?? null}
                  format={(n) => num(n === null ? null : Math.round(n))}
                  size="sm"
                  className="text-[color:var(--color-fg)]"
                />
              </span>
            </div>

            <h1 className="h-display mt-5 text-4xl leading-[1.03] text-[color:var(--color-fg)] sm:text-5xl lg:text-[3.5rem]">
              Prove the draw{" "}
              <span className="text-[color:var(--color-accent)]">
                wasn&rsquo;t rigged.
              </span>
            </h1>

            <p className="mt-4 max-w-[60ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Commit to a list of entrants before the randomness exists. Draw
              from it with an oracle neither you nor anyone else controls.
              Anyone can then rerun the selection on their own machine and get
              the same winners — or catch you if they do not.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/docs"
                className="border border-[color:var(--color-accent)]/50 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] transition-colors hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-bg)]"
              >
                read the docs
              </Link>
              <a
                href={DRAW_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-[color:var(--color-border)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-dim)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
              >
                view on github ↗
              </a>
            </div>
          </div>

          {/* the surface stays — same canvas, same chain readings driving it */}
          <div className="relative order-first lg:order-none lg:pt-1">
            <div className="relative aspect-square w-full max-w-[520px] lg:mx-auto">
              <ChainForm />
              <span aria-hidden className="absolute left-0 top-0 h-3 w-3 border-l border-t border-[color:var(--color-accent)]/45" />
              <span aria-hidden className="absolute right-0 top-0 h-3 w-3 border-r border-t border-[color:var(--color-accent)]/45" />
              <span aria-hidden className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-[color:var(--color-accent)]/45" />
              <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-[color:var(--color-accent)]/45" />
              <span className="absolute left-0 top-0 -translate-y-5 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-dim)]">
                surface · live
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
