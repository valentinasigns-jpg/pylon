import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { RPC_URL, RPC_FALLBACK_URL, BLOCKSCOUT, CHAIN } from "@/lib/config";
import { fetchWithTimeout, cacheAges, openBreakers } from "@/lib/upstream";
import { PYLON_DRAW_ABI } from "@/lib/draw-abi";
import { DRAW_ADDRESS, DICE_ENTROPY, explorerAddress } from "@/lib/draw";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * "not-deployed" is a third state, and lumping it in with "down" would be a
 * lie about our own availability: nothing is broken, there is simply nothing
 * there to ask yet.
 */
type Probe = {
  id: string;
  label: string;
  url: string;
  status: "up" | "down" | "not-deployed";
  latencyMs: number | null;
  detail: string | null;
};

const viemChain = {
  id: CHAIN.id,
  name: CHAIN.name,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
} as const;

const onchain = createPublicClient({
  chain: viemChain,
  transport: http(RPC_URL, { timeout: 8000, retryCount: 0 }),
});

/** The draw contract itself: is it there, and does it answer? */
async function probeDraw(): Promise<Probe> {
  if (!DRAW_ADDRESS) {
    return {
      id: "pylon-draw",
      label: "PylonDraw contract",
      url: "",
      status: "not-deployed",
      latencyMs: null,
      detail: "soon — written and tested, not yet live",
    };
  }
  const t0 = Date.now();
  try {
    const count = await onchain.readContract({
      address: DRAW_ADDRESS as `0x${string}`,
      abi: PYLON_DRAW_ABI,
      functionName: "drawCount",
    });
    return {
      id: "pylon-draw",
      label: "PylonDraw contract",
      url: explorerAddress(DRAW_ADDRESS),
      status: "up",
      latencyMs: Date.now() - t0,
      detail: `${Number(count).toLocaleString("en-US")} draws created`,
    };
  } catch (err) {
    return {
      id: "pylon-draw",
      label: "PylonDraw contract",
      url: explorerAddress(DRAW_ADDRESS),
      status: "down",
      latencyMs: Date.now() - t0,
      detail: (err as Error).message.slice(0, 90),
    };
  }
}

/**
 * The randomness oracle. Its fee is read rather than assumed, which doubles
 * as the liveness check — if this call works, a draw can be requested.
 */
async function probeDice(): Promise<Probe> {
  const t0 = Date.now();
  try {
    const provider = (await onchain.readContract({
      address: DICE_ENTROPY as `0x${string}`,
      abi: [
        {
          type: "function",
          name: "getDefaultProvider",
          stateMutability: "view",
          inputs: [],
          outputs: [{ type: "address" }],
        },
      ] as const,
      functionName: "getDefaultProvider",
    })) as string;

    const fee = (await onchain.readContract({
      address: DICE_ENTROPY as `0x${string}`,
      abi: [
        {
          type: "function",
          name: "getFeeV2",
          stateMutability: "view",
          inputs: [
            { name: "provider", type: "address" },
            { name: "gasLimit", type: "uint32" },
          ],
          outputs: [{ type: "uint128" }],
        },
      ] as const,
      functionName: "getFeeV2",
      args: [provider as `0x${string}`, 120000],
    })) as bigint;

    return {
      id: "dice-entropy",
      label: "Dice randomness oracle",
      url: explorerAddress(DICE_ENTROPY),
      status: "up",
      latencyMs: Date.now() - t0,
      detail: `fee ${(Number(fee) / 1e18).toFixed(6)} ETH · provider ${provider.slice(0, 10)}…`,
    };
  } catch (err) {
    return {
      id: "dice-entropy",
      label: "Dice randomness oracle",
      url: explorerAddress(DICE_ENTROPY),
      status: "down",
      latencyMs: Date.now() - t0,
      detail: (err as Error).message.slice(0, 90),
    };
  }
}

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
  const [rpc, blockscout, fallback, draw, dice] = await Promise.all([
    probeRpc(),
    probeScout(),
    probeFallback(),
    probeDraw(),
    probeDice(),
  ]);
  const sources = [rpc, blockscout, fallback, dice, draw];

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
    // A draw needs the oracle as well as a node. Reported separately so an
    // outage in one is never presented as an outage in the other.
    draws: {
      deployed: draw.status !== "not-deployed",
      contract: draw.status,
      oracle: dice.status,
    },
  });
}
