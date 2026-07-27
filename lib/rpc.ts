import { RPC_URL, BLOCKSCOUT } from "./config";
import { fetchWithTimeout, retry, UpstreamError } from "./upstream";

/** Minimal JSON-RPC client. Server-side only. */
export async function rpc<T = unknown>(
  method: string,
  params: unknown[] = [],
): Promise<T> {
  return retry(
    async () => {
      const res = await fetchWithTimeout(RPC_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (!res.ok) {
        throw new UpstreamError(`http ${res.status}`, "rpc", res.status);
      }
      const json = await res.json();
      if (json.error) {
        throw new UpstreamError(json.error.message, "rpc");
      }
      return json.result as T;
    },
    { label: `rpc ${method}` },
  );
}

/** Batch JSON-RPC — one round trip for many calls. */
export async function rpcBatch<T = unknown>(
  calls: Array<{ method: string; params?: unknown[] }>,
): Promise<T[]> {
  const body = calls.map((c, i) => ({
    jsonrpc: "2.0",
    id: i,
    method: c.method,
    params: c.params ?? [],
  }));

  return retry(
    async () => {
      const res = await fetchWithTimeout(RPC_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new UpstreamError(`http ${res.status}`, "rpc", res.status);
      }
      const json = await res.json();
      if (!Array.isArray(json)) {
        throw new UpstreamError("batch response was not an array", "rpc");
      }
      return json
        .sort((a, b) => a.id - b.id)
        .map((r) => (r.error ? null : r.result)) as T[];
    },
    { label: `rpc batch x${calls.length}` },
  );
}

/**
 * Blockscout REST helper. Server-side only.
 *
 * Callers that fan out across many paths should pass a tighter budget:
 * Blockscout answers in well under a second when healthy, so a long
 * per-request deadline multiplied across a fan-out is how a route ends up
 * hanging past its own maxDuration.
 */
export async function scout<T = unknown>(
  path: string,
  { timeoutMs, attempts }: { timeoutMs?: number; attempts?: number } = {},
): Promise<T> {
  return retry(
    async () => {
      const res = await fetchWithTimeout(
        `${BLOCKSCOUT}${path}`,
        { headers: { accept: "application/json" } },
        timeoutMs,
      );
      if (!res.ok) {
        throw new UpstreamError(`http ${res.status}`, "blockscout", res.status);
      }
      return (await res.json()) as T;
    },
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
