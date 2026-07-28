import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { WPylonMast } from "@/components/w-pylon-mast";
import { Endpoint } from "@/components/endpoint";
import { RPC_URL, BLOCKSCOUT, CHAIN } from "@/lib/config";

export const metadata: Metadata = {
  title: "API",
  description:
    "PYLON exposes the same read-only endpoints its own dashboard uses. No account, no auth, JSON only.",
};

const endpoints = [
  {
    path: "/api/chain",
    desc: "Height, gas price, base fee, transactions in the latest block, plus chain-wide aggregates.",
    shape: `{
  "ok": true,
  "ts": 1785157513000,
  "height": 20754129,
  "gasPriceWei": 35818000,
  "baseFeeWei": 36040000,
  "txInLatest": 4,
  "blockTimestamp": 1785157513,
  "gasUsedLatest": 644785,
  "totals": {
    "blocks": 20752846,
    "transactions": 170380502,
    "addresses": 4420816,
    "txToday": 7082160,
    "avgBlockTimeMs": 91
  }
}`,
  },
  {
    path: "/api/blocks",
    desc: "The 15 most recent blocks, newest first.",
    shape: `{
  "ok": true,
  "ts": 1785157513000,
  "blocks": [
    {
      "number": 20754129,
      "hash": "0x3ce4…4e2c",
      "timestamp": 1785157513,
      "txCount": 4,
      "gasUsed": 1444280,
      "gasLimit": 1125899906842624,
      "baseFeeWei": 36040000
    }
  ]
}`,
  },
  {
    path: "/api/gas",
    desc: "Base fee sampled across 100 points at a fixed block stride.",
    shape: `{
  "ok": true,
  "ts": 1785157513000,
  "stride": 4,
  "points": [
    { "block": 20753733, "baseFeeWei": 35924000, "gasUsed": 634937, "txCount": 9 }
  ]
}`,
  },
  {
    path: "/api/stocks",
    desc: "The tokenized equity contracts tracked by this dashboard.",
    shape: `{
  "ok": true,
  "ts": 1785157513000,
  "stocks": [
    {
      "symbol": "AAPL",
      "address": "0xaF3D…93f9",
      "name": "Apple • Robinhood Token",
      "price": 334.21,
      "marketCap": 1063930.24,
      "volume24h": 205254.98,
      "holders": 27817,
      "icon": "https://cdn.robinhood.com/…",
      "ok": true
    }
  ]
}`,
  },
  {
    path: "/api/health",
    desc: "Probes each upstream independently and reports status, latency, the serving region and current server-cache ages. Rendered for humans at /status.",
    shape: `{
  "ok": true,
  "ts": 1785178630269,
  "region": "iad1",
  "sources": [
    {
      "id": "rpc",
      "label": "JSON-RPC",
      "url": "https://rpc.mainnet.chain.robinhood.com",
      "status": "up",
      "latencyMs": 82,
      "detail": "chain id 4663"
    }
  ],
  "cacheAgeMs": { "chain": 1200, "blocks": 800 }
}`,
  },
  {
    path: "/api/search?q=",
    desc: "Dispatches on the shape of the query: digits → block, 66 chars → transaction, 42 chars → address.",
    shape: `GET /api/search?q=20754129
GET /api/search?q=0x3ce42387…7314e2c
GET /api/search?q=0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9

{ "ok": true, "kind": "block" | "tx" | "address", "data": { … } }`,
  },
];

export default function DocsPage() {
  return (
    <PageShell
      title="API"
      lede="Every panel on this site is fed by a route handler that proxies a public endpoint. Those handlers are open — no key required, no auth, no account. Responses are JSON and always carry an ok flag, and every one of them reports the tier that served it and what is left of the allowance."
      aside={<WPylonMast />}
    >
      <section>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] sm:grid-cols-2">
          <div className="bg-[color:var(--color-surface)] p-5">
            <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
              Upstream RPC
            </div>
            <Endpoint
              url={RPC_URL}
              method="POST"
              note="JSON-RPC 2.0. This is not a web page — a browser GET sends an empty body and the node answers with a parse error. Send a POST with a JSON body."
            />
          </div>
          <div className="bg-[color:var(--color-surface)] p-5">
            <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
              Upstream explorer
            </div>
            <div className="border border-[color:var(--color-border)] bg-[color:var(--color-bg)]">
              <div className="flex items-stretch">
                <span className="flex shrink-0 items-center border-r border-[color:var(--color-border)] px-2 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-accent)]">
                  GET
                </span>
                <a
                  href={BLOCKSCOUT}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-2.5 py-2 text-[12px] text-[color:var(--color-accent)] hover:underline"
                >
                  {BLOCKSCOUT} ↗
                </a>
              </div>
              <p className="border-t border-[color:var(--color-border)] px-2.5 py-1.5 text-[10px] leading-relaxed text-[color:var(--color-dim)]">
                A normal site, and a REST API under /api/v2. Safe to open in a
                browser.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Limits
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Three hundred requests a minute without a key, three thousand
              with one. Every response carries the tier that served it and
              what is left, so nothing has to be discovered by hitting a wall.
            </p>
            <pre className="mt-3 overflow-x-auto border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-[11px] leading-relaxed text-[color:var(--color-fg)]">
{`x-ratelimit-tier: anonymous
x-ratelimit-limit: 300
x-ratelimit-remaining: 297
x-ratelimit-reset: 1785200000`}
            </pre>
            <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              Over the line the endpoint answers 429 with{" "}
              <span className="text-[color:var(--color-fg)]">retry-after</span>{" "}
              and an ok flag of false, in the same JSON shape as everything
              else. The full picture is on{" "}
              <Link
                href="/tiers"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                the tiers page
              </Link>
              .
            </p>
          </div>

          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Keys
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              A key raises the ceiling and identifies the caller rather than
              the address they happen to sit behind. There is no account
              attached to one, nothing is asked for to get one, and only a
              hash of it is ever stored.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Send it as{" "}
              <span className="text-[color:var(--color-fg)]">x-pylon-key</span>{" "}
              or as{" "}
              <span className="text-[color:var(--color-fg)]">?key=</span>. Ask{" "}
              <span className="text-[color:var(--color-fg)]">GET /api/keys</span>{" "}
              which tier you are on. Nothing here is paid, and nothing on this
              site can take a payment.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
          Endpoints
        </h2>
        {endpoints.map((e) => (
          <div
            key={e.path}
            className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
          >
            <div className="flex flex-wrap items-baseline gap-3 border-b border-[color:var(--color-border)] px-4 py-3">
              <span className="border border-[color:var(--color-border)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                GET
              </span>
              <code className="text-[13px] text-[color:var(--color-fg)]">
                {e.path}
              </code>
            </div>
            <p className="px-4 pt-3 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              {e.desc}
            </p>
            <pre className="mx-4 my-3 overflow-x-auto border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-[11px] leading-relaxed text-[color:var(--color-dim)]">
              <code>{e.shape}</code>
            </pre>
          </div>
        ))}
      </section>

      <section>
        <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 sm:p-6">
          <h2 className="h-display text-[13px] text-[color:var(--color-fg)]">
            Error behaviour
          </h2>
          <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            A handler never returns a 5xx for an upstream failure. It returns{" "}
            <code className="text-[color:var(--color-fg)]">200</code> with{" "}
            <code className="text-[color:var(--color-fg)]">
              {'{ "ok": false, "error": "…" }'}
            </code>{" "}
            so the client can distinguish &ldquo;the chain is unreachable&rdquo;
            from &ldquo;the request was malformed&rdquo; and render the{" "}
            <span className="text-[color:var(--color-fg)]">feed offline</span>{" "}
            state instead of a crash. Arrays come back empty rather than
            missing.
          </p>
          <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            Chain id is {CHAIN.id}. All wei values are integers. Timestamps are
            Unix seconds except <code className="text-[color:var(--color-fg)]">ts</code>,
            which is milliseconds and marks when the response was assembled.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
