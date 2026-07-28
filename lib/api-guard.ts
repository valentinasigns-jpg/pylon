import { NextResponse } from "next/server";
import { identify, limitHeaders, take } from "./api-keys";

/**
 * Wraps a route handler with identification, accounting and the tier's
 * window.
 *
 * Every answer carries the tier that served it and what is left of the
 * allowance, whether or not the caller sent a key — a limit you can only
 * discover by hitting it is not a limit anyone can plan around.
 */
export function withLimit(
  handler: (req: Request) => Promise<Response> | Response,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const caller = await identify(req);
    const result = take(caller.id, caller.tier);
    const headers = limitHeaders(caller.tier, result);

    if (!result.allowed) {
      const seconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
      return NextResponse.json(
        {
          ok: false,
          reason: "rate-limited",
          error: `${result.limit} requests per minute on the ${caller.tier.name.toLowerCase()} tier. The window resets in ${seconds}s.`,
          tier: caller.tier.id,
          docs: "/tiers",
        },
        { status: 429, headers: { ...headers, "retry-after": String(seconds) } },
      );
    }

    const res = await handler(req);
    for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
    return res;
  };
}
