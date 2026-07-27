"use client";

import { usePoll } from "@/lib/use-poll";
import { price, compact, usd, DASH } from "@/lib/format";
import { WidgetFrame } from "./widget-frame";

type Stock = {
  symbol: string;
  price: number | null;
  holders: number | null;
  volume24h: number | null;
  icon: string | null;
};
type Feed = { ok: boolean; stocks: Stock[] };

/**
 * Vertical tape of the tracked equity tokens, scrolling on a loop.
 * The list renders twice — once for screen readers, once aria-hidden — so
 * the CSS translate loop is seamless without duplicating content in the
 * accessibility tree.
 */
export function WStockTape() {
  const { data, live } = usePoll<Feed>("/api/stocks", 15000);
  const stocks = data?.stocks ?? [];

  const Row = ({ s }: { s: Stock }) => (
    <div className="flex items-center gap-2.5 border-b border-[color:var(--color-border)] px-3 py-2.5">
      {s.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={s.icon}
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 shrink-0"
          loading="lazy"
        />
      ) : (
        <span className="h-4 w-4 shrink-0 border border-[color:var(--color-border)]" />
      )}
      <span className="w-[46px] shrink-0 text-[12px] text-[color:var(--color-fg)]">
        {s.symbol}
      </span>
      <span className="flex-1 text-right text-[13px] text-[color:var(--color-accent)]">
        {price(s.price)}
      </span>
      <span className="w-[52px] shrink-0 text-right text-[10px] text-[color:var(--color-dim)]">
        {s.holders != null ? compact(s.holders) : DASH}
      </span>
    </div>
  );

  const totalHolders = stocks.reduce((s, x) => s + (x.holders ?? 0), 0);
  const totalVol = stocks.reduce((s, x) => s + (x.volume24h ?? 0), 0);

  return (
    <WidgetFrame title="equity tape" status="quoting" live={live}>
      <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-3 py-1.5">
        <span className="text-[9px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
          symbol
        </span>
        <span className="text-[9px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
          price / holders
        </span>
      </div>

      <div className="relative h-[236px] overflow-hidden">
        {stocks.length === 0 ? (
          <div className="space-y-px p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-[34px] w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="tape-scroll">
              <div>
                {stocks.map((s) => (
                  <Row key={s.symbol} s={s} />
                ))}
              </div>
              <div aria-hidden="true">
                {stocks.map((s) => (
                  <Row key={`${s.symbol}-x`} s={s} />
                ))}
              </div>
            </div>
            {/* fade masks top and bottom */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-8"
              style={{
                background:
                  "linear-gradient(to bottom, var(--color-surface), transparent)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
              style={{
                background:
                  "linear-gradient(to top, var(--color-surface), transparent)",
              }}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-3 divide-x divide-[color:var(--color-border)] border-t border-[color:var(--color-border)]">
        {[
          { l: "tracked", v: stocks.length ? String(stocks.length) : DASH },
          { l: "holders", v: totalHolders ? compact(totalHolders) : DASH },
          { l: "24h vol", v: totalVol ? usd(totalVol) : DASH },
        ].map((x) => (
          <div key={x.l} className="px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
              {x.l}
            </div>
            <div className="mt-0.5 truncate text-[12px] text-[color:var(--color-fg)]">
              {x.v}
            </div>
          </div>
        ))}
      </div>
    </WidgetFrame>
  );
}
