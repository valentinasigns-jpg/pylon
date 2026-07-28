import { RPC_URL, RPC_FALLBACK_URL, BLOCKSCOUT } from "./config";
import {
  fetchJson,
  retry,
  withFallback,
  UpstreamError,
  type Trace,
} from "./upstream";

/** One JSON-RPC round trip against a specific host. */
async function rpcAt<T>(
  host: string,
  method: string,
  params: unknown[],
  timeoutMs: number | undefined,
  attempts: number | undefined,
  label: string,
): Promise<T> {
  return retry(
    async () => {
      const json = await fetchJson<{ error?: { message: string }; result: T }>(
        host,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        },
        timeoutMs,
        host,
      );
      if (json.error) throw new UpstreamError(json.error.message, host);
      return json.result;
    },
    { label, attempts },
  );
}

/**
 * JSON-RPC with a second host behind it. Server-side only.
 *
 * Blockscout proxies the same methods, so a silent node degrades to a
 * slower answer rather than to an empty panel.
 */
export async function rpc<T = unknown>(
  method: string,
  params: unknown[] = [],
  opts: { timeoutMs?: number; attempts?: number; trace?: Trace } = {},
): Promise<T> {
  const { timeoutMs, attempts, trace } = opts;
  return withFallback<T>(
    {
      source: "rpc",
      run: () => rpcAt<T>(RPC_URL, method, params, timeoutMs, attempts, `rpc ${method}`),
    },
    {
      source: "blockscout",
      // The fallback gets one attempt: it is already the second thing tried
      // and the caller is waiting.
      run: () =>
        rpcAt<T>(RPC_FALLBACK_URL, method, params, timeoutMs, 1, `rpc:bs ${method}`),
    },
    trace,
    `rpc ${method}`,
  );
}

async function rpcBatchAt<T>(
  host: string,
  calls: Array<{ method: string; params?: unknown[] }>,
  timeoutMs: number | undefined,
  attempts: number | undefined,
  label: string,
): Promise<T[]> {
  const body = calls.map((c, i) => ({
    jsonrpc: "2.0",
    id: i,
    method: c.method,
    params: c.params ?? [],
  }));

  return retry(
    async () => {
      const json = await fetchJson<unknown>(
        host,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
        timeoutMs,
        host,
      );
      if (!Array.isArray(json)) {
        throw new UpstreamError("batch response was not an array", host);
      }
      return json
        .sort((a, b) => a.id - b.id)
        .map((r) => (r.error ? null : r.result)) as T[];
    },
    { label, attempts },
  );
}

/**
 * Batch JSON-RPC.
 *
 * There is deliberately no fallback here. The indexer's RPC proxy caps the
 * request body at four calls (probed: 1-4 return 200, 6+ return 413) and
 * rate-limits beyond a couple of requests, so replaying a fifteen- or
 * sixty-call batch against it produces 429s and takes half a minute.
 * Feeds that need many blocks fall back through the indexer's REST list
 * instead, which answers the same question in a single request — see
 * `scoutBlocks`.
 *
 * Size the deadline against the route's own maxDuration: a generous budget
 * multiplied by a retry is how a route exceeds its ceiling and returns
 * nothing at all.
 */
export async function rpcBatch<T = unknown>(
  calls: Array<{ method: string; params?: unknown[] }>,
  opts: { timeoutMs?: number; attempts?: number; trace?: Trace } = {},
): Promise<T[]> {
  const { timeoutMs, attempts, trace } = opts;
  const label = `rpc batch x${calls.length}`;

  // Small batches are within what the proxy accepts, so the chain head
  // keeps its second source.
  if (calls.length <= 4) {
    return withFallback<T[]>(
      {
        source: "rpc",
        run: () => rpcBatchAt<T>(RPC_URL, calls, timeoutMs, attempts, label),
      },
      {
        source: "blockscout",
        run: () =>
          rpcBatchAt<T>(RPC_FALLBACK_URL, calls, timeoutMs, 1, `${label}:bs`),
      },
      trace,
      label,
    );
  }

  const v = await rpcBatchAt<T>(RPC_URL, calls, timeoutMs, attempts, label);
  if (trace) {
    trace.source = "rpc";
    trace.fellBack = false;
  }
  return v;
}

/**
 * Blockscout REST helper. Server-side only.
 *
 * There is no fallback here by design: holder counts, token prices and
 * metadata come from the indexer, and a bare node cannot produce them.
 * Callers that fan out across many paths should pass a tighter budget.
 */
export async function scout<T = unknown>(
  path: string,
  { timeoutMs, attempts }: { timeoutMs?: number; attempts?: number } = {},
): Promise<T> {
  return retry(
    () =>
      fetchJson<T>(
        `${BLOCKSCOUT}${path}`,
        { headers: { accept: "application/json" } },
        timeoutMs,
        "blockscout",
      ),
    { label: `blockscout ${path}`, attempts },
  );
}

export const hexToNum = (h: string | null | undefined): number =>
  h ? Number.parseInt(h, 16) : 0;

export const hexToBig = (h: string | null | undefined): bigint =>
  h ? BigInt(h) : 0n;

export type RawBlock = {
  number: string;
  hash: string;
  timestamp: string;
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas?: string;
  transactions: string[];
  miner?: string;
  parentHash?: string;
};
