"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { encodeFunctionData, parseEther } from "viem";
import { buildTree } from "@/lib/draw";
import { PYLON_DRAW_ABI } from "@/lib/draw-abi";
import { DRAW_ADDRESS, PROTOCOL_FEE_ETH, MAX_WINNERS } from "@/lib/draw";
import { num } from "@/lib/format";

const K = (d: Uint8Array) => keccak_256(d);
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

function parseList(raw: string) {
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
 * Builds the commitment in the browser and hands back the exact call to
 * make. It does not make it.
 *
 * There is no wallet connection here on purpose. The organiser sends their
 * own transaction, from whatever they already use, with calldata they can
 * read before they sign it. That keeps this site incapable of touching a
 * transaction, which is a stronger promise than any wording about not
 * touching one.
 */
export function CreateForm() {
  const [listText, setListText] = useState("");
  const [winnerCount, setWinnerCount] = useState("3");
  const [drawAtLocal, setDrawAtLocal] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const { entrants, bad } = useMemo(() => parseList(listText), [listText]);

  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const a of entrants) {
      if (seen.has(a)) dupes.add(a);
      seen.add(a);
    }
    return dupes.size;
  }, [entrants]);

  const tree = useMemo(() => {
    if (entrants.length === 0) return null;
    try {
      return buildTree(K, entrants);
    } catch {
      return null;
    }
  }, [entrants]);

  const k = Number(winnerCount);
  const drawAt = drawAtLocal ? Math.floor(new Date(drawAtLocal).getTime() / 1000) : 0;
  const nowSec = Math.floor(Date.now() / 1000);

  const problems: string[] = [];
  if (entrants.length === 0) problems.push("no entrants yet");
  if (!Number.isInteger(k) || k < 1) problems.push("winner count must be at least 1");
  if (k > MAX_WINNERS) problems.push(`the contract allows at most ${MAX_WINNERS} winners`);
  if (entrants.length > 0 && k > entrants.length)
    problems.push("more winners than entrants");
  if (!drawAtLocal) problems.push("no draw time set");
  else if (drawAt <= nowSec) problems.push("the draw time is in the past");

  const calldata = useMemo(() => {
    if (!tree || problems.length > 0) return null;
    try {
      return encodeFunctionData({
        abi: PYLON_DRAW_ABI,
        functionName: "createDraw",
        args: [
          tree.root as `0x${string}`,
          entrants.length,
          k,
          BigInt(drawAt),
          metadataURI,
        ],
      });
    } catch {
      return null;
    }
  }, [tree, problems.length, entrants.length, k, drawAt, metadataURI]);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setListText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function copy(what: string, value: string) {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  function downloadList() {
    const blob = new Blob([JSON.stringify({ entrants }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "entrants.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
        <h2 className="h-display border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
          The list
        </h2>
        <div className="space-y-4 p-4 sm:p-5">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
              One address per line. Order is part of the commitment.
            </span>
            <textarea
              value={listText}
              onChange={(e) => setListText(e.target.value)}
              spellCheck={false}
              rows={9}
              placeholder={"0x…\n0x…\n0x…"}
              className="mt-1.5 w-full resize-y border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-[12px] text-[color:var(--color-fg)] placeholder:text-[#4a4a4a] focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
            <label className="cursor-pointer border border-[color:var(--color-border)] px-3 py-1.5 transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]">
              load a file
              <input
                type="file"
                accept=".txt,.csv,.json"
                onChange={onFile}
                className="sr-only"
              />
            </label>
            <span>
              entrants{" "}
              <span className="text-[color:var(--color-fg)]">
                {num(entrants.length)}
              </span>
            </span>
            {bad.length > 0 && (
              <span className="text-[color:var(--color-warn)]">
                {num(bad.length)} not an address
              </span>
            )}
            {duplicates > 0 && (
              <span className="text-[color:var(--color-wait)]">
                {num(duplicates)} repeated
              </span>
            )}
          </div>

          {duplicates > 0 && (
            <p className="max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              Repeated addresses are kept, not merged. Each occupies its own
              position and therefore has its own chance — which may be what
              you want. Nothing here decides that for you; it is only worth
              knowing before the list is fixed.
            </p>
          )}
          {bad.length > 0 && (
            <p className="max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              Lines that are not 42-character addresses are ignored rather
              than guessed at. First one: <code className="text-[color:var(--color-fg)]">{bad[0].slice(0, 40)}</code>
            </p>
          )}
        </div>
      </section>

      <section className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
        <h2 className="h-display border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
          The terms
        </h2>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:p-5">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
              Winners
            </span>
            <input
              value={winnerCount}
              onChange={(e) => setWinnerCount(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className="mt-1.5 w-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-[12px] text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
              Earliest the draw may run — your local time
            </span>
            <input
              type="datetime-local"
              value={drawAtLocal}
              onChange={(e) => setDrawAtLocal(e.target.value)}
              className="mt-1.5 w-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-[12px] text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </label>
          <label className="block sm:col-span-3">
            <span className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
              Where the list will be published — anyone verifying needs to fetch it
            </span>
            <input
              value={metadataURI}
              onChange={(e) => setMetadataURI(e.target.value)}
              spellCheck={false}
              placeholder="ipfs://… or https://…"
              className="mt-1.5 w-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-[12px] text-[color:var(--color-fg)] placeholder:text-[#4a4a4a] focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </label>
        </div>
      </section>

      <section className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
        <h2 className="h-display border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
          The commitment
        </h2>
        <div className="space-y-4 p-4 sm:p-5">
          {tree ? (
            <div>
              <div className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
                Merkle root — computed here, from your list
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <code className="break-all text-[12px] text-[color:var(--color-accent)]">
                  {tree.root}
                </code>
                <button
                  type="button"
                  onClick={() => copy("root", tree.root)}
                  className="shrink-0 border border-[color:var(--color-border)] px-2 py-1 text-[10px] uppercase tracking-[0.13em] text-[color:var(--color-dim)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
                >
                  {copied === "root" ? "copied" : "copy"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-[color:var(--color-dim)]">
              Add addresses above and the root appears here. Your list is never
              sent anywhere — this is computed in the page.
            </p>
          )}

          {problems.length > 0 ? (
            <ul className="space-y-1 text-[12px] text-[color:var(--color-wait)]">
              {problems.map((p) => (
                <li key={p}>— {p}</li>
              ))}
            </ul>
          ) : (
            calldata && (
              <>
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
                      Calldata for createDraw
                    </span>
                    <button
                      type="button"
                      onClick={() => copy("calldata", calldata)}
                      className="border border-[color:var(--color-border)] px-2 py-1 text-[10px] uppercase tracking-[0.13em] text-[color:var(--color-dim)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
                    >
                      {copied === "calldata" ? "copied" : "copy"}
                    </button>
                  </div>
                  <pre className="mt-1.5 max-h-40 overflow-auto border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 text-[11px] leading-relaxed text-[color:var(--color-fg)]">
                    <code className="break-all">{calldata}</code>
                  </pre>
                </div>

                <dl className="border-t border-[color:var(--color-border)] pt-3 text-[12px]">
                  <Line k="to" v={DRAW_ADDRESS ?? "— not deployed yet"} wait={!DRAW_ADDRESS} />
                  <Line k="value" v={`${PROTOCOL_FEE_ETH} ETH`} />
                  <Line k="entrants" v={num(entrants.length)} />
                  <Line k="winners" v={num(k)} />
                  <Line
                    k="drawAt"
                    v={`${drawAt} · ${new Date(drawAt * 1000).toUTCString()}`}
                  />
                </dl>
              </>
            )
          )}

          <div className="flex flex-wrap gap-3 border-t border-[color:var(--color-border)] pt-4">
            <button
              type="button"
              onClick={downloadList}
              disabled={entrants.length === 0}
              className="border border-[color:var(--color-border)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-dim)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[color:var(--color-border)] disabled:hover:text-[color:var(--color-dim)]"
            >
              download entrants.json
            </button>
          </div>

          <p className="max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
            Publish that file wherever you named above, then send the
            transaction yourself. This page has no wallet connection and will
            not ask for one: the calldata is right there to read before you
            sign it, and a site that cannot touch your transaction is a better
            promise than a site that says it will not.
          </p>
        </div>
      </section>
    </div>
  );
}

function Line({ k, v, wait = false }: { k: string; v: string; wait?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[color:var(--color-border)] py-2 last:border-b-0">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
        {k}
      </dt>
      <dd
        className={`break-all text-right text-[12px] ${
          wait ? "text-[color:var(--color-wait)]" : "text-[color:var(--color-fg)]"
        }`}
      >
        {v}
      </dd>
    </div>
  );
}
