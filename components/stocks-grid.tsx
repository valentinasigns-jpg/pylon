"use client";

import { usePoll } from "@/lib/use-poll";
import { price, usd, compact, truncMid, DASH } from "@/lib/format";
import { BLOCKSCOUT } from "@/lib/config";
import { LivePill, SectionHead, Skeleton, FeedMeta } from "./primitives";

type Stock = {
  symbol: string;
  address: string;
  name: string | null;
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
  holders: number | null;
  icon: string | null;
  ok: boolean;
};
type Feed = { ok: boolean; stocks: Stock[] };

export function StocksGrid() {
  const { data, live, loading, updatedAt, reason, source, stale } =
    usePoll<Feed>("/api/stocks", 15000);
  const stocks = data?.stocks ?? [];

  return (
    <section id="stocks" className="scroll-mt-20">
      <SectionHead
        index="04"
        title="Tokenized equities"
        sub="ERC-20 equity tokens issued on Robinhood Chain. Price, holders and 24h volume are read from the chain explorer, not from an equities feed."
        right={<LivePill live={live} reason={reason} />}
      />

      <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] sm:grid-cols-2 lg:grid-cols-4">
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[color:var(--color-surface)] p-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-3 h-6 w-24" />
              <Skeleton className="mt-3 h-3 w-full" />
            </div>
          ))}

        {!loading &&
          stocks.map((s) => (
            <a
              key={s.symbol}
              href={`${BLOCKSCOUT}/token/${s.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[color:var(--color-surface)] p-4 hover:bg-[#161616]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {s.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.icon}
                      alt=""
                      width={18}
                      height={18}
                      className="h-[18px] w-[18px] shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <span className="h-[18px] w-[18px] shrink-0 border border-[color:var(--color-border)]" />
                  )}
                  <span className="h-display text-[15px] text-[color:var(--color-fg)]">
                    {s.symbol}
                  </span>
                </div>
                <span className="text-[10px] text-[color:var(--color-dim)] group-hover:text-[color:var(--color-accent)]">
                  ↗
                </span>
              </div>

              <div className="mt-3 text-[24px] leading-none text-[color:var(--color-fg)]">
                {price(s.price)}
              </div>

              <div className="mt-1 truncate text-[11px] text-[color:var(--color-dim)]">
                {s.name ? s.name.replace(" • Robinhood Token", "") : DASH}
              </div>

              <dl className="mt-4 space-y-1.5 border-t border-[color:var(--color-border)] pt-3">
                <div className="flex justify-between">
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
                    holders
                  </dt>
                  <dd className="text-[11px] text-[color:var(--color-fg)]">
                    {s.holders != null ? compact(s.holders) : DASH}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
                    24h volume
                  </dt>
                  <dd className="text-[11px] text-[color:var(--color-fg)]">
                    {usd(s.volume24h)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
                    market cap
                  </dt>
                  <dd className="text-[11px] text-[color:var(--color-fg)]">
                    {usd(s.marketCap)}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 truncate text-[10px] text-[color:var(--color-dim)]">
                {truncMid(s.address, 8, 6)}
              </div>
            </a>
          ))}
      </div>

      <FeedMeta
        updatedAt={updatedAt}
        source={source}
        stale={stale}
        className="mt-3"
      />

      <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--color-dim)]">
        Source: Blockscout token API for Robinhood Chain. Holder counts and
        prices come from the indexer, so this panel has no second source — a
        bare node cannot produce them. These figures describe the on-chain
        token, not the underlying security. A daily price change is not
        published by the endpoint, so none is shown.
      </p>
    </section>
  );
}
