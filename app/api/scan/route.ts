import { NextResponse } from "next/server";
import { scanAddress } from "@/lib/scan";
import { memo } from "@/lib/upstream";
import { withLimit } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Internal budgets cap a scan at roughly twenty seconds of upstream work,
// but a cold function on top of a cold explorer was measured at 30.5s in
// production — exactly the previous ceiling. This is headroom, not licence
// to be slow.
export const maxDuration = 45;

/**
 * A scan is six or seven upstream reads. Holding the result briefly means a
 * visitor pasting the same address twice, or two visitors checking the same
 * token, costs one pass rather than two.
 */
const SCAN_TTL_MS = 30000;

export const GET = withLimit(async (req: Request) => {
  const raw = (new URL(req.url).searchParams.get("address") ?? "").trim();

  if (!raw) {
    return NextResponse.json({ ok: false, error: "no address given" });
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    return NextResponse.json({
      ok: false,
      error:
        "That is not a contract address. Paste the 42-character address, starting 0x.",
    });
  }

  try {
    const { value, stale } = await memo(
      `scan:${raw.toLowerCase()}`,
      SCAN_TTL_MS,
      () => scanAddress(raw),
    );
    return NextResponse.json({ ok: true, stale, data: value });
  } catch (err) {
    console.error("[pylon] /api/scan:", (err as Error).message);
    return NextResponse.json({
      ok: false,
      error: `the explorer did not answer: ${(err as Error).message}`,
    });
  }
});
