/**
 * API tiers.
 *
 * Two of these are real and in force today. The rest are declared so the
 * shape of the thing exists — limits, accounting and the gate they would
 * hang off — without any of them being sellable. Nothing on this site takes
 * payment, and `entitlement` below is the single place that would change if
 * it ever did.
 */

export type TierId = "anonymous" | "key" | "metered" | "holder";

export type Tier = {
  id: TierId;
  name: string;
  /** Requests allowed inside one window. */
  limit: number;
  windowMs: number;
  /** Whether a caller can actually be on this tier right now. */
  active: boolean;
  blurb: string;
  /** What it would cost, once there is something to charge for. */
  price: string | null;
};

export const WINDOW_MS = 60_000;

/**
 * The ceilings are set from measurement, not from a round number that
 * sounded about right. One open dashboard tab on this site costs roughly
 * sixty requests a minute all by itself — the header, the heartbeat, the
 * gauges, the monitor, the block feed, the chart and the equities grid each
 * poll on their own clock. A limit that a visitor trips by using the site
 * as intended is a bug wearing a policy's clothes, so the tier without a
 * key sits comfortably above several such tabs.
 */

export const TIERS: Record<TierId, Tier> = {
  anonymous: {
    id: "anonymous",
    name: "No key",
    limit: 300,
    windowMs: WINDOW_MS,
    active: true,
    blurb:
      "Every endpoint answers without a key. Counted against the calling address, and set high enough that several tabs of this site never come near it.",
    price: null,
  },
  key: {
    id: "key",
    name: "Key",
    limit: 3000,
    windowMs: WINDOW_MS,
    active: true,
    blurb:
      "Issued on request, to nobody in particular — no account, no email, no wallet. Counted against the key instead of the address, so it survives a shared office or a changing IP.",
    price: null,
  },
  metered: {
    id: "metered",
    name: "Metered",
    limit: 0,
    windowMs: WINDOW_MS,
    active: false,
    blurb:
      "A per-call ceiling above the free key, for something that polls hard or fans out. Declared, not sold: there is no billing here and no way to buy it.",
    price: null,
  },
  holder: {
    id: "holder",
    name: "Holder",
    limit: 0,
    windowMs: WINDOW_MS,
    active: false,
    blurb:
      "A ceiling that follows a token balance rather than an invoice. There is no token, so there is nothing to hold and nothing to check.",
    price: null,
  },
};

export const ACTIVE_TIERS = Object.values(TIERS).filter((t) => t.active);
export const PLANNED_TIERS = Object.values(TIERS).filter((t) => !t.active);

/**
 * The extension point, and the only one.
 *
 * Everything upstream of this — issuing keys, counting requests, enforcing a
 * window — is finished and running. What is deliberately absent is any
 * reason to return something other than the free tiers: no payment
 * processor, no balance lookup, no invoice. A future implementation reads
 * whatever it needs about `key` and returns the tier it has earned. Until
 * then a key gets the key tier and everyone else gets the anonymous one,
 * and no code path anywhere can produce a paid result.
 */
export function entitlement(key: string | null): Tier {
  return key ? TIERS.key : TIERS.anonymous;
}
