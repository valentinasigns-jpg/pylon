import { NextResponse } from "next/server";
import { rpc, rpcBatch, hexToNum, type RawBlock } from "@/lib/rpc";

export const revalidate = 0;
export const dynamic = "force-dynamic";

/** Sample this many blocks back, at this stride. */
const SAMPLES = 100;
const STRIDE = 4;

export async function GET() {
  try {
    const heightHex = await rpc<string>("eth_blockNumber", [], 5);
    const height = hexToNum(heightHex);

    const calls = Array.from({ length: SAMPLES }, (_, i) => ({
      method: "eth_getBlockByNumber",
      params: [
        `0x${(height - (SAMPLES - 1 - i) * STRIDE).toString(16)}`,
        false,
      ] as unknown[],
    }));

    const raw = await rpcBatch<RawBlock>(calls, 5);

    const points = raw
      .filter(Boolean)
      .map((b) => ({
        block: hexToNum(b.number),
        baseFeeWei: b.baseFeePerGas ? hexToNum(b.baseFeePerGas) : null,
        gasUsed: hexToNum(b.gasUsed),
        txCount: b.transactions?.length ?? 0,
      }))
      .filter((p) => p.baseFeeWei !== null);

    return NextResponse.json({
      ok: true,
      ts: Date.now(),
      stride: STRIDE,
      points,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message, ts: Date.now(), points: [] },
      { status: 200 },
    );
  }
}
