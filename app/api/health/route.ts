import { NextResponse } from "next/server";
import { RPC_URL, RPC_FALLBACK_URL, BLOCKSCOUT, CHAIN } from "@/lib/config";
import { fetchWithTimeout, cacheAges, openBreakers } from "@/lib/upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

type Probe = {
  id: string;
  label: string;
  url: string;
  status: "up" | "down";
  latencyMs: number | null;
  detail: string | null;
};

async function probeRpc(): Promise<Probe> {
  const t0 = Date.now();
  try {
    const res = await fetchWithTimeout(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
    });
    const ms = Date.now() - t0;
    if (!res.ok) {
      return {
        id: "rpc",
        label: "JSON-RPC",
        url: RPC_URL,
        status: "down",
        latencyMs: ms,
        detail: `http ${res.status}`,
      };
    }
    const json = await res.json();
    const id = json?.result ? Number.parseInt(json.result, 16) : null;
    const matches = id === CHAIN.id;
    return {
      id: "rpc",
      label: "JSON-RPC",
      url: RPC_URL,
      status: matches ? "up" : "down",
      latencyMs: ms,
      detail: matches
        ? `chain id ${id}`
        : `unexpected chain id ${id ?? "null"}`,
    };
  } catch (err) {
    return {
      id: "rpc",
      label: "JSON-RPC",
      url: RPC_URL,
      status: "down",
      latencyMs: Date.now() - t0,
      detail: (err as Error).message,
    };
  }
}

async function probeScout(): Promise<Probe> {
  const t0 = Date.now();
  const url = `${BLOCKSCOUT}/api/v2/stats`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { accept: "application/json" },
    });
    const ms = Date.now() - t0;
    if (!res.ok) {
      return {
        id: "blockscout",
        label: "Blockscout",
        url: BLOCKSCOUT,
        status: "down",
        latencyMs: ms,
        detail: `http ${res.status}`,
      };
    }
    const json = await res.json();
    const blocks = json?.total_blocks ? Number(json.total_blocks) : null;
    return {
      id: "blockscout",
      label: "Blockscout",
      url: BLOCKSCOUT,
      status: blocks ? "up" : "down",
      latencyMs: ms,
      detail: blocks ? `${blocks.toLocaleString("en-US")} blocks indexed` : "no stats",
    };
  } catch (err) {
    return {
      id: "blockscout",
      label: "Blockscout",
      url: BLOCKSCOUT,
      status: "down",
      latencyMs: Date.now() - t0,
      detail: (err as Error).message,
    };
  }
}

/** The JSON-RPC proxy the chain reads fall back to. */
async function probeFallback(): Promise<Probe> {
  const t0 = Date.now();
  try {
    const res = await fetchWithTimeout(RPC_FALLBACK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_blockNumber",
        params: [],
      }),
    });
    const ms = Date.now() - t0;
    if (!res.ok) {
      return {
        id: "rpc-fallback",
        label: "JSON-RPC fallback",
        url: RPC_FALLBACK_URL,
        status: "down",
        latencyMs: ms,
        detail: `http ${res.status}`,
      };
    }
    const json = await res.json();
    const h = json?.result ? Number.parseInt(json.result, 16) : null;
    return {
      id: "rpc-fallback",
      label: "JSON-RPC fallback",
      url: RPC_FALLBACK_URL,
      status: h ? "up" : "down",
      latencyMs: ms,
      detail: h ? `height ${h.toLocaleString("en-US")}` : "no result",
    };
  } catch (err) {
    return {
      id: "rpc-fallback",
      label: "JSON-RPC fallback",
      url: RPC_FALLBACK_URL,
      status: "down",
      latencyMs: Date.now() - t0,
      detail: (err as Error).message,
    };
  }
}

export async function GET() {
  const [rpc, blockscout, fallback] = await Promise.all([
    probeRpc(),
    probeScout(),
    probeFallback(),
  ]);
  const sources = [rpc, blockscout, fallback];

  // Chain reads survive on either JSON-RPC host, so the dashboard is only
  // truly down when both are gone.
  const chainReadable = rpc.status === "up" || fallback.status === "up";
  const ok = chainReadable && blockscout.status === "up";

  return NextResponse.json({
    ok,
    degraded: chainReadable && rpc.status === "down",
    ts: Date.now(),
    region: process.env.VERCEL_REGION ?? "local",
    sources,
    cacheAgeMs: cacheAges(),
    // Primaries currently being stepped over after repeated failures.
    skipping: openBreakers(),
  });
}
