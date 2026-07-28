import type { Metadata } from "next";
import { PageShell, Prose } from "@/components/page-shell";
import { CHAIN } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms of use for PYLON — an informational, read-only block explorer provided as-is.",
};

export default function TermsPage() {
  return (
    <PageShell
      title="Terms"
      lede="PYLON is an informational tool provided as-is. Reading it is the whole agreement."
    >
      <section>
        <Prose>
          <h2>Use of the site</h2>
          <p>
            PYLON is free to use, requires no account, and imposes no usage
            terms beyond not attacking it. Automated access to the JSON
            endpoints is permitted; sustained abusive load may be rate-limited
            or blocked at the infrastructure layer.
          </p>

          <h2>No warranty</h2>
          <p>
            The data displayed is read from third-party public endpoints and is
            provided <strong>as-is</strong>, without warranty of any kind,
            express or implied, including accuracy, completeness, timeliness, or
            availability. Upstream services can return stale, partial, or
            incorrect data, and can go down without notice. Verify anything that
            matters against the chain directly.
          </p>

          <h2>Not financial advice</h2>
          <p>
            Nothing on this site is financial, investment, legal, or tax advice.
            Nothing here is an offer, solicitation, or recommendation to buy,
            sell, or hold any asset, token, or security. Prices shown for
            tokenized equities describe on-chain ERC-20 contracts and should not
            be read as quotes for the underlying securities.
          </p>

          <h2>No affiliation</h2>
          <p>
            PYLON is independent and unaffiliated with Robinhood Markets, Inc.,
            Robinhood Crypto, LLC, or their subsidiaries and affiliates.
            &ldquo;{CHAIN.name}&rdquo; refers to the public network only.
            Third-party names, marks, and logos are the property of their
            respective owners and appear for identification only.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, the operators of PYLON are
            not liable for any loss or damage arising from use of, or reliance
            on, this site or its data — including trading losses, missed
            opportunities, or decisions made on the basis of a figure displayed
            here.
          </p>

          <h2>Changes</h2>
          <p>
            These terms may be updated. Continued use after a change constitutes
            acceptance of the updated version.
          </p>
        </Prose>
      </section>
    </PageShell>
  );
}
