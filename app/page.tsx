import Link from "next/link";
import { Hero } from "@/components/hero";
import { Endpoint } from "@/components/endpoint";
import { Reveal } from "@/components/reveal";
import { SectionHead } from "@/components/primitives";
import { CHAIN, RPC_URL, BLOCKSCOUT } from "@/lib/config";

export default function Home() {
  return (
    <main>
      <Hero />

      {/* Search now lives on the first screen, inside <Hero>. */}
      <div className="mx-auto max-w-[1400px] space-y-14 px-4 py-14 sm:px-6">
        <Reveal delay={0}>
          <section id="about" className="scroll-mt-20">
            <SectionHead
              title="What this is"
              sub="A read-only window on a public chain, and nothing else."
            />

            <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
              <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
                <h3 className="h-display text-[13px] text-[color:var(--color-accent)]">
                  Nothing here is adjusted
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                  Every figure is fetched from a public endpoint at the moment
                  you ask for it. No number on this site is estimated,
                  simulated, smoothed or filled in. When a source has nothing
                  to say, the field stays empty and the panel says why.
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                  Each panel carries the time it last refreshed and which host
                  answered it, so you never have to guess whether what you are
                  reading is current.
                </p>
              </div>

              <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
                <h3 className="h-display text-[13px] text-[color:var(--color-accent)]">
                  No account, no wallet, no tracking
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                  There is nothing to sign up for and nothing to connect. No
                  wallet prompt, no cookies, no analytics script. Requests are
                  proxied server-side, so your browser never talks to the node
                  directly and the upstreams never see your address.
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                  Read the{" "}
                  <Link
                    href="/privacy"
                    className="text-[color:var(--color-accent)] hover:underline"
                  >
                    privacy note
                  </Link>{" "}
                  if you want the long version.
                </p>
              </div>

              <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
                <h3 className="h-display text-[13px] text-[color:var(--color-accent)]">
                  Where the numbers come from
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
                  The same endpoints are open to you — see the{" "}
                  <Link
                    href="/docs"
                    className="text-[color:var(--color-accent)] hover:underline"
                  >
                    API documentation
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/status"
                    className="text-[color:var(--color-accent)] hover:underline"
                  >
                    upstream status
                  </Link>
                  .
                </p>
              </div>

              <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
                <h3 className="h-display text-[13px] text-[color:var(--color-accent)]">
                  What you can look at
                </h3>
                <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                  <li>
                    <Link
                      href="/blocks"
                      className="text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)]"
                    >
                      Blocks
                    </Link>{" "}
                    — every block as it seals, with gas and base fee.
                  </li>
                  <li>
                    <Link
                      href="/gas"
                      className="text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)]"
                    >
                      Base fee
                    </Link>{" "}
                    — what the chain charges, across a rolling window.
                  </li>
                  <li>
                    <Link
                      href="/stocks"
                      className="text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)]"
                    >
                      Equities
                    </Link>{" "}
                    — the tokenized stocks issued on the chain.
                  </li>
                  <li>
                    <Link
                      href="/scan"
                      className="text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)]"
                    >
                      Check a token
                    </Link>{" "}
                    — what a contract actually is, and whether the ticker on it
                    belongs to that address.
                  </li>
                </ul>
                <p className="mt-4 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
                  All of it on one screen in the{" "}
                  <Link
                    href="/app"
                    className="text-[color:var(--color-accent)] hover:underline"
                  >
                    dashboard
                  </Link>
                  .
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
                  section are metadata published on-chain by the token issuer
                  and are reproduced as-is. Nothing on this site is financial
                  advice, an offer, or a solicitation.
                </p>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}
