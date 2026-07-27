import type { Metadata } from "next";
import { StocksGrid } from "@/components/stocks-grid";
import { PageShell } from "@/components/page-shell";
import { WStockTape } from "@/components/w-stock-tape";
import { SiblingLinks } from "@/components/sibling-links";
import { STOCK_TOKENS, BLOCKSCOUT, CHAIN } from "@/lib/config";
import { truncMid } from "@/lib/format";

export const metadata: Metadata = {
  title: "Tokenized equities",
  description:
    "ERC-20 equity tokens issued on Robinhood Chain — price, holders and 24h volume read from the chain explorer.",
};

export default function StocksPage() {
  return (
    <PageShell
      index="04"
      title="Tokenized equities"
      lede={`Equity tokens issued as ERC-20 contracts on ${CHAIN.name}. Everything here describes the on-chain token — its price feed, its holder count, its traded volume — not the underlying security on any exchange.`}
      aside={<WStockTape />}
    >
      <StocksGrid />

      <SiblingLinks current="stocks" />

      <section>
        <h2 className="h-display mb-3 text-[13px] text-[color:var(--color-accent)]">
          Contract addresses
        </h2>
        <div className="overflow-x-auto border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)]">
                <th className="px-4 py-2.5 text-left text-[11px] font-normal uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                  Symbol
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-normal uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                  Contract
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-normal uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                  Explorer
                </th>
              </tr>
            </thead>
            <tbody>
              {STOCK_TOKENS.map((t) => (
                <tr
                  key={t.symbol}
                  className="border-b border-[color:var(--color-border)] last:border-b-0 hover:bg-[color:var(--color-raised)]"
                >
                  <td className="px-4 py-3 text-[13px] text-[color:var(--color-fg)]">
                    {t.symbol}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[color:var(--color-dim)]">
                    <span className="hidden sm:inline">{t.address}</span>
                    <span className="sm:hidden">{truncMid(t.address, 10, 8)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`${BLOCKSCOUT}/token/${t.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-[color:var(--color-accent)] hover:underline"
                    >
                      open ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 sm:p-6">
          <h2 className="h-display text-[13px] text-[color:var(--color-fg)]">
            What is deliberately missing
          </h2>
          <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            There is no daily percentage change on these cards. The token
            endpoint publishes a current exchange rate but no prior close, and
            deriving a change from two page loads would produce a number that
            looks authoritative and means nothing. Holders and 24h volume are
            shown instead because the endpoint actually reports them.
          </p>
          <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            Token names and logos are metadata published on-chain by the
            issuer and are reproduced without alteration. PYLON does not
            verify, endorse, or vouch for any token listed here, and is not
            affiliated with Robinhood Markets, Inc.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
