import Link from "next/link";
import { CHAIN, GITHUB_URL, X_HANDLE, BLOCKSCOUT } from "@/lib/config";

const cols: Array<{ head: string; items: Array<{ label: string; href: string; ext?: boolean }> }> = [
  {
    head: "Product",
    items: [
      { label: "Dashboard", href: "/app" },
      { label: "Just deployed", href: "/new" },
      { label: "Check a token", href: "/scan" },
      { label: "Blocks", href: "/blocks" },
      { label: "Gas", href: "/gas" },
      { label: "Stocks", href: "/stocks" },
      { label: "Search", href: "/#search" },
    ],
  },
  {
    head: "Data",
    items: [
      { label: "API docs", href: "/docs" },
      { label: "Upstream status", href: "/status" },
      // The RPC endpoint accepts POST only — linking it straight from the
      // footer just hands the visitor a parse error. Point at the docs page,
      // which shows the URL as copyable code instead.
      { label: "RPC endpoint", href: "/docs" },
      { label: "Blockscout explorer", href: BLOCKSCOUT, ext: true },
    ],
  },
  {
    head: "About",
    items: [
      { label: "About PYLON", href: "/about" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "GitHub", href: GITHUB_URL, ext: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[color:var(--color-border)]">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="h-display text-[15px] text-[color:var(--color-fg)]">
              PYLON
            </div>
            <p className="mt-2 max-w-[26ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              Every block on {CHAIN.name}, as it lands.
            </p>
            <p className="mt-3 text-[11px] text-[color:var(--color-dim)]">
              chain id {CHAIN.id} · {CHAIN.stack}
            </p>
          </div>

          {cols.map((c) => (
            <div key={c.head}>
              <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-accent)]">
                {c.head}
              </div>
              <ul className="space-y-2">
                {c.items.map((it) => (
                  <li key={it.label}>
                    {it.ext ? (
                      <a
                        href={it.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-[color:var(--color-dim)] hover:text-[color:var(--color-fg)]"
                      >
                        {it.label} ↗
                      </a>
                    ) : (
                      <Link
                        href={it.href}
                        className="text-[12px] text-[color:var(--color-dim)] hover:text-[color:var(--color-fg)]"
                      >
                        {it.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-[color:var(--color-border)] pt-6">
          <p className="max-w-3xl text-[11px] leading-relaxed text-[color:var(--color-dim)]">
            PYLON is an independent, open block explorer. It is not affiliated
            with, endorsed by, or connected to Robinhood Markets, Inc. or any of
            its subsidiaries. All data is read from public endpoints and
            presented as-is, with no warranty of accuracy or availability.
            Nothing on this site is financial advice.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-[color:var(--color-dim)]">
              © 2026 PYLON
            </span>
            <div className="flex items-center gap-4">
              {/* TODO: replace X_HANDLE in lib/config.ts with the real handle */}
              <a
                href={X_HANDLE}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[color:var(--color-dim)] hover:text-[color:var(--color-accent)]"
              >
                X ↗
              </a>
              {/* TODO: replace GITHUB_URL in lib/config.ts with the real repo */}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[color:var(--color-dim)] hover:text-[color:var(--color-accent)]"
              >
                GitHub ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
