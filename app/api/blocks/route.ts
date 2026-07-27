import { NextResponse } from "next/server";
import { rpc, rpcBatch, hexToNum, type RawBlock } from "@/lib/rpc";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const COUNT = 15;

export async function GET() {
  try {
    const heightHex = await rpc<string>("eth_blockNumber", [], 5);
    const height = hexToNum(heightHex);

    const calls = Array.from({ length: COUNT }, (_, i) => ({
      method: "eth_getBlockByNumber",
      params: [`0x${(height - i).toString(16)}`, false] as unknown[],
    }));

    const raw = await rpcBatch<RawBlock>(calls, 5);

    const blocks = raw
      .filter(Boolean)
      .map((b) => ({
        number: hexToNum(b.number),
        hash: b.hash,
        timestamp: hexToNum(b.timestamp),
        txCount: b.transactions?.length ?? 0,
        gasUsed: hexToNum(b.gasUsed),
        gasLimit: hexToNum(b.gasLimit),
        baseFeeWei: b.baseFeePerGas ? hexToNum(b.baseFeePerGas) : null,
      }));

    return NextResponse.json({ ok: true, ts: Date.now(), blocks });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message, ts: Date.now(), blocks: [] },
      { status: 200 },
    );
  }
}
