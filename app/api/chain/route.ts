import { NextResponse } from "next/server";
import { rpcBatch, hexToNum, type RawBlock } from "@/lib/rpc";
import { scout } from "@/lib/rpc";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type ScoutStats = {
  total_blocks?: string;
  total_transactions?: string;
  total_addresses?: string;
  transactions_today?: string;
  average_block_time?: number;
  gas_prices?: { slow?: number; average?: number; fast?: number };
};

export async function GET() {
  try {
    const [heightHex, gasHex] = await rpcBatch<string>(
      [{ method: "eth_blockNumber" }, { method: "eth_gasPrice" }],
      5,
    );

    if (!heightHex) throw new Error("no block height");
    const height = hexToNum(heightHex);

    // Latest block for tx count + base fee.
    const [block] = await rpcBatch<RawBlock>(
      [{ method: "eth_getBlockByNumber", params: [heightHex, false] }],
      5,
    );

    // Blockscout aggregate stats are a bonus — never fail the whole
    // response if they are down.
    let stats: ScoutStats | null = null;
    try {
      stats = await scout<ScoutStats>("/api/v2/stats", 10);
    } catch {
      stats = null;
    }

    return NextResponse.json({
      ok: true,
      ts: Date.now(),
      height,
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
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message, ts: Date.now() },
      { status: 200 },
    );
  }
}
