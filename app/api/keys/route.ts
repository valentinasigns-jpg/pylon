import { NextResponse } from "next/server";
import { ISSUANCE_ENABLED, identify, keyStore, limitHeaders, take } from "@/lib/api-keys";
import { TIERS } from "@/lib/tiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Issue a key.
 *
 * POST, no body, nothing asked for. There is no account to create, no
 * address to give, and nothing about the caller is recorded beyond a hash
 * of the key itself — which is the only way to keep the promise the rest of
 * the site makes.
 *
 * Issuance is off unless PYLON_ISSUE_KEYS=1. With the in-memory store a key
 * lives only as long as the instance that minted it, and handing someone a
 * credential that stops working when a container recycles is worse than
 * telling them it is not ready. Configure a durable KeyStore, set the flag,
 * and this starts working with no other change.
 */
export async function POST(req: Request) {
  // Minting is rate-limited like everything else, on the caller's own tier.
  const caller = await identify(req);
  const result = take(caller.id, caller.tier);
  const headers = limitHeaders(caller.tier, result);

  if (!result.allowed) {
    return NextResponse.json(
      { ok: false, reason: "rate-limited", error: "too many requests" },
      { status: 429, headers },
    );
  }

  if (!ISSUANCE_ENABLED) {
    return NextResponse.json(
      {
        ok: false,
        reason: "not-enabled",
        error:
          "Key issuance is not switched on. Keys are held in the memory of a single serverless instance, so one issued now would stop working without warning. Every endpoint answers without a key in the meantime — see /tiers.",
        tier: TIERS.anonymous.id,
        docs: "/tiers",
      },
      { status: 503, headers },
    );
  }

  const { key, record } = await keyStore().issue("key");
  return NextResponse.json(
    {
      ok: true,
      key,
      tier: record.tier,
      limit: TIERS[record.tier].limit,
      windowMs: TIERS[record.tier].windowMs,
      issuedAt: record.issuedAt,
      note: "Send it as the x-pylon-key header, or ?key= on the query string. It is shown once and never stored in a form you could recover it from.",
    },
    { headers },
  );
}

/** What the caller currently is, and what is left of their allowance. */
export async function GET(req: Request) {
  const caller = await identify(req);
  const result = take(caller.id, caller.tier);
  return NextResponse.json(
    {
      ok: true,
      tier: caller.tier.id,
      name: caller.tier.name,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.resetAt,
      recognisedKey: caller.hasKey,
      callsOnThisKey: caller.record?.calls ?? null,
      issuanceEnabled: ISSUANCE_ENABLED,
    },
    { headers: limitHeaders(caller.tier, result) },
  );
}
