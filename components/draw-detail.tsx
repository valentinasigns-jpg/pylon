"use client";

import { usePoll } from "@/lib/use-poll";
import { num, truncMid, DASH } from "@/lib/format";
import { BLOCKSCOUT } from "@/lib/config";
import { STATUS_LABEL, type DrawStatus } from "@/lib/draw";
import { Skeleton } from "./primitives";
import { Verifier } from "./verifier";

type Draw = {
  id: number;
  organiser: string;
  entrantsRoot: string;
  entrantCount: number;
  winnerCount: number;
  drawAt: number;
  sequenceNumber: string;
  randomValue: string | null;
  status: number;
  metadataURI: string;
  winnerIndices: number[] | null;
};
type Feed =
  | { ok: true; draw: Draw }
  | { ok: false; reason?: "unreachable" | "empty" | "not-deployed" | null; error: string };

function Field({
  k,
  v,
  mono = true,
  tone = "fg",
}: {
  k: string;
  v: React.ReactNode;
  mono?: boolean;
  tone?: "fg" | "dim" | "accent" | "wait";
}) {
  const colour = {
    fg: "text-[color:var(--color-fg)]",
    dim: "text-[color:var(--color-dim)]",
    accent: "text-[color:var(--color-accent)]",
    wait: "text-[color:var(--color-wait)]",
  }[tone];
  return (
    <div className="border-b border-[color:var(--color-border)] py-2.5 last:border-b-0">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
        {k}
      </dt>
      <dd className={`mt-1 break-all text-[12px] ${colour} ${mono ? "" : "font-sans"}`}>
        {v}
      </dd>
    </div>
  );
}

export function DrawDetail({ id }: { id: number }) {
  const { data, loading } = usePoll<Feed>(`/api/draws/${id}`, 12000);

  if (loading) {
    return (
      <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </div>
    );
  }

  if (!data || !data.ok) {
    const notDeployed = data && "reason" in data && data.reason === "not-deployed";
    return (
      <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 sm:p-6">
        <div
          className={`h-display text-[13px] ${
            notDeployed
              ? "text-[color:var(--color-wait)]"
              : "text-[color:var(--color-fg)]"
          }`}
        >
          {notDeployed ? "The contract is not deployed" : `No draw number ${id}`}
        </div>
        <p className="mt-3 max-w-[76ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
          {data?.error ?? "Nothing came back."}
        </p>
      </div>
    );
  }

  const d = data.draw;
  const status = d.status as DrawStatus;
  const revealed = status === 3;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <h2 className="h-display flex flex-wrap items-baseline justify-between gap-3 border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
            <span>What was committed</span>
            <span
              className={
                revealed
                  ? "text-[color:var(--color-accent)]"
                  : status === 2
                    ? "text-[color:var(--color-wait)]"
                    : "text-[color:var(--color-dim)]"
              }
            >
              {STATUS_LABEL[status]}
            </span>
          </h2>
          <div className="px-4 py-1">
            <Field
              k="Organiser"
              v={
                <a
                  href={`${BLOCKSCOUT}/address/${d.organiser}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[color:var(--color-accent)]"
                >
                  {d.organiser}
                </a>
              }
            />
            <Field k="Entrant list root" v={d.entrantsRoot} />
            <Field
              k="Entrants declared"
              v={`${num(d.entrantCount)} — the organiser's word, not a fact the chain can check`}
            />
            <Field k="Winners" v={num(d.winnerCount)} />
            <Field
              k="Drawable from"
              v={`${new Date(d.drawAt * 1000).toUTCString()} · ${d.drawAt}`}
            />
            <Field
              k="List published at"
              v={
                d.metadataURI ? (
                  /^https?:\/\//.test(d.metadataURI) ? (
                    <a
                      href={d.metadataURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[color:var(--color-accent)]"
                    >
                      {d.metadataURI} ↗
                    </a>
                  ) : (
                    d.metadataURI
                  )
                ) : (
                  <span className="text-[color:var(--color-wait)]">
                    nothing given — the organiser named no location for the list
                  </span>
                )
              }
            />
          </div>
        </section>

        <section className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <h2 className="h-display border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
            What came back
          </h2>
          <div className="px-4 py-1">
            {revealed ? (
              <>
                <Field k="Random value" v={d.randomValue ?? DASH} tone="accent" />
                <Field
                  k="Winning positions"
                  v={d.winnerIndices?.join(", ") ?? DASH}
                />
                <Field
                  k="Oracle request"
                  v={`sequence ${d.sequenceNumber} · Dice Protocol`}
                  tone="dim"
                />
              </>
            ) : status === 2 ? (
              <>
                <Field
                  k="Random value"
                  v="not yet — the oracle was asked and has not answered"
                  tone="wait"
                />
                <Field k="Oracle request" v={`sequence ${d.sequenceNumber}`} tone="dim" />
                <div className="py-3 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
                  This normally takes a second or two. If it never arrives,
                  anyone can call retryDraw: the fee goes back to whoever paid
                  it and the draw returns to where it was, ready to run again.
                </div>
              </>
            ) : (
              <>
                <Field
                  k="Random value"
                  v="nothing yet — the draw has not been run"
                  tone="dim"
                />
                <div className="py-3 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
                  {Math.floor(Date.now() / 1000) >= d.drawAt
                    ? "The time has passed, so anyone may trigger this draw — including you. The organiser is not needed."
                    : "The list is fixed. Nothing can be added to it or taken out without changing the root above."}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {revealed && (
        <p className="max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
          Positions, not names. The contract stores a root, never the list, so
          it cannot tell you who index {d.winnerIndices?.[0] ?? 0} is — only
          that index {d.winnerIndices?.[0] ?? 0} won. Paste the published list
          below and this page will put the two together, in your browser.
        </p>
      )}

      <Verifier
        initialRoot={d.entrantsRoot}
        initialRandom={d.randomValue ?? ""}
        initialWinnerCount={d.winnerCount}
        expectedWinners={d.winnerIndices}
      />
    </div>
  );
}
