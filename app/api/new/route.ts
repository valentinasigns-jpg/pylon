import { NextResponse } from "next/server";
import { scout } from "@/lib/rpc";
import { memo } from "@/lib/upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Ten rows of two chained reads each, on top of a possible cold start.
export const maxDuration = 45;

/**
 * New contracts arrive constantly on this chain, but the feed costs three
 * upstream reads per row, so it is held for a minute rather than rebuilt
 * for every visitor.
 */
const TTL_MS = 60000;

/**
 * Ten rows, each resolved with its own small chain of calls. Twenty was
 * enough to draw rate limiting from the explorer; ten fills a screen and
 * comes back in a few seconds.
 */
const ROWS = 10;
const PER_CALL_TIMEOUT_MS = 5000;

type ScoutVerified = {
  items?: Array<{
    address?: {
      hash?: string;
      name?: string | null;
      is_scam?: boolean;
      reputation?: string | null;
      implementations?: Array<{ address_hash?: string }>;
    };
    verified_at?: string | null;
    language?: string | null;
    compiler_version?: string | null;
  }>;
};

type ScoutAddress = {
  creator_address_hash?: string | null;
  creation_transaction_hash?: string | null;
  is_scam?: boolean;
  proxy_type?: string | null;
  token?: { symbol?: string | null; name?: string | null } | null;
};

type ScoutTx = { timestamp?: string | null; block_number?: number | null };

export type NewContract = {
  address: string;
  name: string | null;
  tokenSymbol: string | null;
  verifiedAt: string | null;
  deployedAt: string | null;
  blockNumber: number | null;
  deployer: string | null;
  language: string | null;
  isScam: boolean | null;
  proxyType: string | null;
};

const quiet = <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

async function load(): Promise<NewContract[]> {
  /**
   * The explorer publishes no list of contract creations ordered by time.
   * What it does publish is the contracts it has verified, newest first —
   * see the note rendered on /new about what that leaves out.
   */
  const list = await scout<ScoutVerified>("/api/v2/smart-contracts", {
    timeoutMs: PER_CALL_TIMEOUT_MS,
    attempts: 2,
  });

  const items = (list.items ?? []).filter((i) => i.address?.hash).slice(0, ROWS);

  const rows = await Promise.all(
    items.map(async (i) => {
      const address = i.address!.hash as string;

      const addr = await quiet(
        scout<ScoutAddress>(`/api/v2/addresses/${address}`, {
          timeoutMs: PER_CALL_TIMEOUT_MS,
          attempts: 1,
        }),
      );

      const tx = addr?.creation_transaction_hash
        ? await quiet(
            scout<ScoutTx>(
              `/api/v2/transactions/${addr.creation_transaction_hash}`,
              { timeoutMs: PER_CALL_TIMEOUT_MS, attempts: 1 },
            ),
          )
        : null;

      return {
        address,
        name: i.address?.name ?? null,
        tokenSymbol: addr?.token?.symbol ?? null,
        verifiedAt: i.verified_at ?? null,
        deployedAt: tx?.timestamp ?? null,
        blockNumber: tx?.block_number ?? null,
        deployer: addr?.creator_address_hash ?? null,
        language: i.language ?? null,
        isScam: i.address?.is_scam ?? addr?.is_scam ?? null,
        proxyType: addr?.proxy_type ?? null,
      };
    }),
  );

  /**
   * The explorer hands these back in the order it verified them, which is
   * not the order they were deployed — a contract verified this morning can
   * have been sitting on the chain for a fortnight. Once each row carries
   * its real creation time, the feed is sorted by that instead, so a page
   * called "just deployed" is ordered by deployment. Rows whose creating
   * transaction did not come back fall to the bottom rather than being
   * given a made-up position.
   */
  return rows.sort((a, b) => {
    const ta = a.deployedAt ? Date.parse(a.deployedAt) : -Infinity;
    const tb = b.deployedAt ? Date.parse(b.deployedAt) : -Infinity;
    return tb - ta;
  });
}

export async function GET() {
  try {
    const { value, stale } = await memo("new-contracts", TTL_MS, load);
    return NextResponse.json({
      ok: value.length > 0,
      stale,
      reason: value.length > 0 ? null : "empty",
      ts: Date.now(),
      // Verification records are indexer-only; a bare node has no idea
      // which contracts have published source, so there is no second
      // source for this feed by design.
      source: "blockscout" as const,
      fellBack: false,
      contracts: value,
    });
  } catch (err) {
    console.error("[pylon] /api/new:", (err as Error).message);
    return NextResponse.json({
      ok: false,
      reason: "unreachable",
      error: (err as Error).message,
      ts: Date.now(),
      contracts: [],
    });
  }
}
