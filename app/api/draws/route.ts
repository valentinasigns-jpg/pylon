import { NextResponse } from "next/server";
import { withLimit } from "@/lib/api-guard";
import { getRecentDraws, deployed } from "@/lib/draw-reads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const GET = withLimit(async () => {
  if (!deployed()) {
    return NextResponse.json({
      ok: false,
      reason: "not-deployed",
      error:
        "PylonDraw has not been deployed, so there are no draws to read. This is not an outage.",
      ts: Date.now(),
      draws: [],
    });
  }

  const draws = await getRecentDraws(20);
  if (draws === null) {
    return NextResponse.json({
      ok: false,
      reason: "unreachable",
      error: "the node did not answer",
      ts: Date.now(),
      draws: [],
    });
  }

  return NextResponse.json({
    ok: true,
    reason: draws.length === 0 ? "empty" : null,
    ts: Date.now(),
    source: "rpc" as const,
    fellBack: false,
    draws,
  });
});
