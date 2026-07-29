import Link from "next/link";
import { ProtocolHero } from "@/components/protocol-hero";
import { Reveal } from "@/components/reveal";
import { CHAIN } from "@/lib/config";
import {
  DRAW_ADDRESS,
  DICE_ENTROPY,
  DICE_SITE,
  DRAW_REPO,
  PROTOCOL_FEE_ETH,
  MAX_WINNERS,
  explorerAddress,
} from "@/lib/draw";

const STEPS = [
  {
    n: "01",
    title: "Commit",
    body: "Publish a Merkle root over the entrant list, how many winners there will be, and the earliest moment the draw may run. From then on the list cannot gain or lose a name without changing the root — and the root is already on chain.",
  },
  {
    n: "02",
    title: "Draw",
    body: "Once that moment passes, anyone may trigger the draw and pay the oracle. Not only the organiser: a draw that has been committed to cannot be quietly abandoned because it stopped being convenient.",
  },
  {
    n: "03",
    title: "Reveal",
    body: "Dice Protocol returns a random value and the contract records it. The winners follow from that value by a function with no inputs anybody controls, and the value is published alongside them.",
  },
];

const EXAMPLE = `import { buildTree, proofFor, replayDraw } from "@pylon/draw-sdk";

// 1 — commit. The root is all that goes on chain.
const tree = buildTree(entrants);
await pylon.createDraw(
  tree.root,
  entrants.length,
  3,                       // winners
  drawAt,                  // unix seconds
  "ipfs://…/entrants.json",
  { value: parseEther("0.0001") },
);

// 2 — draw, once drawAt has passed. Anyone may call it.
await pylon.executeDraw(drawId, { value: await dice.getFeeV2(...) });

// 3 — check, with no network and no trust in us.
const { winners } = replayDraw(entrants, randomValue, 3);`;

export default function Home() {
  return (
    <main>
      <ProtocolHero />

      <div className="mx-auto max-w-[1400px] space-y-14 px-4 py-14 sm:px-6">
        {/* --- contracts ------------------------------------------------ */}
        <Reveal delay={0}>
          <section id="contracts">
            <h2 className="h-display mb-3 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
              Contracts
            </h2>
            <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
              <div className="bg-[color:var(--color-surface)] p-5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                  PylonDraw
                </div>
                {DRAW_ADDRESS ? (
                  <a
                    href={explorerAddress(DRAW_ADDRESS)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block break-all text-[13px] text-[color:var(--color-accent)] hover:underline"
                  >
                    {DRAW_ADDRESS} ↗
                  </a>
                ) : (
                  <>
                    <div className="mt-2 text-[13px] text-[color:var(--color-wait)]">
                      not deployed yet
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--color-dim)]">
                      The contract is written, compiled and covered by tests —
                      it is in the{" "}
                      <a
                        href={DRAW_REPO}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[color:var(--color-accent)] hover:underline"
                      >
                        repository
                      </a>{" "}
                      and you can read every line of it. What has not happened
                      is a deployment, so there is no address to show and this
                      page will not invent one.
                    </p>
                  </>
                )}
              </div>

              <div className="bg-[color:var(--color-surface)] p-5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                  DiceEntropy — the randomness
                </div>
                <a
                  href={explorerAddress(DICE_ENTROPY)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block break-all text-[13px] text-[color:var(--color-accent)] hover:underline"
                >
                  {DICE_ENTROPY} ↗
                </a>
                <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--color-dim)]">
                  Live, verified and not a proxy.{" "}
                  <a
                    href={DICE_SITE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[color:var(--color-accent)] hover:underline"
                  >
                    Dice Protocol ↗
                  </a>{" "}
                  supplies the randomness; PYLON is a customer of theirs, not a
                  competitor.
                </p>
              </div>
            </div>
          </section>
        </Reveal>

        {/* --- four numbers --------------------------------------------- */}
        <Reveal delay={40}>
          <section>
            <div className="grid grid-cols-2 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-4">
              {[
                {
                  v: PROTOCOL_FEE_ETH,
                  unit: "ETH",
                  label: "Per draw",
                  note: "fixed in bytecode, plus whatever Dice charges",
                },
                {
                  v: "~1–3",
                  unit: "SECONDS",
                  label: "Reveal",
                  note: "Dice's figure, not ours to promise",
                },
                {
                  v: String(MAX_WINNERS),
                  unit: "WINNERS",
                  label: "Per draw",
                  note: "entrant list has no ceiling",
                },
                {
                  v: "0",
                  unit: "KEYS",
                  label: "Admin",
                  note: "no owner, no pause, no upgrade",
                  accent: true,
                },
              ].map((x) => (
                <div key={x.label + x.unit} className="bg-[color:var(--color-surface)] p-4">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-[26px] leading-none tabular-nums ${
                        x.accent
                          ? "text-[color:var(--color-accent)]"
                          : "text-[color:var(--color-fg)]"
                      }`}
                    >
                      {x.v}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
                      {x.unit}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
                    {x.label}
                  </div>
                  <div className="mt-1 text-[10px] leading-relaxed text-[color:var(--color-dim)]">
                    {x.note}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* --- how it works --------------------------------------------- */}
        <Reveal delay={80}>
          <section id="how">
            <h2 className="h-display mb-1 text-lg text-[color:var(--color-fg)] sm:text-xl">
              How it works
            </h2>
            <p className="mb-4 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              Three steps, and only the middle one costs anything worth
              mentioning. The first is a hash; the last is arithmetic.
            </p>
            <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="bg-[color:var(--color-surface)] p-5 sm:p-6">
                  <div className="text-[11px] text-[color:var(--color-accent)]">
                    [{s.n}]
                  </div>
                  <h3 className="h-display mt-2 text-[15px] text-[color:var(--color-fg)]">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* --- integration ---------------------------------------------- */}
        <Reveal delay={120}>
          <section id="integrate">
            <h2 className="h-display mb-1 text-lg text-[color:var(--color-fg)] sm:text-xl">
              The whole integration
            </h2>
            <p className="mb-4 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              Not an excerpt. This is all of it.
            </p>
            <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
              <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                giveaway.ts
              </div>
              <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed text-[color:var(--color-fg)]">
                <code>{EXAMPLE}</code>
              </pre>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              Step three runs in a browser tab with the network cable pulled
              out. That is the part that matters —{" "}
              <Link
                href="/docs"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                the full guide
              </Link>{" "}
              spells out the algorithm so you can write your own if you would
              rather not use ours.
            </p>
          </section>
        </Reveal>

        {/* --- what this does not prove --------------------------------- */}
        <Reveal delay={160}>
          <section id="limits">
            <h2 className="h-display mb-1 text-lg text-[color:var(--color-fg)] sm:text-xl">
              What this does not prove
            </h2>
            <p className="mb-4 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              Every guarantee here has an edge. These are where they stop.
            </p>
            <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-3">
              <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
                <h3 className="h-display text-[13px] text-[color:var(--color-fg)]">
                  The organiser still writes the list
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                  Nothing on chain knows who deserved to be in it. An organiser
                  can fill a list with their own addresses and the draw will be
                  impeccably fair among those. What is fixed is that once the
                  list is committed, the selection from it is not steered.
                </p>
              </div>
              <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
                <h3 className="h-display text-[13px] text-[color:var(--color-fg)]">
                  The count is a claim
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                  A Merkle root says nothing about how many leaves sit under
                  it, so the entrant count is taken on the organiser&rsquo;s
                  word. Inflating it produces winning positions no proof can
                  ever match — a lie that cannot be hidden, rather than one
                  that is prevented.
                </p>
              </div>
              <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
                <h3 className="h-display text-[13px] text-[color:var(--color-fg)]">
                  Nothing stops a second attempt
                </h3>
                <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                  An organiser can run several draws and announce the one they
                  liked. Every draw they created is on{" "}
                  <Link
                    href="/draws"
                    className="text-[color:var(--color-accent)] hover:underline"
                  >
                    the ledger
                  </Link>
                  , under their address, whether they mentioned it or not.
                </p>
              </div>
            </div>
          </section>
        </Reveal>

        {/* --- closing --------------------------------------------------- */}
        <Reveal delay={200}>
          <section>
            <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 sm:p-8">
              <h2 className="h-display text-2xl text-[color:var(--color-fg)] sm:text-3xl">
                No sign-up. No keys.{" "}
                <span className="text-[color:var(--color-accent)]">
                  No need to believe us.
                </span>
              </h2>
              <p className="mt-4 max-w-[70ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
                There is no account to create and no wallet to connect to read
                anything here. Running a draw costs a call to a contract with
                no owner; checking one costs nothing at all and does not
                involve this site. {CHAIN.name}, chain id {CHAIN.id}.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/create"
                  className="border border-[color:var(--color-accent)]/50 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] transition-colors hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-bg)]"
                >
                  commit a list
                </Link>
                <Link
                  href="/draws"
                  className="border border-[color:var(--color-border)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-dim)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
                >
                  every draw so far
                </Link>
                <a
                  href={DRAW_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-[color:var(--color-border)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-dim)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
                >
                  read the contract ↗
                </a>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}
