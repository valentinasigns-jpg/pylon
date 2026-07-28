import { NextResponse } from "next/server";
import { rpcBatch, hexToNum, type RawBlock } from "@/lib/rpc";
import { memo, withFallback, type Trace } from "@/lib/upstream";
import { getHeight, scoutBlocks, type BlockRow } from "@/lib/chain-reads";
import { withLimit } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const COUNT = 15;
const TTL_MS = 3000;
// Sized against maxDuration: two attempts at this deadline still land well
// inside the ceiling, so a single dropped connection degrades to a retry
// rather than to the platform killing the request.
// With the indexer standing by as a second source, there is no reason to
// spend a long deadline plus a retry on a node that is already failing —
// the fallback is the retry. Fail fast, then switch.
const PRIMARY_BUDGET_MS = 4000;

async function fromNode(): Promise<BlockRow[]> {
  const height = await getHeight(undefined, PRIMARY_BUDGET_MS);
  const calls = Array.from({ length: COUNT }, (_, i) => ({
    method: "eth_getBlockByNumber",
    params: [`0x${(height - i).toString(16)}`, false] as unknown[],
  }));

  const raw = await rpcBatch<RawBlock>(calls, {
    timeoutMs: PRIMARY_BUDGET_MS,
    attempts: 1,
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

async function load() {
  const trace: Trace = {};
  // The node answers fastest, but fifteen calls is more than the indexer's
  // RPC proxy will take — so the second source is its REST list, which
  // returns the same fifteen blocks in a single request.
  const blocks = await withFallback<BlockRow[]>(
    { source: "rpc", run: fromNode },
    { source: "blockscout", run: () => scoutBlocks(COUNT) },
    trace,
    "blocks",
  );

  return {
    source: trace.source ?? null,
    fellBack: trace.fellBack ?? false,
    blocks,
  };
}

export const GET = withLimit(async () => {
  try {
    const { value, stale } = await memo("blocks", TTL_MS, load);
    return NextResponse.json({
      ok: true,
      stale,
      // The hosts answered; if the list is empty that is an absence of
      // data, not an outage.
      reason: value.blocks.length === 0 ? "empty" : null,
      ts: Date.now(),
      source: value.source,
      fellBack: value.fellBack,
      blocks: value.blocks,
    });
  } catch (err) {
    console.error("[pylon] /api/blocks:", (err as Error).message);
    return NextResponse.json(
      {
        ok: false,
        reason: "unreachable",
        error: (err as Error).message,
        ts: Date.now(),
        blocks: [],
      },
      { status: 200 },
    );
  }
});
