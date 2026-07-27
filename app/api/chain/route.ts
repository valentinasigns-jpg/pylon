import { NextResponse } from "next/server";
import { rpcBatch, scout, hexToNum, type RawBlock } from "@/lib/rpc";
import { memo } from "@/lib/upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const TTL_MS = 3000;

type ScoutStats = {
  total_blocks?: string;
  total_transactions?: string;
  total_addresses?: string;
  transactions_today?: string;
  average_block_time?: number;
};

async function load() {
  const [heightHex, gasHex] = await rpcBatch<string>([
    { method: "eth_blockNumber" },
    { method: "eth_gasPrice" },
  ]);
  if (!heightHex) throw new Error("no block height");

  const [block] = await rpcBatch<RawBlock>([
    { method: "eth_getBlockByNumber", params: [heightHex, false] },
  ]);

  // Aggregates are a bonus — never fail the whole response for them.
  let stats: ScoutStats | null = null;
  try {
    stats = await scout<ScoutStats>("/api/v2/stats");
  } catch {
    stats = null;
  }

  return {
    height: hexToNum(heightHex),
    gasPriceWei: gasHex ? hexToNum(gasHex) : null,
    baseFeeWei: block?.baseFeePerGas ? hexToNum(block.baseFeePerGas) : null,
    txInLatest: block?.transactions ? block.transactions.length : null,
    blockTimestamp: block?.timestamp ? hexToNum(block.timestamp) : null,
    gasUsedLatest: block?.gasUsed ? hexToNum(block.gasUsed) : null,
    totals: stats
      ? {
          blocks: stats.total_blocks ? Number(stats.total_blocks) : null,
          transactions: stats.total_transactions
            ? Number(stats.total_transactions)
            : null,
          addresses: stats.total_addresses
            ? Number(stats.total_addresses)
            : null,
          txToday: stats.transactions_today
            ? Number(stats.transactions_today)
            : null,
          avgBlockTimeMs:
            typeof stats.average_block_time === "number"
              ? stats.average_block_time
              : null,
        }
      : null,
  };
}

export async function GET() {
  try {
    const { value, stale } = await memo("chain", TTL_MS, load);
    return NextResponse.json({ ok: true, stale, ts: Date.now(), ...value });
  } catch (err) {
    console.error("[pylon] /api/chain:", (err as Error).message);
    return NextResponse.json(
      { ok: false, error: (err as Error).message, ts: Date.now() },
      { status: 200 },
    );
  }
}
