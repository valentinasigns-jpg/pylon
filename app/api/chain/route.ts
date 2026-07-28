import { NextResponse } from "next/server";
import { rpcBatch, hexToNum, type RawBlock } from "@/lib/rpc";
import { memo, type Trace } from "@/lib/upstream";
import { getTotals } from "@/lib/chain-reads";
import { withLimit } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const TTL_MS = 3000;

/**
 * One round trip. Asking for the "latest" tag returns the block number
 * alongside everything else, so there is no need to fetch the height first
 * and then the block at that height.
 */
async function load() {
  const trace: Trace = {};
  const [block, gasHex] = await rpcBatch<RawBlock & string>(
    [
      { method: "eth_getBlockByNumber", params: ["latest", false] },
      { method: "eth_gasPrice" },
    ],
    { trace },
  );

  const b = block as unknown as RawBlock | null;
  if (!b?.number) throw new Error("no latest block");

  return {
    source: trace.source ?? null,
    fellBack: trace.fellBack ?? false,
    height: hexToNum(b.number),
    gasPriceWei: gasHex ? hexToNum(gasHex as unknown as string) : null,
    baseFeeWei: b.baseFeePerGas ? hexToNum(b.baseFeePerGas) : null,
    txInLatest: b.transactions ? b.transactions.length : null,
    blockTimestamp: b.timestamp ? hexToNum(b.timestamp) : null,
    gasUsedLatest: b.gasUsed ? hexToNum(b.gasUsed) : null,
  };
}

export const GET = withLimit(async () => {
  try {
    // Aggregates run on their own 30s cache and resolve to null on failure,
    // so they can never slow down or break the core reading.
    const [core, totals] = await Promise.all([
      memo("chain", TTL_MS, load),
      getTotals(),
    ]);

    return NextResponse.json({
      ok: true,
      stale: core.stale,
      reason: null,
      ts: Date.now(),
      ...core.value,
      totals,
    });
  } catch (err) {
    console.error("[pylon] /api/chain:", (err as Error).message);
    return NextResponse.json(
      {
        ok: false,
        // Both hosts were tried before we got here, so this is an outage
        // rather than an absence of data.
        reason: "unreachable",
        error: (err as Error).message,
        ts: Date.now(),
      },
      { status: 200 },
    );
  }
});
