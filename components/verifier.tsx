"use client";

import { useMemo, useState } from "react";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { buildTree, selectWinners, proofFor, verifyProof } from "@/lib/draw";
import { truncMid, num, DASH } from "@/lib/format";

const K = (d: Uint8Array) => keccak_256(d);

const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const BYTES32 = /^0x[a-fA-F0-9]{64}$/;

function parseList(raw: string): { entrants: string[]; bad: string[] } {
  const entrants: string[] = [];
  const bad: string[] = [];
  for (const line of raw.split(/[\s,;]+/)) {
    const t = line.trim();
    if (!t) continue;
    if (ADDRESS.test(t)) entrants.push(t.toLowerCase());
    else bad.push(t);
  }
  return { entrants, bad };
}

/**
 * Recomputes a draw from the entrant list and the random value the contract
 * recorded, in the reader's own browser.
 *
 * There is no request here. Not to our API, not to the node, not to
 * anything — the whole computation is keccak256 and arithmetic, and the
 * code doing it arrived with the page. Turn the network off and it still
 * works, which is the only version of "verifiable" worth the word.
 */
export function Verifier({
  initialRoot = "",
  initialRandom = "",
  initialWinnerCount = 0,
  expectedWinners = null,
}: {
  initialRoot?: string;
  initialRandom?: string;
  initialWinnerCount?: number;
  /** What the chain says. When given, the panel compares rather than asserts. */
  expectedWinners?: number[] | null;
}) {
  const [listText, setListText] = useState("");
  const [randomValue, setRandomValue] = useState(initialRandom);
  const [winnerCount, setWinnerCount] = useState(
    initialWinnerCount ? String(initialWinnerCount) : "",
  );

  const { entrants, bad } = useMemo(() => parseList(listText), [listText]);

  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const a of entrants) {
      if (seen.has(a)) dupes.add(a);
      seen.add(a);
    }
    return [...dupes];
  }, [entrants]);

  const result = useMemo(() => {
    if (entrants.length === 0) return null;
    const k = Number(winnerCount);
    if (!Number.isInteger(k) || k < 1 || k > entrants.length) return null;
    if (!BYTES32.test(randomValue)) return null;
    try {
      const tree = buildTree(K, entrants);
      const indices = selectWinners(K, randomValue, entrants.length, k);
      return {
        root: tree.root,
        indices,
        winners: indices.map((i) => entrants[i]),
        proofsOk: indices.every((i) =>
          verifyProof(K, proofFor(tree, i), tree.root, i, entrants[i]),
        ),
      };
    } catch {
      return null;
    }
  }, [entrants, winnerCount, randomValue]);

  const rootMatches =
    result && initialRoot
      ? result.root.toLowerCase() === initialRoot.toLowerCase()
      : null;

  const winnersMatch =
    result && expectedWinners
      ? JSON.stringify(result.indices) === JSON.stringify(expectedWinners)
      : null;

  return (
    <section className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <h3 className="h-display border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
        Check it yourself
      </h3>

      <div className="space-y-4 p-4 sm:p-5">
        <p className="max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
          Paste the entrant list the organiser published and the random value
          the contract recorded. Everything below is computed here, in this
          tab. Disconnect from the network first if you would rather not take
          that on trust.
        </p>

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
            Entrant list — one address per line, in the published order
          </span>
          <textarea
            value={listText}
            onChange={(e) => setListText(e.target.value)}
            spellCheck={false}
            rows={6}
            placeholder={"0x…\n0x…\n0x…"}
            className="mt-1.5 w-full resize-y border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-[12px] text-[color:var(--color-fg)] placeholder:text-[#4a4a4a] focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
              Random value from the contract
            </span>
            <input
              value={randomValue}
              onChange={(e) => setRandomValue(e.target.value.trim())}
              spellCheck={false}
              placeholder="0x… (32 bytes)"
              className="mt-1.5 w-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-[12px] text-[color:var(--color-fg)] placeholder:text-[#4a4a4a] focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
              Winners
            </span>
            <input
              value={winnerCount}
              onChange={(e) => setWinnerCount(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="3"
              className="mt-1.5 w-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-[12px] text-[color:var(--color-fg)] placeholder:text-[#4a4a4a] focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
          <span>
            parsed{" "}
            <span className="text-[color:var(--color-fg)]">
              {num(entrants.length)}
            </span>
          </span>
          {bad.length > 0 && (
            <span className="text-[color:var(--color-warn)]">
              {num(bad.length)} unreadable
            </span>
          )}
          {duplicates.length > 0 && (
            <span className="text-[color:var(--color-wait)]">
              {num(duplicates.length)} repeated
            </span>
          )}
        </div>

        {duplicates.length > 0 && (
          <p className="max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
            A repeated address is not an error and is not removed — it holds
            more than one position and therefore more than one chance. That
            may be exactly what the organiser intended. It is pointed out
            because it changes the odds and should not pass unnoticed.
          </p>
        )}

        {result && (
          <div className="border-t border-[color:var(--color-border)] pt-4">
            <dl className="space-y-0">
              <Row
                k="Root you computed"
                v={result.root}
                state={
                  rootMatches === null ? "plain" : rootMatches ? "good" : "bad"
                }
                note={
                  rootMatches === null
                    ? undefined
                    : rootMatches
                      ? "matches the root on chain"
                      : "does NOT match the root on chain — this is not the list that was committed to"
                }
              />
              {initialRoot && (
                <Row k="Root on chain" v={initialRoot} state="plain" />
              )}
            </dl>

            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
                  Winners you computed
                </span>
                {winnersMatch !== null && (
                  <span
                    className={`text-[11px] uppercase tracking-[0.13em] ${
                      winnersMatch
                        ? "text-[color:var(--color-accent)]"
                        : "text-[color:var(--color-warn)]"
                    }`}
                  >
                    {winnersMatch
                      ? "same as the chain"
                      : "different from the chain"}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto border border-[color:var(--color-border)]">
                <table className="w-full border-collapse">
                  <tbody>
                    {result.winners.map((addr, i) => (
                      <tr
                        key={`${addr}-${i}`}
                        className="border-b border-[color:var(--color-border)] last:border-b-0"
                      >
                        <td className="px-3 py-2 text-[11px] text-[color:var(--color-dim)]">
                          #{i + 1}
                        </td>
                        <td className="px-2 py-2 text-[11px] text-[color:var(--color-dim)]">
                          index {result.indices[i]}
                        </td>
                        <td className="px-3 py-2 text-[12px] text-[color:var(--color-fg)]">
                          <span className="hidden sm:inline">{addr}</span>
                          <span className="sm:hidden">{truncMid(addr, 10, 8)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--color-dim)]">
                {result.proofsOk
                  ? "Every winner's Merkle proof checks out against the root computed above."
                  : "A proof failed to verify, which should be impossible for a tree built here. Something is wrong with this page, not with the draw."}
              </p>
            </div>
          </div>
        )}

        {!result && entrants.length > 0 && (
          <p className="text-[12px] text-[color:var(--color-dim)]">
            {DASH} give a 32-byte random value and a winner count between 1 and{" "}
            {num(entrants.length)} to compute anything.
          </p>
        )}
      </div>
    </section>
  );
}

function Row({
  k,
  v,
  state,
  note,
}: {
  k: string;
  v: string;
  state: "plain" | "good" | "bad";
  note?: string;
}) {
  const colour =
    state === "good"
      ? "text-[color:var(--color-accent)]"
      : state === "bad"
        ? "text-[color:var(--color-warn)]"
        : "text-[color:var(--color-fg)]";
  return (
    <div className="border-b border-[color:var(--color-border)] py-2.5 last:border-b-0">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
        {k}
      </dt>
      <dd className={`mt-1 break-all text-[12px] ${colour}`}>{v}</dd>
      {note && (
        <dd className={`mt-1 text-[11px] leading-relaxed ${colour}`}>{note}</dd>
      )}
    </div>
  );
}
