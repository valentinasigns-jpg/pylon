import { NextResponse } from "next/server";
import { rpc, scout, hexToNum, type RawBlock } from "@/lib/rpc";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type TxRaw = {
  hash: string;
  blockNumber: string | null;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice?: string;
  nonce: string;
  input?: string;
};

type ReceiptRaw = {
  status: string;
  gasUsed: string;
  effectiveGasPrice?: string;
  contractAddress?: string | null;
  logs?: unknown[];
};

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ ok: false, kind: "empty", error: "empty query" });
  }

  try {
    // --- block number ---
    if (/^\d+$/.test(q)) {
      const hex = `0x${Number(q).toString(16)}`;
      const b = await rpc<RawBlock | null>(
        "eth_getBlockByNumber",
        [hex, false],
        0,
      );
      if (!b) {
        return NextResponse.json({ ok: false, kind: "block", error: "block not found" });
      }
      return NextResponse.json({
        ok: true,
        kind: "block",
        data: {
          number: hexToNum(b.number),
          hash: b.hash,
          parentHash: b.parentHash ?? null,
          timestamp: hexToNum(b.timestamp),
          txCount: b.transactions?.length ?? 0,
          gasUsed: hexToNum(b.gasUsed),
          gasLimit: hexToNum(b.gasLimit),
          baseFeeWei: b.baseFeePerGas ? hexToNum(b.baseFeePerGas) : null,
          miner: b.miner ?? null,
        },
      });
    }

    // --- tx hash (32 bytes) ---
    if (/^0x[a-fA-F0-9]{64}$/.test(q)) {
      const tx = await rpc<TxRaw | null>("eth_getTransactionByHash", [q], 0);
      if (!tx) {
        return NextResponse.json({ ok: false, kind: "tx", error: "transaction not found" });
      }
      let receipt: ReceiptRaw | null = null;
      try {
        receipt = await rpc<ReceiptRaw | null>(
          "eth_getTransactionReceipt",
          [q],
          0,
        );
      } catch {
        receipt = null;
      }
      return NextResponse.json({
        ok: true,
        kind: "tx",
        data: {
          hash: tx.hash,
          blockNumber: tx.blockNumber ? hexToNum(tx.blockNumber) : null,
          from: tx.from,
          to: tx.to,
          valueWei: tx.value ? hexToNum(tx.value) : 0,
          gasLimit: hexToNum(tx.gas),
          nonce: hexToNum(tx.nonce),
          status: receipt ? (hexToNum(receipt.status) === 1 ? "success" : "failed") : null,
          gasUsed: receipt ? hexToNum(receipt.gasUsed) : null,
          effectiveGasPriceWei: receipt?.effectiveGasPrice
            ? hexToNum(receipt.effectiveGasPrice)
            : null,
          logCount: receipt?.logs ? receipt.logs.length : null,
          contractCreated: receipt?.contractAddress ?? null,
        },
      });
    }

    // --- address (20 bytes) ---
    if (/^0x[a-fA-F0-9]{40}$/.test(q)) {
      const [balHex, nonceHex, code] = await Promise.all([
        rpc<string>("eth_getBalance", [q, "latest"], 0),
        rpc<string>("eth_getTransactionCount", [q, "latest"], 0),
        rpc<string>("eth_getCode", [q, "latest"], 0).catch(() => "0x"),
      ]);

      // Token metadata is a bonus if the address happens to be a token.
      let token: {
        name: string | null;
        symbol: string | null;
        price: number | null;
        holders: number | null;
      } | null = null;
      try {
        const t = await scout<{
          name?: string;
          symbol?: string;
          exchange_rate?: string | null;
          holders_count?: string | null;
        }>(`/api/v2/tokens/${q}`, 10);
        if (t?.symbol) {
          token = {
            name: t.name ?? null,
            symbol: t.symbol,
            price: t.exchange_rate ? Number(t.exchange_rate) : null,
            holders: t.holders_count ? Number(t.holders_count) : null,
          };
        }
      } catch {
        token = null;
      }

      const isContract = !!code && code !== "0x" && code.length > 2;

      return NextResponse.json({
        ok: true,
        kind: "address",
        data: {
          address: q,
          balanceWei: balHex ? Number(BigInt(balHex)) : 0,
          txCount: hexToNum(nonceHex),
          isContract,
          codeSize: isContract ? (code.length - 2) / 2 : 0,
          token,
        },
      });
    }

    return NextResponse.json({
      ok: false,
      kind: "unknown",
      error:
        "Enter a block number, a 66-character transaction hash, or a 42-character address.",
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      kind: "error",
      error: (err as Error).message,
    });
  }
}
