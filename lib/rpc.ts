import { RPC_URL, BLOCKSCOUT } from "./config";

/** Minimal JSON-RPC client. Server-side only. */
export async function rpc<T = unknown>(
  method: string,
  params: unknown[] = [],
  revalidate = 5,
): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`rpc ${method} http ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`rpc ${method}: ${json.error.message}`);
  return json.result as T;
}

/** Batch JSON-RPC — one round trip for many calls. */
export async function rpcBatch<T = unknown>(
  calls: Array<{ method: string; params?: unknown[] }>,
  revalidate = 5,
): Promise<T[]> {
  const body = calls.map((c, i) => ({
    jsonrpc: "2.0",
    id: i,
    method: c.method,
    params: c.params ?? [],
  }));
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`rpc batch http ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error("rpc batch: bad shape");
  return json
    .sort((a, b) => a.id - b.id)
    .map((r) => (r.error ? null : r.result)) as T[];
}

/** Blockscout REST helper. Server-side only. */
export async function scout<T = unknown>(
  path: string,
  revalidate = 10,
): Promise<T> {
  const res = await fetch(`${BLOCKSCOUT}${path}`, {
    headers: { accept: "application/json" },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`blockscout ${path} http ${res.status}`);
  return (await res.json()) as T;
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
