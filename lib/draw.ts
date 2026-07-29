/**
 * The draw protocol: addresses, constants and the selection algorithm.
 *
 * The algorithm here is the same one in PylonDraw.sol, and a test in the
 * contract repository runs both over the same inputs and fails if they ever
 * disagree. It lives on the client on purpose — verifying a draw must not
 * require asking this site anything, or the site becomes the thing you have
 * to trust and the protocol is decorative.
 */

import { CHAIN, BLOCKSCOUT } from "./config";

/**
 * Where PylonDraw is deployed, once it is.
 *
 * Null until then, and every page that reads it says so plainly rather than
 * showing a draw that did not happen. Set this and the site comes alive; no
 * other change is needed.
 */
export const DRAW_ADDRESS: string | null =
  process.env.NEXT_PUBLIC_PYLON_DRAW_ADDRESS?.trim() || null;

/** Dice Protocol's oracle. Verified on chain, not a proxy. */
export const DICE_ENTROPY = "0xd8a0680e7699526b57140ed4eafdcc7219dc0a0c";
export const DICE_SITE = "https://diceprotocol.world";

export const DRAW_REPO = "https://github.com/valentinasigns-jpg/pylon-draw";

/** Fixed in bytecode. There is nobody who could change it. */
export const PROTOCOL_FEE_ETH = "0.0001";

/**
 * Dice's own price is read from their contract at request time, never
 * hardcoded — they expose setFee, and a stale constant would brick every
 * draw the day they used it. This figure is what they charge today and is
 * shown for orientation only.
 */
export const DICE_FEE_ETH_TODAY = "0.000025";

export const MAX_WINNERS = 1000;

export const explorerAddress = (a: string) => `${BLOCKSCOUT}/address/${a}`;

export type DrawStatus = 0 | 1 | 2 | 3;

export const STATUS_LABEL: Record<DrawStatus, string> = {
  0: "no such draw",
  1: "committed",
  2: "waiting on the oracle",
  3: "drawn",
};

// ---------------------------------------------------------------------------
// Selection — a mirror of selectWinners in PylonDraw.sol
// ---------------------------------------------------------------------------

const HEX = "0123456789abcdef";

function toHex(bytes: Uint8Array): string {
  let out = "0x";
  for (const b of bytes) out += HEX[b >> 4] + HEX[b & 15];
  return out;
}

function fromHex(hex: string): Uint8Array {
  const h = hex.replace(/^0x/, "");
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Left-pad to 32 bytes, the way abi.encode lays out a word. */
function word(value: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0 && v > 0n; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export { toHex, fromHex, word, concat };

/**
 * Partial Fisher-Yates over a virtual array [0 … n-1].
 *
 * At step i a position j is drawn from [i, n), the values at i and j swap,
 * and whatever now sits at i is the i-th winner. Only positions actually
 * swapped differ from their own index, so the array is never built — at
 * most k overrides exist whether the list holds twenty names or a million.
 *
 * A repeat is impossible: each step draws from a range that excludes every
 * position already taken.
 *
 * `keccak` is passed in rather than imported so this file stays free of a
 * hashing dependency and the caller can supply whichever implementation it
 * already has loaded.
 */
export function selectWinners(
  keccak: (data: Uint8Array) => Uint8Array,
  randomValue: string,
  n: number,
  k: number,
): number[] {
  if (k > n) throw new Error("more winners than entrants");
  const rv = fromHex(randomValue);
  if (rv.length !== 32) throw new Error("random value must be 32 bytes");

  const winners: number[] = [];
  const overrides = new Map<number, number>();
  const at = (pos: number) => overrides.get(pos) ?? pos;

  for (let i = 0; i < k; i++) {
    // abi.encode(bytes32, uint256) — two words, no packing.
    const digest = keccak(concat(rv, word(BigInt(i))));
    let h = 0n;
    for (const b of digest) h = (h << 8n) | BigInt(b);

    const j = i + Number(h % BigInt(n - i));
    const atI = at(i);
    const atJ = at(j);
    winners.push(atJ);
    overrides.set(j, atI);
  }
  return winners;
}

/** Leaf = keccak(keccak(abi.encode(uint32 index, address entrant))). */
export function leafOf(
  keccak: (data: Uint8Array) => Uint8Array,
  index: number,
  entrant: string,
): string {
  const addr = fromHex(entrant.toLowerCase());
  if (addr.length !== 20) throw new Error(`not an address: ${entrant}`);
  const addrWord = new Uint8Array(32);
  addrWord.set(addr, 12);
  return toHex(keccak(keccak(concat(word(BigInt(index)), addrWord))));
}

function hashPair(
  keccak: (data: Uint8Array) => Uint8Array,
  a: string,
  b: string,
): string {
  const [lo, hi] = a.toLowerCase() <= b.toLowerCase() ? [a, b] : [b, a];
  return toHex(keccak(concat(fromHex(lo), fromHex(hi))));
}

export type Tree = { root: string; leaves: string[]; layers: string[][] };

/**
 * Build the commitment. Order is part of what is committed to — entrant i
 * is bound to position i — so the list must be published in this order or
 * nobody can rebuild the tree.
 *
 * An odd node is carried up unchanged rather than duplicated. Duplicating
 * it is the well-known way to make two different lists share a root.
 */
export function buildTree(
  keccak: (data: Uint8Array) => Uint8Array,
  entrants: string[],
): Tree {
  if (entrants.length === 0) throw new Error("no entrants");
  const leaves = entrants.map((a, i) => leafOf(keccak, i, a));
  const layers: string[][] = [leaves];
  let level = leaves;
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? hashPair(keccak, level[i], level[i + 1]) : level[i]);
    }
    layers.push(next);
    level = next;
  }
  return { root: level[0], leaves, layers };
}

export function proofFor(tree: Tree, index: number): string[] {
  const proof: string[] = [];
  let i = index;
  for (let l = 0; l < tree.layers.length - 1; l++) {
    const layer = tree.layers[l];
    const sib = i % 2 === 0 ? i + 1 : i - 1;
    if (sib < layer.length) proof.push(layer[sib]);
    i = Math.floor(i / 2);
  }
  return proof;
}

export function verifyProof(
  keccak: (data: Uint8Array) => Uint8Array,
  proof: string[],
  root: string,
  index: number,
  entrant: string,
): boolean {
  let computed = leafOf(keccak, index, entrant);
  for (const p of proof) computed = hashPair(keccak, computed, p);
  return computed.toLowerCase() === root.toLowerCase();
}

export const CHAIN_NAME = CHAIN.name;
