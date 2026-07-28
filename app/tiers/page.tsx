import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { WPylonMast } from "@/components/w-pylon-mast";
import { ACTIVE_TIERS, PLANNED_TIERS } from "@/lib/tiers";
import { ISSUANCE_ENABLED } from "@/lib/api-keys";

export const metadata: Metadata = {
  title: "Tiers",
  description:
    "What the PYLON API allows, with and without a key. Nothing here is for sale.",
};

export default function TiersPage() {
  return (
    <PageShell
      title="Tiers"
      lede="Every endpoint answers without a key. A key raises the ceiling and identifies the caller rather than the address they happen to be behind. Nothing on this page is for sale, and nothing on this site can take a payment."
      aside={<WPylonMast />}
    >
      <section>
        <h2 className="h-display mb-3 text-[13px] text-[color:var(--color-accent)]">
          In force
        </h2>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
          {ACTIVE_TIERS.map((t) => (
            <div key={t.id} className="bg-[color:var(--color-surface)] p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="h-display text-[15px] text-[color:var(--color-fg)]">
                  {t.name}
                </h3>
                <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-accent)]">
                  active
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-[28px] leading-none text-[color:var(--color-fg)] tabular-nums">
                  {t.limit}
                </span>
                <span className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
                  requests / {t.windowMs / 1000}s
                </span>
              </div>
              <p className="mt-3 max-w-[52ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                {t.blurb}
              </p>
              <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                free
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="h-display mb-3 text-[13px] text-[color:var(--color-accent)]">
          Declared, not sold
        </h2>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
          {PLANNED_TIERS.map((t) => (
            <div key={t.id} className="bg-[color:var(--color-surface)] p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="h-display text-[15px] text-[color:var(--color-dim)]">
                  {t.name}
                </h3>
                <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                  not available
                </span>
              </div>
              <p className="mt-3 max-w-[52ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                {t.blurb}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
          These two exist so the shape of the thing is settled before anyone
          needs it. There is no checkout, no balance check, and no code path
          on this site that can put a caller on either of them. If that ever
          changes it changes in one function, and this page will say so.
        </p>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Using a key
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Send it as the{" "}
              <span className="text-[color:var(--color-fg)]">x-pylon-key</span>{" "}
              header, or as{" "}
              <span className="text-[color:var(--color-fg)]">?key=</span> on the
              query string. A key that is not recognised is treated as no key:
              the request still answers, on the tier without one, and the
              response headers say which tier served it.
            </p>
            <pre className="mt-3 overflow-x-auto border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-[11px] leading-relaxed text-[color:var(--color-fg)]">
{`x-ratelimit-tier: key
x-ratelimit-limit: 3000
x-ratelimit-remaining: 2997
x-ratelimit-reset: 1785200000`}
            </pre>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Ask{" "}
              <span className="text-[color:var(--color-fg)]">GET /api/keys</span>{" "}
              what tier you are on at any time. It answers without a key too.
            </p>
          </div>

          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Getting one
            </h2>
            {ISSUANCE_ENABLED ? (
              <>
                <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                  POST to{" "}
                  <span className="text-[color:var(--color-fg)]">/api/keys</span>{" "}
                  with no body. Nothing is asked for and nothing about you is
                  recorded — only a hash of the key, so it can be recognised
                  later and never reconstructed.
                </p>
                <pre className="mt-3 overflow-x-auto border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-[11px] text-[color:var(--color-fg)]">
{`curl -X POST https://pylon-zeta.vercel.app/api/keys`}
                </pre>
              </>
            ) : (
              <>
                <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                  Not yet. Keys are currently held in the memory of whichever
                  serverless instance minted them, so one issued today would
                  stop working the moment that container recycled — and a
                  credential that fails silently is worse than one that was
                  never offered.
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                  The issuing endpoint, the accounting and the limits are all
                  written and running; what is missing is somewhere durable to
                  keep the records. Until then every endpoint answers on the
                  tier without a key, which is enough for anything a page
                  does.
                </p>
              </>
            )}
            <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              Endpoints and response shapes are on the{" "}
              <Link
                href="/docs"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                API page
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 sm:p-6">
          <h2 className="h-display text-[13px] text-[color:var(--color-fg)]">
            What the limit actually is
          </h2>
          <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            The numbers above come from measuring what this site costs. One
            open dashboard tab spends about sixty requests a minute on its
            own — seven panels, each polling on its own clock — so the tier
            without a key is set well clear of several of them. A ceiling a
            visitor trips by using the site normally would be a bug, not a
            policy.
          </p>
          <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            Counters live in instance memory, and there is more than one
            instance. A caller spread across several of them can therefore get
            somewhat more than the stated number before anything stops, and a
            recycled instance forgets a window mid-flight. The figure above is
            the ceiling per instance, not a global guarantee, and it is written
            here rather than left for someone to discover.
          </p>
          <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            The upstream endpoints PYLON reads have limits of their own that
            nothing here can raise. When one of them refuses, the response says
            so instead of pretending otherwise — the same rule the rest of the
            site runs on.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
