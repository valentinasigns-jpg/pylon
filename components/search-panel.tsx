"use client";

import { useState, type FormEvent } from "react";
import { Search as SearchIcon } from "lucide-react";
import { num, gwei, truncMid, age, compact, price, DASH } from "@/lib/format";
import { BLOCKSCOUT } from "@/lib/config";
import { KV, Panel, SectionHead, Skeleton } from "./primitives";

type BlockRes = {
  number: number; hash: string; parentHash: string | null; timestamp: number;
  txCount: number; gasUsed: number; gasLimit: number; baseFeeWei: number | null;
  miner: string | null;
};
type TxRes = {
  hash: string; blockNumber: number | null; from: string; to: string | null;
  valueWei: number; gasLimit: number; nonce: number; status: string | null;
  gasUsed: number | null; effectiveGasPriceWei: number | null;
  logCount: number | null; contractCreated: string | null;
};
type AddrRes = {
  address: string; balanceWei: number; txCount: number; isContract: boolean;
  codeSize: number;
  token: { name: string | null; symbol: string | null; price: number | null; holders: number | null } | null;
};

type Result =
  | { ok: true; kind: "block"; data: BlockRes }
  | { ok: true; kind: "tx"; data: TxRes }
  | { ok: true; kind: "address"; data: AddrRes }
  | { ok: false; kind: string; error: string };

const eth = (wei: number) =>
  wei === 0 ? "0 ETH" : `${(wei / 1e18).toFixed(6)} ETH`;

export function SearchPanel() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      setRes((await r.json()) as Result);
    } catch (err) {
      setRes({ ok: false, kind: "error", error: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="search" className="scroll-mt-20">
      <SectionHead
        index="05"
        title="Search"
        sub="Paste a block number, a transaction hash, or an address. Queries hit the chain directly."
      />

      <form onSubmit={submit} className="flex gap-px bg-[color:var(--color-border)]">
        <div className="relative flex-1">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-dim)]"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            placeholder="20754129   ·   0xabc…  ·  0x1f9…"
            aria-label="Search block, transaction, or address"
            className="w-full border-0 bg-[color:var(--color-surface)] py-3 pl-9 pr-3 text-[13px] text-[color:var(--color-fg)] placeholder:text-[#4a4a4a] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !q.trim()}
          className="shrink-0 bg-[color:var(--color-surface)] px-5 text-[12px] uppercase tracking-[0.14em] text-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-bg)] disabled:cursor-not-allowed disabled:text-[color:var(--color-dim)] disabled:hover:bg-[color:var(--color-surface)]"
        >
          {busy ? "…" : "Query"}
        </button>
      </form>

      {busy && (
        <Panel className="mt-px p-4">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="mt-3 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </Panel>
      )}

      {res && !busy && !res.ok && (
        <Panel className="mt-px p-4">
          <div className="text-[12px] text-[color:var(--color-dim)]">
            <span className="text-[color:var(--color-fg)]">{DASH} no result.</span>{" "}
            {res.error}
          </div>
        </Panel>
      )}

      {res && !busy && res.ok && res.kind === "block" && (
        <Panel className="mt-px">
          <Head
            label="Block"
            value={num(res.data.number)}
            href={`${BLOCKSCOUT}/block/${res.data.number}`}
          />
          <div className="px-4 pb-3">
            <KV k="Hash" v={truncMid(res.data.hash, 14, 10)} />
            <KV k="Parent" v={truncMid(res.data.parentHash, 14, 10)} />
            <KV k="Timestamp" v={`${res.data.timestamp} · ${age(res.data.timestamp)}`} />
            <KV k="Transactions" v={num(res.data.txCount)} accent />
            <KV k="Gas used" v={num(res.data.gasUsed)} />
            <KV k="Gas limit" v={num(res.data.gasLimit)} />
            <KV
              k="Base fee"
              v={res.data.baseFeeWei != null ? `${gwei(res.data.baseFeeWei)} gwei` : DASH}
            />
            <KV k="Sequencer" v={truncMid(res.data.miner, 12, 8)} />
          </div>
        </Panel>
      )}

      {res && !busy && res.ok && res.kind === "tx" && (
        <Panel className="mt-px">
          <Head
            label="Transaction"
            value={truncMid(res.data.hash, 12, 10)}
            href={`${BLOCKSCOUT}/tx/${res.data.hash}`}
            status={res.data.status}
          />
          <div className="px-4 pb-3">
            <KV k="Block" v={res.data.blockNumber != null ? num(res.data.blockNumber) : "pending"} />
            <KV k="From" v={truncMid(res.data.from, 14, 10)} />
            <KV k="To" v={res.data.to ? truncMid(res.data.to, 14, 10) : "contract creation"} />
            <KV k="Value" v={eth(res.data.valueWei)} accent={res.data.valueWei > 0} />
            <KV k="Gas used" v={res.data.gasUsed != null ? num(res.data.gasUsed) : DASH} />
            <KV k="Gas limit" v={num(res.data.gasLimit)} />
            <KV
              k="Effective gas price"
              v={res.data.effectiveGasPriceWei != null ? `${gwei(res.data.effectiveGasPriceWei)} gwei` : DASH}
            />
            <KV k="Nonce" v={num(res.data.nonce)} />
            <KV k="Logs" v={res.data.logCount != null ? num(res.data.logCount) : DASH} />
            {res.data.contractCreated && (
              <KV k="Contract created" v={truncMid(res.data.contractCreated, 14, 10)} accent />
            )}
          </div>
        </Panel>
      )}

      {res && !busy && res.ok && res.kind === "address" && (
        <Panel className="mt-px">
          <Head
            label={res.data.isContract ? "Contract" : "Address"}
            value={truncMid(res.data.address, 12, 10)}
            href={`${BLOCKSCOUT}/address/${res.data.address}`}
          />
          <div className="px-4 pb-3">
            <KV k="Balance" v={eth(res.data.balanceWei)} accent={res.data.balanceWei > 0} />
            <KV k="Transactions sent" v={num(res.data.txCount)} />
            <KV k="Type" v={res.data.isContract ? "contract" : "externally owned"} />
            {res.data.isContract && (
              <KV k="Code size" v={`${num(res.data.codeSize)} bytes`} />
            )}
            {res.data.token && (
              <>
                <KV k="Token" v={`${res.data.token.symbol ?? DASH} · ${res.data.token.name ?? DASH}`} accent />
                <KV k="Token price" v={price(res.data.token.price)} />
                <KV
                  k="Holders"
                  v={res.data.token.holders != null ? compact(res.data.token.holders) : DASH}
                />
              </>
            )}
          </div>
        </Panel>
      )}
    </section>
  );
}

function Head({
  label,
  value,
  href,
  status,
}: {
  label: string;
  value: string;
  href: string;
  status?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--color-border)] px-4 py-3">
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
          {label}
        </span>
        <span className="text-[14px] text-[color:var(--color-fg)]">{value}</span>
        {status && (
          <span
            className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
              status === "success"
                ? "border-[color:var(--color-accent)]/40 text-[color:var(--color-accent)]"
                : "border-[color:var(--color-warn)]/40 text-[color:var(--color-warn)]"
            }`}
          >
            {status}
          </span>
        )}
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] text-[color:var(--color-dim)] hover:text-[color:var(--color-accent)]"
      >
        open in explorer ↗
      </a>
    </div>
  );
}
