import { NextResponse } from "next/server";
import { rpcBatch, hexToNum, type RawBlock } from "@/lib/rpc";
import { memo } from "@/lib/upstream";
import { getHeight } from "@/lib/chain-reads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SAMPLES = 100;
const STRIDE = 4;
// The heaviest call on the site by far, and the slowest-moving series.
// A longer TTL keeps it off the critical path for most visitors.
const TTL_MS = 12000;
// A hundred blocks is the heaviest read on the site, so it gets more room
// than the others — but still bounded well inside maxDuration.
const BATCH_TIMEOUT_MS = 10000;

async function load() {
  const height = await getHeight();

  const calls = Array.from({ length: SAMPLES }, (_, i) => ({
    method: "eth_getBlockByNumber",
    params: [
      `0x${(height - (SAMPLES - 1 - i) * STRIDE).toString(16)}`,
      false,
    ] as unknown[],
  }));

  const raw = await rpcBatch<RawBlock>(calls, {
    timeoutMs: BATCH_TIMEOUT_MS,
  });

  return raw
    .filter(Boolean)
    .map((b) => ({
      block: hexToNum(b.number),
      baseFeeWei: b.baseFeePerGas ? hexToNum(b.baseFeePerGas) : null,
      gasUsed: hexToNum(b.gasUsed),
      txCount: b.transactions?.length ?? 0,
    }))
    .filter((p) => p.baseFeeWei !== null);
}

export async function GET() {
  try {
    const { value, stale } = await memo("gas", TTL_MS, load);
    return NextResponse.json({
      ok: true,
      stale,
      ts: Date.now(),
      stride: STRIDE,
      points: value,
    });
  } catch (err) {
    console.error("[pylon] /api/gas:", (err as Error).message);
    return NextResponse.json(
      { ok: false, error: (err as Error).message, ts: Date.now(), points: [] },
      { status: 200 },
    );
  }
}
