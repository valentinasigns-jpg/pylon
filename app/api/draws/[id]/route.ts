import { NextResponse } from "next/server";
import { withLimit } from "@/lib/api-guard";
import { getDraw, deployed } from "@/lib/draw-reads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const GET = withLimit(async (req: Request) => {
  const id = Number(new URL(req.url).pathname.split("/").pop());
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ ok: false, error: "draw ids start at 1" });
  }
  if (!deployed()) {
    return NextResponse.json({
      ok: false,
      reason: "not-deployed",
      error: "PylonDraw has not been deployed, so there is no draw to read.",
    });
  }

  const draw = await getDraw(id);
  if (!draw) {
    return NextResponse.json({
      ok: false,
      reason: "empty",
      error: `no draw number ${id}`,
    });
  }
  return NextResponse.json({ ok: true, ts: Date.now(), draw });
});
