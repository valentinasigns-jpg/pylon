/**
 * Pins the browser's copy of the selection algorithm to the contract's.
 *
 * A draw is only checkable without trusting this site because the same
 * algorithm runs in the browser as runs on chain. That is worth exactly as
 * much as the guarantee that the two agree — so the vectors in
 * lib/__vectors__/selection.json come straight out of PylonDraw.selectWinners
 * and this fails loudly if the copy here ever drifts from them.
 *
 *   npm run check:selection
 */

import { keccak_256 } from "@noble/hashes/sha3.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  selectWinners,
  buildTree,
  proofFor,
  verifyProof,
  leafOf,
} from "../lib/draw";

const K = (d: Uint8Array) => keccak_256(d);

type Vector = {
  n: number;
  k: number;
  seed: string;
  randomValue: string;
  winners: number[];
};

const vectors: Vector[] = JSON.parse(
  readFileSync(join(process.cwd(), "lib/__vectors__/selection.json"), "utf8"),
);

let failed = 0;
const say = (ok: boolean, what: string, detail = "") => {
  if (!ok) failed++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${what}${detail ? `  ${detail}` : ""}`);
};

console.log("selection matches the contract");
for (const v of vectors) {
  const got = selectWinners(K, v.randomValue, v.n, v.k);
  const same = JSON.stringify(got) === JSON.stringify(v.winners);
  say(same, `n=${v.n} k=${v.k} seed=${v.seed}`, same ? "" : `got ${got.join(",")}`);
}

console.log("\nselection is sane on its own terms");
for (const v of vectors) {
  const got = selectWinners(K, v.randomValue, v.n, v.k);
  say(new Set(got).size === got.length, `n=${v.n} k=${v.k} no repeats`);
  say(
    got.every((i) => i >= 0 && i < v.n),
    `n=${v.n} k=${v.k} every index in range`,
  );
}

console.log("\nmerkle round trip");
const entrants = Array.from(
  { length: 21 },
  (_, i) => `0x${(i + 1).toString(16).padStart(40, "0")}`,
);
const tree = buildTree(K, entrants);
say(/^0x[0-9a-f]{64}$/.test(tree.root), "root is a 32-byte hash", tree.root.slice(0, 12) + "…");
say(
  [0, 1, 7, 20].every((i) => verifyProof(K, proofFor(tree, i), tree.root, i, entrants[i])),
  "every proof verifies, including the odd last leaf",
);
say(
  !verifyProof(K, proofFor(tree, 3), tree.root, 3, entrants[4]),
  "a different address at the same index is rejected",
);
say(
  !verifyProof(K, proofFor(tree, 3), tree.root, 4, entrants[3]),
  "the same address at a different index is rejected",
);
say(
  leafOf(K, 0, entrants[0]) !== leafOf(K, 1, entrants[0]),
  "position is part of the leaf",
);

console.log(
  failed === 0
    ? "\nall checks passed\n"
    : `\n${failed} check(s) failed\n`,
);
process.exit(failed === 0 ? 0 : 1);
