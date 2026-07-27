# PYLON

**Every block on Robinhood Chain, as it lands.**

A public, read-only dashboard for [Robinhood Chain](https://robinhoodchain.blockscout.com)
— an Arbitrum Orbit L2 running as chain id `4663`. Live blocks, base-fee trend,
the tokenized equities issued on-chain, and a search that resolves blocks,
transactions and addresses against the node directly.

No login. No wallet connect. No cookies. No analytics.

---

## The rule

Every number rendered by this app is fetched at request time from a public
endpoint. Nothing is estimated, extrapolated, simulated or hardcoded. When a
feed fails, the panel shows `—` and a **feed offline** pill rather than a
plausible-looking placeholder.

One visible consequence: the tokenized-equity cards carry **no daily percentage
change**. The upstream endpoint publishes a current exchange rate but no prior
close, so a delta would have to be invented. Holders and 24h volume are shown
instead, because those are actually reported.

---

## Data sources

Both public, both free, neither requires an API key.

| Source | URL | Feeds |
|---|---|---|
| JSON-RPC | `https://rpc.mainnet.chain.robinhood.com` | block height, block contents, gas price, base fee, balances, receipts, contract code |
| Blockscout | `https://robinhoodchain.blockscout.com` | chain aggregates, token prices, holder counts, 24h volume, issuer logos |

All upstream calls are made **server-side** through Next.js route handlers, so
the browser never contacts the node or the explorer directly.

---

## Run locally

Requires Node 18.17+.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the build
```

No `.env` file is needed — there are no secrets.

---

## Public API

The app's own route handlers are open. Responses are JSON and always carry an
`ok` flag; upstream failures return HTTP `200` with `{ "ok": false, "error": … }`
so a client can tell "chain unreachable" apart from "bad request".

| Endpoint | Returns |
|---|---|
| `GET /api/chain` | height, gas price, base fee, tx in latest block, chain aggregates |
| `GET /api/blocks` | the 15 most recent blocks |
| `GET /api/gas` | base fee across 100 samples at a fixed block stride |
| `GET /api/stocks` | the tracked tokenized-equity contracts |
| `GET /api/search?q=` | dispatches on shape: digits → block, 66 chars → tx, 42 chars → address |

Full documentation with response shapes lives at [`/docs`](https://pylon.vercel.app/docs).

---

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 — CSS-first `@theme`, no CSS-in-JS
- lucide-react for icons
- JetBrains Mono via `next/font/google`
- Gas chart is hand-rolled SVG — no charting library

---

## Design

Terminal brutalism. Dense, technical, high information ratio.

| Token | Value |
|---|---|
| Background | `#0A0A0A` |
| Surface | `#121212` |
| Border | `#1F1F1F` |
| Text primary | `#EDEDED` |
| Text secondary | `#7A7A7A` |
| Accent (only) | `#00FF9C` |

The accent is reserved for live indicators, section indices and active values.
It is never decorative. Type is JetBrains Mono throughout — headings 600,
uppercase, `-0.02em` tracking; body 400; all numerals `tabular-nums`. Hairline
1px borders, no shadows, no radius above 2px. Motion is 120ms ease-out; new
blocks slide in, the live dot pulses, nothing bounces.

---

## Before launch

Two placeholders in `lib/config.ts` are marked `TODO` and must be replaced:

```ts
export const X_HANDLE = "https://x.com/PLACEHOLDER";
export const GITHUB_URL = "https://github.com/PLACEHOLDER/pylon";
```

---

## Not affiliated with Robinhood Markets, Inc.

PYLON is an independent project with no relationship to Robinhood Markets,
Inc., Robinhood Crypto, LLC, or any of their subsidiaries or affiliates. It is
not endorsed, sponsored, or operated in partnership with any of them.
"Robinhood Chain" is used strictly as the name of a public blockchain network.
Token names and logos are on-chain metadata published by the issuer and are
reproduced for identification only.

Nothing in this repository or on the deployed site is financial advice. Data is
provided as-is with no warranty of accuracy or availability.
