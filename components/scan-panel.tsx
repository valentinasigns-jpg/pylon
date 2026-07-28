"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Search as SearchIcon } from "lucide-react";
import { num, usd, compact, truncMid, pct, DASH } from "@/lib/format";
import { BLOCKSCOUT } from "@/lib/config";
import { KV, Panel, Skeleton } from "./primitives";
import type { ScanResult } from "@/lib/scan";

type Response =
  | { ok: true; stale: boolean; data: ScanResult }
  | { ok: false; error: string };

function days(seconds: number | null): string {
  if (seconds === null) return DASH;
  const d = seconds / 86400;
  if (d < 1) return `${Math.max(1, Math.round(seconds / 3600))}h old`;
  if (d < 90) return `${Math.round(d)} days old`;
  return `${(d / 365).toFixed(1)} years old`;
}

/** Section frame, matching the panels used everywhere else on the site. */
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <h3 className="h-display border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
        {title}
      </h3>
      <div className="px-4 py-1">{children}</div>
    </section>
  );
}

function Addr({ value }: { value: string | null }) {
  if (!value) return <>{DASH}</>;
  return (
    <a
      href={`${BLOCKSCOUT}/address/${value}`}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-[color:var(--color-accent)]"
    >
      <span className="hidden sm:inline">{value}</span>
      <span className="sm:hidden">{truncMid(value, 10, 8)}</span>
    </a>
  );
}

/**
 * The headline finding, and the reason this page exists. Robinhood's own
 * documentation says a token with a familiar ticker at a different address
 * is not theirs; this states which of those two things is in front of you,
 * or says the check could not run.
 */
function Verdict({ result }: { result: ScanResult }) {
  const c = result.canonical;

  if (c.state === "impostor") {
    return (
      <div className="border border-[color:var(--color-warn)] bg-[color:var(--color-surface)] p-4 sm:p-5">
        <div className="h-display text-[13px] text-[color:var(--color-warn)]">
          Ticker matches a Robinhood Stock Token. This address does not.
        </div>
        <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
          The registry lists{" "}
          <span className="text-[color:var(--color-fg)]">{c.listed.symbol}</span>{" "}
          at a different contract. Robinhood states that a token carrying a
          matching name or ticker at any other address is not a Robinhood Stock
          Token.
        </p>
        <dl className="mt-4 space-y-0 border-t border-[color:var(--color-border)]">
          <KV k="Registry lists" v={<Addr value={c.listed.address} />} accent />
          <KV k="You are looking at" v={<Addr value={result.address} />} />
        </dl>
      </div>
    );
  }

  if (c.state === "canonical") {
    return (
      <div className="border border-[color:var(--color-accent)]/40 bg-[color:var(--color-surface)] p-4 sm:p-5">
        <div className="h-display text-[13px] text-[color:var(--color-accent)]">
          This is the address the registry lists for {c.listed.symbol}.
        </div>
        <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
          It matches the entry for{" "}
          <span className="text-[color:var(--color-fg)]">{c.listed.name}</span>{" "}
          in Robinhood&rsquo;s published contract list. That settles identity
          and nothing else — read what the contract can do below before
          deciding anything.
        </p>
        {c.listed.multiplier && c.listed.multiplier !== "1.000000000000000000" && (
          <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
            The registry reports a current multiplier of{" "}
            <span className="text-[color:var(--color-fg)]">
              {Number(c.listed.multiplier).toFixed(6)}
            </span>
            , so raw balances and the balance Robinhood shows are restated
            against each other by that factor.
          </p>
        )}
      </div>
    );
  }

  const text =
    c.state === "unlisted-symbol"
      ? "No Robinhood Stock Token uses this ticker, and this address is not in the registry. That means the impostor check has nothing to compare against — it does not mean the contract is fine."
      : c.state === "no-symbol"
        ? "This contract publishes no ticker, so there is nothing to compare against the registry."
        : `The canonical registry check did not run: ${c.reason}. Nothing has been established about this address's identity either way.`;

  return (
    <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 sm:p-5">
      <div className="h-display text-[13px] text-[color:var(--color-fg)]">
        Not a listed Robinhood ticker
      </div>
      <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
        {text}
      </p>
    </div>
  );
}

export function ScanPanel({ initial = "" }: { initial?: string }) {
  const [q, setQ] = useState(initial);
  const [res, setRes] = useState<Response | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (query: string) => {
    if (!query) return;
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch(`/api/scan?address=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      setRes((await r.json()) as Response);
    } catch (err) {
      setRes({ ok: false, error: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    void run(q.trim());
  }

  /**
   * Arriving from /new or any other link with an address in the query runs
   * the check straight away. Landing on a prefilled box that still needs a
   * click would waste the one gesture the link was meant to save.
   */
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    if (/^0x[a-fA-F0-9]{40}$/.test(initial.trim())) void run(initial.trim());
  }, [initial, run]);

  const d = res?.ok ? res.data : null;

  return (
    <section id="scan" className="scroll-mt-20 space-y-px">
      <form onSubmit={submit} className="flex gap-px bg-[color:var(--color-border)]">
        <div className="relative flex-1">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-dim)]"
          />
          <input
            id="pylon-scan"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="0x…  paste a contract address"
            aria-label="Contract address to check"
            className="w-full border-0 bg-[color:var(--color-surface)] py-3 pl-9 pr-3 text-[13px] text-[color:var(--color-fg)] placeholder:text-[#4a4a4a] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !q.trim()}
          className="shrink-0 bg-[color:var(--color-surface)] px-5 text-[12px] uppercase tracking-[0.14em] text-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-bg)] disabled:cursor-not-allowed disabled:text-[color:var(--color-dim)] disabled:hover:bg-[color:var(--color-surface)]"
        >
          {busy ? "…" : "Check"}
        </button>
      </form>

      {busy && (
        <Panel className="p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
            reading six records from the chain explorer
          </div>
          <Skeleton className="mt-3 h-3.5 w-56" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </Panel>
      )}

      {res && !busy && !res.ok && (
        <Panel className="p-4">
          <div className="text-[13px] text-[color:var(--color-dim)]">
            <span className="text-[color:var(--color-fg)]">{DASH} nothing read.</span>{" "}
            {res.error}
          </div>
        </Panel>
      )}

      {d && !busy && (
        <div className="space-y-4 pt-4">
          <Verdict result={d} />

          {!d.isContract && (
            <Panel className="p-4 sm:p-5">
              <div className="h-display text-[13px] text-[color:var(--color-fg)]">
                No code at this address
              </div>
              <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                {d.missing[0]?.reason ?? "Nothing further could be read."}
              </p>
            </Panel>
          )}

          {d.isContract && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Block title="Identity">
                <KV k="Address" v={<Addr value={d.address} />} />
                <KV k="Token name" v={d.token?.name ?? DASH} />
                <KV k="Ticker" v={d.token?.symbol ?? DASH} />
                <KV k="Standard" v={d.token?.type ?? DASH} />
                <KV
                  k="Holders"
                  v={d.token?.holders != null ? num(d.token.holders) : DASH}
                />
                <KV
                  k="Explorer label"
                  v={d.explorer.label ?? DASH}
                />
                <KV
                  k="Flagged by explorer"
                  v={
                    d.explorer.isScam === null
                      ? DASH
                      : d.explorer.isScam
                        ? "yes"
                        : "no"
                  }
                  accent={d.explorer.isScam === true}
                />
              </Block>

              <Block title="Deployment">
                <KV k="Age" v={days(d.deployment.ageSeconds)} />
                <KV
                  k="Deployed"
                  v={
                    d.deployment.timestamp
                      ? d.deployment.timestamp.slice(0, 10)
                      : DASH
                  }
                />
                <KV
                  k="Deployed by"
                  v={
                    d.deployment.creator ? (
                      <>
                        <Addr value={d.deployment.creator} />
                        {d.deployment.creatorIsContract === true && (
                          <span className="ml-2 text-[color:var(--color-dim)]">
                            (a contract, not a person)
                          </span>
                        )}
                      </>
                    ) : (
                      DASH
                    )
                  }
                />
                <KV
                  k="Deploy tx sent by"
                  v={<Addr value={d.deployment.originEoa} />}
                />
                <KV
                  k="In block"
                  v={
                    d.deployment.blockNumber != null
                      ? num(d.deployment.blockNumber)
                      : DASH
                  }
                />
              </Block>

              <Block title="Source">
                <KV
                  k="Verified"
                  v={
                    d.verification.verified === null
                      ? "not established"
                      : d.verification.verified
                        ? d.verification.fully
                          ? "yes, fully"
                          : "yes, partially"
                        : "no"
                  }
                  accent={d.verification.verified === true}
                />
                <KV k="Contract name" v={d.verification.contractName ?? DASH} />
                <KV k="Compiler" v={d.verification.compiler ?? DASH} />
                <KV k="Licence" v={d.verification.license ?? DASH} />
                <KV
                  k="Verified on"
                  v={
                    d.verification.at ? d.verification.at.slice(0, 10) : DASH
                  }
                />
              </Block>

              <Block title="Code behind the address">
                <KV k="Proxy" v={d.proxy.type ?? "no — code lives here"} />
                {d.proxy.implementations.length > 0 ? (
                  d.proxy.implementations.map((i) => (
                    <KV
                      key={i.address}
                      k={i.name ?? "Implementation"}
                      v={<Addr value={i.address} />}
                    />
                  ))
                ) : (
                  <KV k="Implementation" v={DASH} />
                )}
                <KV
                  k="Functions read from"
                  v={
                    d.abi.read ? (
                      <>
                        <Addr value={d.abi.from} />
                        <span className="ml-2 text-[color:var(--color-dim)]">
                          ({d.abi.via})
                        </span>
                      </>
                    ) : (
                      "not read"
                    )
                  }
                />
              </Block>
            </div>
          )}

          {d.powers && (
            <section className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
              <h3 className="h-display border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                What the code can do
              </h3>
              <div className="divide-y divide-[color:var(--color-border)]">
                {d.powers.map((p) => {
                  const present = p.signatures.length > 0;
                  return (
                    <div key={p.key} className="px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span
                          className={`text-[13px] ${
                            present
                              ? "text-[color:var(--color-fg)]"
                              : "text-[color:var(--color-dim)]"
                          }`}
                        >
                          {p.label}
                        </span>
                        <span
                          className={`text-[11px] uppercase tracking-[0.12em] ${
                            present
                              ? "text-[color:var(--color-warn)]"
                              : "text-[color:var(--color-dim)]"
                          }`}
                        >
                          {present ? "present" : "not in this ABI"}
                        </span>
                      </div>
                      {present && (
                        <>
                          <div className="mt-1.5 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
                            {p.meaning}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {p.signatures.map((s) => (
                              <code
                                key={s}
                                className="border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2 py-1 text-[11px] text-[color:var(--color-fg)]"
                              >
                                {s}
                              </code>
                            ))}
                          </div>
                        </>
                      )}
                      {p.note && (
                        <div className="mt-2 max-w-[76ch] border-l border-[color:var(--color-warn)] pl-3 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
                          {p.note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="border-t border-[color:var(--color-border)] px-4 py-3 text-[11px] leading-relaxed text-[color:var(--color-dim)]">
                Every row above is a name match against the verified ABI, and
                the matched signatures are printed so you can check the claim.
                &ldquo;Present&rdquo; means the function exists, not that it has
                been used or that it is wrong for a contract to have it — a
                regulated issuer has reasons to hold a pause switch. It does
                mean someone can.
              </p>
            </section>
          )}

          {d.distribution && (
            <section className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
              <h3 className="h-display flex flex-wrap items-baseline justify-between gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                <span>Concentration</span>
                <span className="text-[color:var(--color-fg)]">
                  top {d.distribution.counted} hold{" "}
                  {d.distribution.topShare !== null
                    ? pct(d.distribution.topShare)
                    : DASH}
                </span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <tbody>
                    {d.distribution.top.map((h, i) => (
                      <tr
                        key={h.address + i}
                        className="border-b border-[color:var(--color-border)] last:border-b-0"
                      >
                        <td className="px-4 py-2 text-[11px] text-[color:var(--color-dim)]">
                          {i + 1}
                        </td>
                        <td className="px-2 py-2 text-[12px] text-[color:var(--color-fg)]">
                          <Addr value={h.address} />
                          {h.isContract && (
                            <span className="ml-2 text-[11px] text-[color:var(--color-dim)]">
                              contract
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-[12px] text-[color:var(--color-fg)]">
                          {h.share !== null ? pct(h.share) : DASH}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {d.token && (
            <Block title="What the explorer prices it at">
              <KV
                k="Price"
                v={d.token.priceUsd != null ? `$${d.token.priceUsd}` : DASH}
              />
              <KV k="24h volume" v={usd(d.token.volume24hUsd)} />
              <KV k="Market value" v={usd(d.token.marketCapUsd)} />
              <KV
                k="Total supply"
                v={
                  d.token.totalSupply && d.token.decimals != null
                    ? compact(
                        Number(d.token.totalSupply) / 10 ** d.token.decimals,
                      )
                    : DASH
                }
              />
            </Block>
          )}

          <section className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
            <h3 className="h-display border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
              Not established
            </h3>
            <ul className="divide-y divide-[color:var(--color-border)]">
              {d.missing.map((m) => (
                <li key={m.field} className="px-4 py-3">
                  <div className="text-[13px] text-[color:var(--color-fg)]">
                    {m.field}
                  </div>
                  <div className="mt-1 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
                    {m.reason}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <p className="max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
            PYLON does not rate this contract and will not tell you it is safe.
            Everything above is a reading from a public source, printed with
            the source next to it. What it adds up to is your call.
          </p>
        </div>
      )}
    </section>
  );
}
