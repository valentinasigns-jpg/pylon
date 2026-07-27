import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { WPylonMast } from "@/components/w-pylon-mast";
import { RPC_URL, BLOCKSCOUT, CHAIN } from "@/lib/config";

export const metadata: Metadata = {
  title: "API",
  description:
    "PYLON exposes the same read-only endpoints its own dashboard uses. No key, no auth, JSON only.",
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
      index="07"
      title="API"
      lede="Every panel on this site is fed by a route handler that proxies a public endpoint. Those handlers are open — no key, no auth, no rate limit beyond what the upstream imposes. Responses are JSON and always carry an ok flag."
      aside={<WPylonMast />}
    >
      <section>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] sm:grid-cols-2">
          <div className="bg-[color:var(--color-surface)] p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
              Upstream RPC
            </div>
            <a
              href={RPC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block break-all text-[13px] text-[color:var(--color-accent)] hover:underline"
            >
              {RPC_URL}
            </a>
          </div>
          <div className="bg-[color:var(--color-surface)] p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
              Upstream explorer
            </div>
            <a
              href={BLOCKSCOUT}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block break-all text-[13px] text-[color:var(--color-accent)] hover:underline"
            >
              {BLOCKSCOUT}
            </a>
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
