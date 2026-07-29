import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, Prose } from "@/components/page-shell";
import { CHAIN } from "@/lib/config";
import { DICE_SITE, DRAW_REPO, PROTOCOL_FEE_ETH, MAX_WINNERS } from "@/lib/draw";

export const metadata: Metadata = {
  title: "Whitepaper",
  description:
    "The mechanics of PylonDraw and its trust model in full, including what the protocol cannot prove and which assumptions a reader is being asked to accept.",
};

export default function WhitepaperPage() {
  return (
    <PageShell
      title="Whitepaper"
      lede={`What the protocol does, how, and — at equal length — what it does not do. The second half is the part worth reading.`}
    >
      <Prose>
        <h2>Abstract</h2>
        <p>
          Giveaways are settled on trust. An organiser collects entries, picks
          winners somewhere nobody can see, and announces a result that cannot
          be distinguished from a fabricated one. PylonDraw removes exactly one
          link from that chain: it makes the selection from a fixed list
          reproducible by anyone, using a random value the organiser did not
          choose and could not predict. It removes nothing else, and this
          document is explicit about what remains.
        </p>

        <h2>1 · The problem, stated narrowly</h2>
        <p>
          Three things can go wrong in a draw. The list can be wrong. The
          selection can be rigged. The announcement can be false. These are
          separate problems and they need separate remedies.
        </p>
        <p>
          A protocol can fix the second and detect the third. It cannot fix the
          first, because no contract knows who deserved to be in a list. Claims
          that a draw is &ldquo;provably fair&rdquo; usually elide this, and the
          elision is the interesting part.
        </p>

        <h2>2 · Mechanics</h2>
        <p>
          <strong>Commit.</strong> The organiser publishes a Merkle root over
          the entrant list along with the winner count and the earliest time
          the draw may run. The root goes on chain before any randomness
          exists. Leaves are{" "}
          <code>keccak(keccak(abi.encode(uint32 index, address entrant)))</code>{" "}
          — double-hashed so no internal node can be presented as a leaf, and
          index-bound so a position cannot be reassigned to a different
          address.
        </p>
        <p>
          <strong>Draw.</strong> After that time, anyone may trigger the draw
          and pay the oracle fee. Permissionlessness here is not ideological:
          if only the organiser could run it, a draw whose committed list had
          become inconvenient would simply never happen.
        </p>
        <p>
          <strong>Reveal.</strong>{" "}
          <a href={DICE_SITE} target="_blank" rel="noopener noreferrer">
            Dice Protocol
          </a>{" "}
          returns a random value through a two-party commit-reveal scheme, and
          the contract stores it. Nothing else is stored. The winners are a
          pure function of the value, the entrant count and the winner count,
          so they can be recomputed by anyone at any time — including a decade
          later, on a machine with no network.
        </p>

        <h2>3 · Selection</h2>
        <p>
          Partial Fisher-Yates over a virtual array of positions{" "}
          <code>0 … n-1</code>. At step <code>i</code> a position{" "}
          <code>j</code> is drawn from <code>[i, n)</code> using{" "}
          <code>keccak256(abi.encode(randomValue, i))</code>; the values at{" "}
          <code>i</code> and <code>j</code> swap; whatever now sits at{" "}
          <code>i</code> is the i-th winner.
        </p>
        <p>
          Only positions that were actually swapped differ from their own
          index, so the array is never materialised — at most{" "}
          <code>k</code> overrides are recorded whether the list holds twenty
          names or a million. Repeats are impossible by construction rather
          than by rejection: each step draws from a range that already excludes
          every position taken.
        </p>
        <p>
          Two consequences worth naming. Selection is deliberately kept out of
          the oracle callback, which runs under a fixed gas ceiling — computing
          winners there would put an unbounded loop where it can only fail, and
          would cap how many entrants a draw could have. And because the
          function is pure, the protocol&rsquo;s central claim does not depend
          on the contract being reachable.
        </p>

        <h2>4 · Economics</h2>
        <p>
          <strong>{PROTOCOL_FEE_ETH} ETH</strong> per draw, fixed in bytecode.
          There is nobody who could change it. The destination is set once at
          deployment and is immutable, so <code>withdrawFees</code> is callable
          by anyone and the money can still only travel to one address.
        </p>
        <p>
          The oracle fee is read live from Dice at request time and never
          stored. Dice exposes <code>setFee</code> and{" "}
          <code>setProviderFee</code>; a consumer holding a hardcoded figure
          would be permanently unable to draw the day they used either. This is
          not a hypothetical — it was found by reading the deployed contract
          rather than its documentation.
        </p>
        <p>
          Refunds arriving from Dice are accounted separately from fees, so a
          refund in flight can never be withdrawn as income.
        </p>

        <h2>5 · Trust model</h2>
        <p>
          What follows is the list of things a reader is being asked to accept.
          It is not short, and shortening it would be the dishonest move.
        </p>
        <p>
          <strong>The organiser writes the list.</strong> Nothing on chain
          knows who should be in it. A list of the organiser&rsquo;s own
          addresses produces a draw that is impeccably fair and completely
          worthless. This protocol fixes the selection, not the eligibility.
        </p>
        <p>
          <strong>The entrant count is a claim.</strong> A Merkle root reveals
          nothing about how many leaves sit beneath it, so{" "}
          <code>entrantCount</code> is taken on the organiser&rsquo;s word.
          Inflating it produces winning positions for which no proof can exist.
          That is detectable by anyone who checks, which makes it a lie that
          cannot be hidden rather than one that is prevented.
        </p>
        <p>
          <strong>Repeated draws are possible.</strong> An organiser can create
          several and announce the one they liked. The only defence is that
          every draw they created appears on{" "}
          <Link href="/draws">the ledger</Link> under their address, unfiltered.
        </p>
        <p>
          <strong>The oracle is a dependency.</strong> Dice&rsquo;s
          commit-reveal means neither the requester nor the provider alone
          decides the outcome, but a reader is trusting that construction and
          the keeper that operates it. If Dice stops answering, draws stall and
          refund; they do not silently produce a worse random number.
        </p>
        <p>
          <strong>Publication is off chain.</strong> The list lives wherever
          the organiser put it. If that location goes away, the root remains
          but nobody can open it — the commitment becomes unfalsifiable rather
          than false, which is a different and lesser failure, but a failure.
        </p>
        <p>
          <strong>Timing is a floor, not a schedule.</strong> Nothing runs a
          draw automatically. It happens when somebody calls it.
        </p>

        <h2>6 · What an attacker cannot do</h2>
        <p>
          Change the list after committing, without the root changing. Predict
          the random value at commit time. Bias it at reveal time from either
          side alone. Select the same position twice. Suppress a draw that has
          been committed and whose time has passed. Persuade the contract to
          hand out money, since it holds none beyond the fees and can only send
          those to one fixed address. Upgrade, pause or take ownership of
          anything.
        </p>

        <h2>7 · Scope</h2>
        <p>
          Up to {MAX_WINNERS} winners per draw; the entrant list has no
          ceiling. Deployed on {CHAIN.name}, chain id {CHAIN.id}. Immutable, no
          owner, no admin.
        </p>
        <p>
          This is a tool for choosing winners from a list. It is not a game of
          chance and is not designed to become one: entrants pay nothing, no
          pool is accumulated, no ticket is sold, and the contract has no
          function that would accept a stake. Whatever is being given away
          belongs to the organiser and never touches this code.
        </p>

        <h2>8 · Source</h2>
        <p>
          Contract, tests, SDK and interfaces are at{" "}
          <a href={DRAW_REPO} target="_blank" rel="noopener noreferrer">
            {DRAW_REPO.replace("https://", "")}
          </a>{" "}
          under Apache-2.0. The selection algorithm is written out in{" "}
          <Link href="/docs">the docs</Link> so that an independent
          implementation is possible, and known-answer vectors are published in{" "}
          <Link href="/sdk">the SDK</Link> so that one can be checked.
        </p>
        <p>
          PYLON is an independent project. It is not affiliated with, endorsed
          by, sponsored by, or connected to Robinhood Markets, Inc., Robinhood
          Crypto, or any of their subsidiaries. The name &ldquo;
          {CHAIN.name}&rdquo; refers to the public blockchain network only.
          Nothing here is financial advice, an offer, or a solicitation.
        </p>
      </Prose>
    </PageShell>
  );
}
