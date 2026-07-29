/**
 * Reading draws off the chain.
 *
 * Every function here returns null rather than a shape full of zeroes when
 * there is no contract to read. A page that renders a draw with an empty
 * root and a status of "none" looks like a draw that exists and went wrong,
 * which is worse than a page that says nothing has been deployed.
 *
 * Server-side only.
 */

import { createPublicClient, http, type Address } from "viem";
import { PYLON_DRAW_ABI } from "./draw-abi";
import { DRAW_ADDRESS } from "./draw";
import { RPC_URL, CHAIN } from "./config";
import { memo, UPSTREAM_TIMEOUT_MS } from "./upstream";

const chain = {
  id: CHAIN.id,
  name: CHAIN.name,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
} as const;

const client = createPublicClient({
  chain,
  transport: http(RPC_URL, { timeout: UPSTREAM_TIMEOUT_MS, retryCount: 1 }),
});

export type DrawRecord = {
  id: number;
  organiser: string;
  entrantsRoot: string;
  entrantCount: number;
  winnerCount: number;
  drawAt: number;
  sequenceNumber: string;
  randomValue: string | null;
  status: number;
  metadataURI: string;
  winnerIndices: number[] | null;
};

const ZERO32 = `0x${"0".repeat(64)}`;

/** Whether there is a contract at all. Everything else depends on it. */
export const deployed = (): boolean => DRAW_ADDRESS !== null;

async function readOne(id: number): Promise<DrawRecord | null> {
  if (!DRAW_ADDRESS) return null;
  const address = DRAW_ADDRESS as Address;

  const info = await client.readContract({
    address,
    abi: PYLON_DRAW_ABI,
    functionName: "drawInfo",
    args: [BigInt(id)],
  });

  const status = Number(info[7]);
  if (status === 0) return null;

  // Winners are only meaningful once the value is in. Asking for them
  // earlier would return an empty list that reads like "nobody won".
  let winnerIndices: number[] | null = null;
  if (status === 3) {
    const got = await client.readContract({
      address,
      abi: PYLON_DRAW_ABI,
      functionName: "getDraw",
      args: [BigInt(id)],
    });
    winnerIndices = (got[2] as readonly number[]).map(Number);
  }

  return {
    id,
    organiser: info[0] as string,
    entrantsRoot: info[1] as string,
    entrantCount: Number(info[2]),
    winnerCount: Number(info[3]),
    drawAt: Number(info[4]),
    sequenceNumber: String(info[5]),
    randomValue: (info[6] as string) === ZERO32 ? null : (info[6] as string),
    status,
    metadataURI: info[8] as string,
    winnerIndices,
  };
}

export async function getDrawCount(): Promise<number | null> {
  if (!DRAW_ADDRESS) return null;
  try {
    const { value } = await memo("draw:count", 5000, async () =>
      Number(
        await client.readContract({
          address: DRAW_ADDRESS as Address,
          abi: PYLON_DRAW_ABI,
          functionName: "drawCount",
        }),
      ),
    );
    return value;
  } catch (err) {
    console.error("[pylon] drawCount:", (err as Error)?.message);
    return null;
  }
}

export async function getDraw(id: number): Promise<DrawRecord | null> {
  if (!DRAW_ADDRESS) return null;
  try {
    const { value } = await memo(`draw:${id}`, 5000, () => readOne(id));
    return value;
  } catch (err) {
    console.error(`[pylon] draw ${id}:`, (err as Error)?.message);
    return null;
  }
}

/**
 * The most recent draws, newest first.
 *
 * Reads backwards from the head rather than paging forwards: a visitor
 * wants what just happened, and the contract numbers draws from one.
 */
export async function getRecentDraws(limit = 20): Promise<DrawRecord[] | null> {
  if (!DRAW_ADDRESS) return null;
  const count = await getDrawCount();
  if (count === null) return null;
  if (count === 0) return [];

  const ids: number[] = [];
  for (let id = count; id > 0 && ids.length < limit; id--) ids.push(id);

  const rows = await Promise.all(ids.map((id) => getDraw(id)));
  return rows.filter((r): r is DrawRecord => r !== null);
}
