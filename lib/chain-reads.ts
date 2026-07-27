import { rpc, scout, hexToNum, type RawBlock } from "./rpc";
import { memo } from "./upstream";

/**
 * Shared reads, each cached at whatever rate the underlying series moves.
 *
 * The point is round trips. Asking for the height and then asking for the
 * block at that height is two sequential calls to the node; asking for the
 * "latest" tag is one. Routes that genuinely need a number to compute
 * offsets share a single short-lived height instead of each fetching one.
 */

/** Height alone, shared by every route that needs offsets. */
export async function getHeight(): Promise<number> {
  const { value } = await memo("height", 2000, async () => {
    const hex = await rpc<string>("eth_blockNumber");
    return hexToNum(hex);
  });
  return value;
}

/**
 * Chain-wide aggregates from Blockscout. These move slowly and are a bonus
 * on top of the RPC reads, so they get a long TTL and never block a
 * response — a failure resolves to null.
 */
export type Totals = {
  blocks: number | null;
  transactions: number | null;
  addresses: number | null;
  txToday: number | null;
  avgBlockTimeMs: number | null;
};

type ScoutStats = {
  total_blocks?: string;
  total_transactions?: string;
  total_addresses?: string;
  transactions_today?: string;
  average_block_time?: number;
};

export async function getTotals(): Promise<Totals | null> {
  try {
    const { value } = await memo("totals", 30000, async () => {
      const s = await scout<ScoutStats>("/api/v2/stats");
      return {
        blocks: s.total_blocks ? Number(s.total_blocks) : null,
        transactions: s.total_transactions
          ? Number(s.total_transactions)
          : null,
        addresses: s.total_addresses ? Number(s.total_addresses) : null,
        txToday: s.transactions_today ? Number(s.transactions_today) : null,
        avgBlockTimeMs:
          typeof s.average_block_time === "number"
            ? s.average_block_time
            : null,
      } satisfies Totals;
    });
    return value;
  } catch {
    return null;
  }
}

export type { RawBlock };
