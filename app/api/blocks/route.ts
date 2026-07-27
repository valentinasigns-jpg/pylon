import { NextResponse } from "next/server";
import { rpcBatch, hexToNum, type RawBlock } from "@/lib/rpc";
import { memo } from "@/lib/upstream";
import { getHeight } from "@/lib/chain-reads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const COUNT = 15;
const TTL_MS = 3000;
// Sized against maxDuration: two attempts at this deadline still land well
// inside the ceiling, so a single dropped connection degrades to a retry
// rather than to the platform killing the request.
const BATCH_TIMEOUT_MS = 6000;

async function load() {
  // Shared with the other routes, so this is usually already in memory.
  const height = await getHeight();

  const calls = Array.from({ length: COUNT }, (_, i) => ({
    method: "eth_getBlockByNumber",
    params: [`0x${(height - i).toString(16)}`, false] as unknown[],
  }));

  const raw = await rpcBatch<RawBlock>(calls, {
    timeoutMs: BATCH_TIMEOUT_MS,
  });

  return raw.filter(Boolean).map((b) => ({
    number: hexToNum(b.number),
    hash: b.hash,
    timestamp: hexToNum(b.timestamp),
    txCount: b.transactions?.length ?? 0,
    gasUsed: hexToNum(b.gasUsed),
    gasLimit: hexToNum(b.gasLimit),
    baseFeeWei: b.baseFeePerGas ? hexToNum(b.baseFeePerGas) : null,
  }));
}

export async function GET() {
  try {
    const { value, stale } = await memo("blocks", TTL_MS, load);
    return NextResponse.json({
      ok: true,
      stale,
      ts: Date.now(),
      blocks: value,
    });
  } catch (err) {
    console.error("[pylon] /api/blocks:", (err as Error).message);
    return NextResponse.json(
      { ok: false, error: (err as Error).message, ts: Date.now(), blocks: [] },
      { status: 200 },
    );
  }
}
