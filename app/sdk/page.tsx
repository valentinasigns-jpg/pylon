import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { WPylonMast } from "@/components/w-pylon-mast";
import { CodeBlock } from "@/components/code-block";
import { DRAW_REPO, DICE_SITE } from "@/lib/draw";

export const metadata: Metadata = {
  title: "SDK",
  description:
    "TypeScript SDK and Solidity interfaces for PylonDraw. Building a commitment, recomputing a draw and checking a proof all run without a network.",
};

const INSTALL = `npm install @pylon/draw-sdk
# peer dependency, for keccak256 and ABI encoding
npm install viem`;

const API = `import {
  buildTree,      // entrants[]        -> { root, leaves, layers }
  proofFor,       // (tree, index)     -> bytes32[]
  verifyProof,    // (proof, root, i, addr) -> boolean
  leafOf,         // (index, address)  -> bytes32
  selectWinners,  // (randomValue, n, k)   -> number[]
  replayDraw,     // (entrants, randomValue, k) -> full result
} from "@pylon/draw-sdk";`;

const REPLAY = `import { replayDraw } from "@pylon/draw-sdk";

// The list the organiser published, and the value the contract recorded.
// Nothing else, and no network.
const { root, winnerIndices, winners } = replayDraw(
  entrants,
  "0x3ac225168df54212a25c1c01fd35bebfea408fdac2e31ddd6f80a4bbf9a5f1cb",
  3,
);

// If root is not the root on chain, this is not the committed list.
// If winners are not the announced addresses, the announcement is wrong.
// Neither check asks anyone's permission.`;

const SOL = `import {IEntropyConsumer} from "@pylon/draw-sdk/IEntropyConsumer.sol";
import {IDiceEntropy}    from "@pylon/draw-sdk/IDiceEntropy.sol";
import {IPylonDraw}      from "@pylon/draw-sdk/IPylonDraw.sol";

contract Giveaway {
    IPylonDraw public immutable pylon;

    function open(bytes32 root, uint32 n, uint16 k, uint64 at) external payable {
        // 0.0001 ETH — the protocol fee, fixed in bytecode
        pylon.createDraw{value: msg.value}(root, n, k, at, "ipfs://…");
    }
}`;

const VECTORS = `[
  { "n": 20,   "k": 3,  "seed": "a",   "winners": [8, 6, 17] },
  { "n": 50,   "k": 10, "seed": "b",   "winners": [17, 5, 25, 34, 49, …] },
  { "n": 1000, "k": 25, "seed": "zzz", "winners": [363, 357, 314, 475, …] },
  { "n": 9,    "k": 9,  "seed": "a",   "winners": [6, 1, 8, 4, 3, 2, …] },
  { "n": 2,    "k": 1,  "seed": "x",   "winners": [1] }
]`;

export default function SdkPage() {
  return (
    <PageShell
      title="SDK"
      lede="Everything needed to build a commitment, recompute a draw and check a proof — none of it requiring a network, a key or this site. That is the whole design brief."
      aside={<WPylonMast />}
    >
      <section>
        <h2 className="h-display mb-3 text-lg text-[color:var(--color-fg)] sm:text-xl">
          Installing
        </h2>
        <CodeBlock
          file="shell"
          note="viem supplies keccak256 and ABI encoding. Nothing else is pulled in — the SDK is arithmetic and hashing."
        >
          {INSTALL}
        </CodeBlock>
      </section>

      <section>
        <h2 className="h-display mb-3 text-lg text-[color:var(--color-fg)] sm:text-xl">
          The whole surface
        </h2>
        <p className="mb-4 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
          Six functions. There is no client to construct, nothing to configure
          and no state to keep.
        </p>
        <CodeBlock file="index.ts">{API}</CodeBlock>
      </section>

      <section>
        <h2 className="h-display mb-1 text-lg text-[color:var(--color-fg)] sm:text-xl">
          Checking a draw
        </h2>
        <p className="mb-4 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
          The function that matters most, and the one that needs nothing from
          anybody.
        </p>
        <CodeBlock file="verify.ts">{REPLAY}</CodeBlock>
      </section>

      <section>
        <h2 className="h-display mb-3 text-lg text-[color:var(--color-fg)] sm:text-xl">
          Solidity interfaces
        </h2>
        <CodeBlock
          file="Giveaway.sol"
          note={
            <>
              IEntropyConsumer comes from Dice Protocol unmodified, under
              Apache-2.0. IDiceEntropy declares only the four functions
              PylonDraw calls, each checked against the verified ABI of the
              deployed oracle rather than against its documentation — Dice
              publishes an IEntropyV2.sol that imports two files absent from
              their repository and therefore does not compile.
            </>
          }
        >
          {SOL}
        </CodeBlock>
      </section>

      <section>
        <h2 className="h-display mb-1 text-lg text-[color:var(--color-fg)] sm:text-xl">
          Known answers
        </h2>
        <p className="mb-4 max-w-[76ch] text-[12px] leading-relaxed text-[color:var(--color-dim)]">
          The selection algorithm exists three times: in Solidity, in this SDK,
          and in the browser page that lets a visitor check a draw. All three
          have to agree or the central claim of the protocol is worthless, so
          the agreement is tested rather than asserted.
        </p>
        <CodeBlock
          file="selection.json"
          note={
            <>
              These come straight out of PylonDraw.selectWinners. The contract
              repository runs Solidity against TypeScript over the same inputs;
              the site runs its own copy against this file. Either drifting
              fails a check rather than quietly producing different winners.
            </>
          }
        >
          {VECTORS}
        </CodeBlock>
        <div className="mt-4 grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
          <div className="bg-[color:var(--color-surface)] p-5">
            <div className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
              In the contract repository
            </div>
            <pre className="mt-2 overflow-x-auto text-[12px] text-[color:var(--color-fg)]">
              <code>npx hardhat test</code>
            </pre>
            <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--color-dim)]">
              24 tests, including no-repeat selection, a raised oracle fee being
              honoured, and a draw the oracle never answers refunding its payer.
            </p>
          </div>
          <div className="bg-[color:var(--color-surface)] p-5">
            <div className="text-[11px] uppercase tracking-[0.13em] text-[color:var(--color-dim)]">
              In this site&rsquo;s repository
            </div>
            <pre className="mt-2 overflow-x-auto text-[12px] text-[color:var(--color-fg)]">
              <code>npm run check:selection</code>
            </pre>
            <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--color-dim)]">
              Pins the browser&rsquo;s copy to the vectors above, and round-trips
              a Merkle tree including the odd last leaf.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-px border border-[color:var(--color-border)] bg-[color:var(--color-border)] lg:grid-cols-2">
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Source and licence
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Contracts, tests, SDK and the interface files live in one
              repository under Apache-2.0.
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              <a
                href={DRAW_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                {DRAW_REPO.replace("https://", "")} ↗
              </a>
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-[color:var(--color-dim)]">
              Randomness is supplied by{" "}
              <a
                href={DICE_SITE}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                Dice Protocol ↗
              </a>
              , whose interfaces in turn derive from Pyth Entropy. Attribution
              is in the repository&rsquo;s NOTICE file.
            </p>
          </div>
          <div className="bg-[color:var(--color-surface)] p-5 sm:p-6">
            <h2 className="h-display text-[13px] text-[color:var(--color-accent)]">
              Writing your own
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              Encouraged, and the point of publishing the vectors. A verifier
              who runs our code to check our claim has verified nothing.
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
              The algorithm is spelled out step by step in{" "}
              <Link
                href="/docs"
                className="text-[color:var(--color-accent)] hover:underline"
              >
                the docs
              </Link>
              , the leaf format alongside it. Match the vectors above and your
              implementation is correct.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
