/**
 * Keys, and the counting of what they do.
 *
 * A key here identifies a caller and nothing else. There is no account
 * behind it, no email, no wallet, and no way to trace it back to a person —
 * which is the same promise the rest of the site makes and would be worth
 * very little if the API quietly broke it.
 *
 * Storage note, stated plainly because it changes what you can rely on:
 * this keeps keys and counters in the memory of whichever serverless
 * instance answered. Instances are recycled and there is more than one, so
 * a key can outlive its record and a limit is enforced per instance rather
 * than globally. `KeyStore` is the seam where a durable store goes; nothing
 * above this file knows the difference. Until one is configured, issuance
 * is off by default and the tiers page says so.
 *
 * Server-side only.
 */

import { createHash, randomBytes } from "node:crypto";
import { TIERS, type Tier, type TierId } from "./tiers";

export const ISSUANCE_ENABLED = process.env.PYLON_ISSUE_KEYS === "1";

export type KeyRecord = {
  /** The key itself is never stored — only this. */
  hash: string;
  tier: TierId;
  issuedAt: number;
  /** Total requests seen, for the life of this instance's memory. */
  calls: number;
  lastSeen: number | null;
};

export interface KeyStore {
  issue(tier: TierId): Promise<{ key: string; record: KeyRecord }>;
  find(key: string): Promise<KeyRecord | null>;
  note(hash: string): Promise<void>;
  count(): Promise<number>;
}

const hash = (key: string) => createHash("sha256").update(key).digest("hex");

/** `pk_` then 32 bytes of randomness, base64url. */
function mint(): string {
  return `pk_${randomBytes(24).toString("base64url")}`;
}

class MemoryKeyStore implements KeyStore {
  private byHash = new Map<string, KeyRecord>();

  async issue(tier: TierId) {
    const key = mint();
    const record: KeyRecord = {
      hash: hash(key),
      tier,
      issuedAt: Date.now(),
      calls: 0,
      lastSeen: null,
    };
    this.byHash.set(record.hash, record);
    return { key, record };
  }

  async find(key: string) {
    return this.byHash.get(hash(key)) ?? null;
  }

  async note(h: string) {
    const rec = this.byHash.get(h);
    if (!rec) return;
    rec.calls += 1;
    rec.lastSeen = Date.now();
  }

  async count() {
    return this.byHash.size;
  }
}

const store: KeyStore = new MemoryKeyStore();
export const keyStore = (): KeyStore => store;

// ---------------------------------------------------------------------------

type Window = { count: number; resetAt: number };
const windows = new Map<string, Window>();

/**
 * A fixed window per caller. Callers are identified by key when they send
 * one and by address otherwise, so a key holder is never penalised for
 * sharing an office with someone.
 */
export function take(
  id: string,
  tier: Tier,
): { allowed: boolean; remaining: number; resetAt: number; limit: number } {
  const now = Date.now();
  const w = windows.get(id);

  if (!w || now >= w.resetAt) {
    const fresh = { count: 1, resetAt: now + tier.windowMs };
    windows.set(id, fresh);
    if (windows.size > 10_000) sweep(now);
    return {
      allowed: true,
      remaining: tier.limit - 1,
      resetAt: fresh.resetAt,
      limit: tier.limit,
    };
  }

  w.count += 1;
  return {
    allowed: w.count <= tier.limit,
    remaining: Math.max(0, tier.limit - w.count),
    resetAt: w.resetAt,
    limit: tier.limit,
  };
}

/** Windows are tiny but unbounded; drop the expired ones occasionally. */
function sweep(now: number) {
  for (const [k, v] of windows) if (now >= v.resetAt) windows.delete(k);
}

export type Caller = {
  tier: Tier;
  /** What the limiter counts against. */
  id: string;
  hasKey: boolean;
  /** Present only when the key was recognised. */
  record: KeyRecord | null;
};

const KEY_HEADER = "x-pylon-key";

/**
 * Work out who is calling. An unrecognised key is treated as no key rather
 * than rejected: the caller still gets an answer, on the anonymous tier,
 * and the response says which tier served them.
 */
export async function identify(req: Request): Promise<Caller> {
  const url = new URL(req.url);
  const raw =
    req.headers.get(KEY_HEADER) ??
    url.searchParams.get("key") ??
    null;

  if (raw) {
    const record = await keyStore().find(raw.trim());
    if (record) {
      await keyStore().note(record.hash);
      return {
        tier: TIERS[record.tier],
        id: `k:${record.hash.slice(0, 16)}`,
        hasKey: true,
        record,
      };
    }
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  return { tier: TIERS.anonymous, id: `a:${ip}`, hasKey: false, record: null };
}

/** Standard rate-limit headers, so a client can pace itself. */
export function limitHeaders(
  tier: Tier,
  r: { remaining: number; resetAt: number; limit: number },
): Record<string, string> {
  return {
    "x-ratelimit-tier": tier.id,
    "x-ratelimit-limit": String(r.limit),
    "x-ratelimit-remaining": String(r.remaining),
    "x-ratelimit-reset": String(Math.ceil(r.resetAt / 1000)),
  };
}
