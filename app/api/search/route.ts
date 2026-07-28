import { NextResponse } from "next/server";
import { rpc, scout, hexToNum, type RawBlock } from "@/lib/rpc";
import { withLimit } from "@/lib/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

type TxRaw = {
  hash: string;
  blockNumber: string | null;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  nonce: string;
};

type ReceiptRaw = {
  status: string;
  gasUsed: string;
  effectiveGasPrice?: string;
  contractAddress?: string | null;
  logs?: unknown[];
};

export const GET = withLimit(async (req: Request) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ ok: false, kind: "empty", error: "empty query" });
  }

  try {
    // --- block number ---
    if (/^\d+$/.test(q)) {
      const hex = `0x${Number(q).toString(16)}`;
      const b = await rpc<RawBlock | null>("eth_getBlockByNumber", [hex, false]);
      if (!b) {
        return NextResponse.json({
          ok: false,
          kind: "block",
          error: "block not found",
        });
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

    // --- tx hash ---
    if (/^0x[a-fA-F0-9]{64}$/.test(q)) {
      const tx = await rpc<TxRaw | null>("eth_getTransactionByHash", [q]);
      if (!tx) {
        return NextResponse.json({
          ok: false,
          kind: "tx",
          error: "transaction not found",
        });
      }
      let receipt: ReceiptRaw | null = null;
      try {
        receipt = await rpc<ReceiptRaw | null>("eth_getTransactionReceipt", [q]);
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
          status: receipt
            ? hexToNum(receipt.status) === 1
              ? "success"
              : "failed"
            : null,
          gasUsed: receipt ? hexToNum(receipt.gasUsed) : null,
          effectiveGasPriceWei: receipt?.effectiveGasPrice
            ? hexToNum(receipt.effectiveGasPrice)
            : null,
          logCount: receipt?.logs ? receipt.logs.length : null,
          contractCreated: receipt?.contractAddress ?? null,
        },
      });
    }

    // --- address ---
    if (/^0x[a-fA-F0-9]{40}$/.test(q)) {
      const [balHex, nonceHex, code] = await Promise.all([
        rpc<string>("eth_getBalance", [q, "latest"]),
        rpc<string>("eth_getTransactionCount", [q, "latest"]),
        rpc<string>("eth_getCode", [q, "latest"]).catch(() => "0x"),
      ]);

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
        }>(`/api/v2/tokens/${q}`);
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
    console.error("[pylon] /api/search:", (err as Error).message);
    return NextResponse.json({
      ok: false,
      kind: "error",
      error: (err as Error).message,
    });
  }
});
