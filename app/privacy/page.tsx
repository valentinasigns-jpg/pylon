import type { Metadata } from "next";
import { PageShell, Prose } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "PYLON collects no personal data, sets no cookies, and runs no analytics.",
};

export default function PrivacyPage() {
  return (
    <PageShell
      title="Privacy"
      lede="Short version: PYLON collects nothing about you, because it has nothing to collect it with."
    >
      <section>
        <Prose>
          <h2>What is not collected</h2>
          <p>
            There are no accounts, so no names, emails, or passwords. There is
            no wallet connection, so no addresses are associated with you. There
            is no analytics script, no tag manager, no session recorder, no
            advertising pixel, and no third-party embed that could set one.
          </p>
          <p>
            No cookies are set by this site. Nothing is written to local storage
            or session storage.
          </p>

          <h2>What necessarily happens anyway</h2>
          <p>
            The site is served from Vercel. Like any web host, Vercel processes
            request metadata — IP address, user agent, requested path,
            timestamp — in order to deliver the page and to protect the
            infrastructure. PYLON does not add to, query, or export those logs.
            Vercel&apos;s own data practices govern that layer.
          </p>
          <p>
            Data requests are proxied through this site&apos;s own route
            handlers, which means your browser does not connect to the upstream
            RPC or explorer directly and those services do not see your IP.
          </p>
          <p>
            Token issuer logos on the equities pages are loaded from the
            issuer&apos;s CDN, so that host does receive a request from your
            browser for the image itself.
          </p>

          <h2>Changes</h2>
          <p>
            If this ever changes — if an analytics tool or any form of tracking
            is added — this page will be updated to say so before it ships.
          </p>
        </Prose>
      </section>
    </PageShell>
  );
}
