import { NextResponse } from "next/server";
import { rpcBatch, hexToNum, type RawBlock } from "@/lib/rpc";
import { memo, withFallback, type Trace } from "@/lib/upstream";
import { getHeight, scoutBlocks } from "@/lib/chain-reads";
import { withLimit } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SAMPLES = 60;
const STRIDE = 6;
// The heaviest call on the site by far, and the slowest-moving series.
// A longer TTL keeps it off the critical path for most visitors.
const TTL_MS = 12000;
// The indexer is standing by, so the node gets one short attempt rather
// than a long deadline and a retry — the fallback is the retry.
const PRIMARY_BUDGET_MS = 6000;

type Point = {
  block: number;
  baseFeeWei: number | null;
  gasUsed: number;
  txCount: number;
};

/** Strided sample straight from the node — the wider, preferred window. */
async function fromNode(): Promise<{ points: Point[]; stride: number }> {
  const height = await getHeight(undefined, PRIMARY_BUDGET_MS);
  const calls = Array.from({ length: SAMPLES }, (_, i) => ({
    method: "eth_getBlockByNumber",
    params: [
      `0x${(height - (SAMPLES - 1 - i) * STRIDE).toString(16)}`,
      false,
    ] as unknown[],
  }));

  const raw = await rpcBatch<RawBlock>(calls, {
    timeoutMs: PRIMARY_BUDGET_MS,
    attempts: 1,
  });

  return {
    stride: STRIDE,
    points: raw
      .filter(Boolean)
      .map((b) => ({
        block: hexToNum(b.number),
        baseFeeWei: b.baseFeePerGas ? hexToNum(b.baseFeePerGas) : null,
        gasUsed: hexToNum(b.gasUsed),
        txCount: b.transactions?.length ?? 0,
      })),
  };
}

/**
 * The indexer cannot be asked for a strided sample, only for the most
 * recent run of blocks. So the fallback covers a narrower window at full
 * resolution rather than a wide one with gaps. The real stride is returned
 * either way, so the caption never claims a window it did not read.
 */
async function fromIndexer(): Promise<{ points: Point[]; stride: number }> {
  const rows = await scoutBlocks(SAMPLES);
  return {
    stride: 1,
    points: rows
      .slice()
      .reverse()
      .map((b) => ({
        block: b.number,
        baseFeeWei: b.baseFeeWei,
        gasUsed: b.gasUsed,
        txCount: b.txCount,
      })),
  };
}

async function load() {
  const trace: Trace = {};
  const got = await withFallback(
    { source: "rpc", run: fromNode },
    { source: "blockscout", run: fromIndexer },
    trace,
    "gas",
  );

  return {
    source: trace.source ?? null,
    fellBack: trace.fellBack ?? false,
    stride: got.stride,
    points: got.points.filter((p) => p.baseFeeWei !== null),
  };
}

export const GET = withLimit(async () => {
  try {
    const { value, stale } = await memo("gas", TTL_MS, load);
    return NextResponse.json({
      ok: true,
      stale,
      reason: value.points.length === 0 ? "empty" : null,
      ts: Date.now(),
      stride: value.stride,
      source: value.source,
      fellBack: value.fellBack,
      points: value.points,
    });
  } catch (err) {
    console.error("[pylon] /api/gas:", (err as Error).message);
    return NextResponse.json(
      {
        ok: false,
        reason: "unreachable",
        error: (err as Error).message,
        ts: Date.now(),
        points: [],
      },
      { status: 200 },
    );
  }
});
