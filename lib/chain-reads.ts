import { rpc, scout, hexToNum, type RawBlock } from "./rpc";
import { memo, type Trace } from "./upstream";

/**
 * Shared reads, each cached at whatever rate the underlying series moves.
 *
 * The point is round trips. Asking for the height and then asking for the
 * block at that height is two sequential calls to the node; asking for the
 * "latest" tag is one. Routes that genuinely need a number to compute
 * offsets share a single short-lived height instead of each fetching one.
 */

/**
 * Height alone, shared by every route that needs offsets.
 *
 * `budgetMs` exists for callers that have their own fallback waiting: when
 * a second source is standing by, spending the full deadline and a retry on
 * a host that is already failing just delays the answer.
 */
export async function getHeight(
  trace?: Trace,
  budgetMs?: number,
): Promise<number> {
  const { value } = await memo("height", 2000, async () => {
    const hex = await rpc<string>("eth_blockNumber", [], {
      trace,
      timeoutMs: budgetMs,
      attempts: budgetMs ? 1 : undefined,
    });
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

/** The shape every block feed on the site is rendered from. */
export type BlockRow = {
  number: number;
  hash: string;
  timestamp: number;
  txCount: number;
  gasUsed: number;
  gasLimit: number;
  baseFeeWei: number | null;
};

type ScoutBlock = {
  height?: number;
  hash?: string;
  timestamp?: string;
  transactions_count?: number | null;
  gas_used?: string;
  gas_limit?: string;
  base_fee_per_gas?: string | null;
};

/**
 * Recent blocks straight from the indexer's REST list.
 *
 * This is the fallback for every feed that needs many blocks. One request
 * returns fifty of them fully populated, where the same question asked over
 * the RPC proxy would be fifteen to sixty separate calls that it caps and
 * rate-limits. Fields map one for one, so the panels cannot tell the
 * difference apart from the source label.
 */
export async function scoutBlocks(limit: number): Promise<BlockRow[]> {
  const pages = Math.ceil(limit / 50);
  const out: BlockRow[] = [];

  for (let p = 0; p < pages; p++) {
    // The list is newest-first; paging back is only needed past fifty.
    const path =
      p === 0
        ? "/api/v2/blocks?type=block"
        : `/api/v2/blocks?type=block&block_number=${
            out[out.length - 1].number - 1
          }&items_count=50`;

    const res = await scout<{ items?: ScoutBlock[] }>(path, {
      timeoutMs: 7000,
      attempts: 2,
    });

    for (const b of res.items ?? []) {
      if (typeof b.height !== "number") continue;
      out.push({
        number: b.height,
        hash: b.hash ?? "",
        timestamp: b.timestamp
          ? Math.floor(new Date(b.timestamp).getTime() / 1000)
          : 0,
        txCount: typeof b.transactions_count === "number"
          ? b.transactions_count
          : 0,
        gasUsed: b.gas_used ? Number(b.gas_used) : 0,
        gasLimit: b.gas_limit ? Number(b.gas_limit) : 0,
        baseFeeWei: b.base_fee_per_gas ? Number(b.base_fee_per_gas) : null,
      });
    }

    if (out.length >= limit) break;
  }

  return out.slice(0, limit);
}

export type { RawBlock };
