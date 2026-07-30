import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { WCommitReveal } from "@/components/w-commit-reveal";
import { CodeBlock, Step, QA } from "@/components/code-block";
import { Endpoint } from "@/components/endpoint";
import { CHAIN, RPC_URL, BLOCKSCOUT } from "@/lib/config";
import {
  DRAW_ADDRESS,
  DICE_ENTROPY,
  DICE_SITE,
  DRAW_REPO,
  PROTOCOL_FEE_ETH,
  DICE_FEE_ETH_TODAY,
  MAX_WINNERS,
  explorerAddress,
} from "@/lib/draw";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "How to run a verifiable draw: the calls, the selection algorithm, the entrant list format, and honest answers to what happens when things go wrong.",
};

const SOLIDITY = `// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface IPylonDraw {
    function createDraw(
        bytes32 entrantsRoot,
        uint32  entrantCount,
        uint16  winnerCount,
        uint64  drawAt,
        string calldata metadataURI
    ) external payable returns (uint256 drawId);

    function executeDraw(uint256 drawId) external payable;
    function retryDraw(uint256 drawId) external;

    function getDraw(uint256 drawId) external view returns (
        bytes32 entrantsRoot,
        bytes32 randomValue,
        uint32[] memory winnerIndices,
        uint8 status
    );

    function verifyWinner(
        uint256 drawId,
        uint32 index,
        address entrant,
        bytes32[] calldata proof
    ) external view returns (bool);
}`;

const TS = `import { buildTree, selectWinners, proofFor } from "@pylon/draw-sdk";

// Order is part of the commitment: entrant i is bound to position i.
const entrants = ["0x…", "0x…", "0x…"];
const { root } = buildTree(entrants);

// Publish the list exactly as it stands above, then commit the root.
await pylon.write.createDraw(
  [root, entrants.length, 3, BigInt(drawAt), "ipfs://…/entrants.json"],
  { value: parseEther("0.0001") },
);

// After drawAt, anyone may run it. The oracle fee is read live.
const fee = await dice.read.getFeeV2([provider, 120_000]);
await pylon.write.executeDraw([drawId], { value: fee });

// Once revealed, recompute the result from published data alone.
const winners = selectWinners(randomValue, entrants.length, 3);
const proof = proofFor(buildTree(entrants), winners[0]);`;

const ALGO = `for i in 0 … k-1:
    j = i + keccak256(abi.encode(randomValue, i)) % (n - i)

    winner[i]  = whatever value currently sits at position j
    position j = whatever value currently sits at position i

    # position i is finished with and never read again`;

const LIST = `{
  "entrants": [
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333"
  ]
}`;

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[color:var(--color-border)] py-2.5 last:border-b-0">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-dim)]">
        {k}
      </dt>
      <dd className="min-w-0 break-all text-right text-[color:var(--color-fg)]">
        {children}
      </dd>
    </div>
  );
}

export default function DocsPage() {
  return (
    <PageShell
      title="Docs"
      lede="Three calls, one pure function, and a list you publish yourself. Everything a verifier needs is on chain or in that file — nothing about checking a draw goes through this site."
      aside={<WCommitReveal />}
    >
      <section>
        <h2 className="h-display mb-3 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
          Contracts and network
        </h2>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
          <div className="bg-[color:var(--color-surface)] p-5">
            <dl className="space-y-0 text-[12px]">
              <Row k="PylonDraw">
                {DRAW_ADDRESS ? (
                  <a
                    href={explorerAddress(DRAW_ADDRESS)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[color:var(--color-accent)] hover:underline"
                  >
                    {DRAW_ADDRESS} ↗
                  </a>
                ) : (
                  <span className="text-[color:var(--color-wait)]">
                    soon — source is in the{" "}
                    <a
                      href={DRAW_REPO}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[color:var(--color-accent)] hover:underline"
                    >
                      repository
                    </a>
                  </span>
                )}
              </Row>
              <Row k="DiceEntropy">
                <a
                  href={explorerAddress(DICE_ENTROPY)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[color:var(--color-accent)] hover:underline"
                >
                  {DICE_ENTROPY} ↗
                </a>
              </Row>
              <Row k="Chain">{`${CHAIN.name} · id ${CHAIN.id} · ${CHAIN.stack}`}</Row>
              <Row k="Explorer">
                <a
                  href={BLOCKSCOUT}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[color:var(--color-accent)] hover:underline"
                >
                  {BLOCKSCOUT} ↗
                </a>
              </Row>
            </dl>
          </div>
          <div className="bg-[color:var(--color-surface)] p-5">
            <dl className="space-y-0 text-[12px]">
              <Row k="Protocol fee">{`${PROTOCOL_FEE_ETH} ETH per draw, fixed in bytecode`}</Row>
              <Row k="Oracle fee">
                <>
                  read live via{" "}
                  <span className="text-[color:var(--color-fg)]">getFeeV2</span>{" "}
                  — {DICE_FEE_ETH_TODAY} ETH today
                </>
              </Row>
              <Row k="Winners">{`up to ${MAX_WINNERS} per draw; the entrant list has no ceiling`}</Row>
              <Row k="Callback gas">120,000 — the callback stores one word</Row>
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-[color:var(--color-dim)]">
              Never hardcode the oracle fee. Dice exposes{" "}
              <span className="text-[color:var(--color-fg)]">setFee</span>, so a
              stored figure breaks every draw the day they change it.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="h-display mb-1 text-lg text-[color:var(--color-fg)] sm:text-xl">
          Running a draw
        </h2>
        <p className="mb-5 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
          Commit, draw, reveal. Only the middle step costs anything.
        </p>

        <div className="space-y-6">
          <Step n="01" title="Commit the list">
            <p>
              Build a Merkle tree over the entrants in the order you intend to
              publish them, and send the root with the terms. From that moment
              the list is fixed: nothing can be added or removed without the
              root changing, and the root is already on chain.
            </p>
            <p>
              Publish the list itself somewhere durable and name that location
              in{" "}
              <span className="text-[color:var(--color-fg)]">metadataURI</span>.
              A commitment nobody can open is not a commitment.
            </p>
          </Step>

          <Step n="02" title="Draw">
            <p>
              After{" "}
              <span className="text-[color:var(--color-fg)]">drawAt</span>,
              anyone may call{" "}
              <span className="text-[color:var(--color-fg)]">executeDraw</span>{" "}
              with the current oracle fee. Not only the organiser — a committed
              draw cannot be abandoned because the outcome stopped being
              convenient.
            </p>
            <p>
              If the oracle never answers, anyone may call{" "}
              <span className="text-[color:var(--color-fg)]">retryDraw</span>.
              The fee goes back to whoever paid it and the draw returns to
              committed, ready to run again.
            </p>
          </Step>

          <Step n="03" title="Reveal, then check">
            <p>
              Dice calls back with a random value and the contract records it.
              The winners are not stored — they follow from the value by a pure
              function, so anybody can compute them from published data with no
              contract call at all.
            </p>
          </Step>
        </div>

        <div className="mt-6 space-y-4">
          <CodeBlock
            file="draw.ts"
            note="Three writes and one pure read. The last two lines involve no network."
          >
            {TS}
          </CodeBlock>
          <CodeBlock file="IPylonDraw.sol">{SOLIDITY}</CodeBlock>
        </div>
      </section>

      <section>
        <h2 className="h-display mb-1 text-lg text-[color:var(--color-fg)] sm:text-xl">
          The selection algorithm
        </h2>
        <p className="mb-4 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
          Written out in full, because a verifier who has to read our code to
          know what to check is not independent. Implement this in whatever you
          like and you should get the same winners.
        </p>
        <CodeBlock
          file="partial Fisher-Yates"
          note={
            <>
              A virtual array of every position from 0 to n-1. Only positions
              that were actually swapped differ from their own index, so the
              array is never built — at most k overrides exist whether the list
              holds twenty names or a million. A repeat is impossible because
              each step draws from a range that excludes every position already
              taken.
            </>
          }
        >
          {ALGO}
        </CodeBlock>
        <p className="mt-3 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
          The same function exists three times — in the contract, in the SDK,
          and in the page you are reading — and a known-answer test fails if any
          of them drifts. See{" "}
          <Link
            href="/sdk"
            className="text-[color:var(--color-accent)] hover:underline"
          >
            the SDK
          </Link>{" "}
          for the implementation and the vectors.
        </p>
      </section>

      <section>
        <h2 className="h-display mb-1 text-lg text-[color:var(--color-fg)] sm:text-xl">
          The entrant list
        </h2>
        <p className="mb-4 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
          A JSON array of addresses, in the committed order. That is the whole
          format; there is nothing else to get right.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CodeBlock file="entrants.json">{LIST}</CodeBlock>
          <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
            <h3 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Rules that actually matter
            </h3>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              <li>
                <span className="text-[color:var(--color-fg)]">
                  Order is binding.
                </span>{" "}
                Entrant seven is bound to position seven. Sort the file later
                and the root no longer matches.
              </li>
              <li>
                <span className="text-[color:var(--color-fg)]">
                  Case does not matter.
                </span>{" "}
                Addresses are lower-cased before hashing, so a checksummed file
                and a lower-case one give the same root.
              </li>
              <li>
                <span className="text-[color:var(--color-fg)]">
                  Repeats are kept.
                </span>{" "}
                A duplicate holds two positions and two chances. That is a
                legitimate way to weight entries and is never silently undone.
              </li>
              <li>
                <span className="text-[color:var(--color-fg)]">
                  A leaf is double-hashed.
                </span>{" "}
                <span className="break-all text-[color:var(--color-fg)]">
                  keccak(keccak(abi.encode(uint32 index, address entrant)))
                </span>{" "}
                — so no internal node of the tree can be passed off as a leaf.
              </li>
              <li>
                <span className="text-[color:var(--color-fg)]">
                  Odd nodes rise unchanged.
                </span>{" "}
                A lone node at the end of a layer is carried up, never
                duplicated. Duplicating it is the known way to make two
                different lists share a root.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="h-display mb-1 text-lg text-[color:var(--color-fg)] sm:text-xl">
          What if
        </h2>
        <p className="mb-2 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
          The questions worth asking, answered without hedging.
        </p>
        <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-5">
          <dl>
            <QA q="What if the oracle never answers?">
              <p>
                The draw sits in the waiting state. After Dice&rsquo;s refund
                delay — six L1 blocks, roughly sixty to ninety seconds — anyone
                can call{" "}
                <span className="text-[color:var(--color-fg)]">retryDraw</span>.
                The oracle fee returns to whoever paid it and the draw goes back
                to committed. Nothing is stranded and nobody has to be trusted
                to release it.
              </p>
            </QA>
            <QA q="What if the organiser disappears before the draw?">
              <p>
                It makes no difference. Once the time passes, anyone can run the
                draw — a winner, a bystander, you. The organiser is needed to
                commit and to hand out whatever they promised, not to produce
                the result.
              </p>
            </QA>
            <QA q="What if the organiser stuffs the list with their own addresses?">
              <p>
                The draw will be impeccably fair among those addresses, which is
                exactly as useless as it sounds. This protocol fixes the
                selection, not the list. Judging whether the right names went in
                is your job, and cryptography does not help with it.
              </p>
            </QA>
            <QA q="What if they declare more entrants than the list holds?">
              <p>
                A Merkle root says nothing about how many leaves are under it,
                so the count is taken on the organiser&rsquo;s word. Inflating
                it lets positions win for which no proof can ever be produced —
                which anybody notices the first time they check. It is a lie
                that cannot be hidden, not a lie that is prevented.
              </p>
            </QA>
            <QA q="What if they run several draws and only mention one?">
              <p>
                Every draw they created is on{" "}
                <Link
                  href="/draws"
                  className="text-[color:var(--color-accent)] hover:underline"
                >
                  the ledger
                </Link>
                , under their address, in order. Nothing is filtered, which is
                the only reason that list is worth reading.
              </p>
            </QA>
            <QA q="What if this site goes down?">
              <p>
                Checking a draw does not involve it. The contract is on chain,
                the list is wherever the organiser put it, and the algorithm is
                written out above. This site is a convenience; the guarantee
                does not live here.
              </p>
            </QA>
            <QA q="Can the contract be changed, paused, or drained?">
              <p>
                No owner, no pause, no upgrade path, no admin key. The fee
                destination is fixed at deployment and cannot be repointed. The
                contract never holds a prize and has no function that would let
                it — entrants pay nothing and cannot.
              </p>
            </QA>
            <QA q="Is this gambling?">
              <p>
                No, and it is not built to become it. There is no stake, no
                pool, no ticket and no way to send the contract money except the
                fee for running a draw. It picks names out of a list; the
                organiser gives out whatever they said they would, by whatever
                means they choose.
              </p>
            </QA>
          </dl>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Reading the chain over HTTP
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              The endpoints that feed this site are open and answer without a
              key — draws, blocks, base fee, tokenised equities. Every response
              reports the tier that served it and what is left of the allowance.
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              Limits and keys are on{" "}
              <Link
                href="/tiers"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                the tiers page
              </Link>
              . Upstream health is on{" "}
              <Link
                href="/status"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                status
              </Link>
              .
            </p>
          </div>
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Talking to the node directly
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Nothing here is required. The chain&rsquo;s own RPC serves every
              read this site makes.
            </p>
            <Endpoint
              url={RPC_URL}
              method="POST"
              note="JSON-RPC 2.0. A browser GET sends an empty body and the node answers with a parse error — send a POST."
              className="mt-3"
            />
            <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              Randomness comes from{" "}
              <a
                href={DICE_SITE}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                Dice Protocol ↗
              </a>
              , whose oracle PylonDraw is a customer of.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
