/**
 * The canonical Robinhood Stock Token registry.
 *
 * Robinhood's own documentation warns that a token carrying a familiar name
 * or ticker but a different contract address is not a Robinhood Stock Token.
 * That warning is only useful if you can check it, so this reads the same
 * list the documentation page reads — `api.robinhood.com/rhj/assets`, the
 * endpoint that fills the table at docs.robinhood.com/chain/contracts.
 *
 * PYLON does not curate this list, edit it, or add to it. If the endpoint
 * does not answer, no comparison is made and the reader is told the check
 * could not run — an unverified claim is worse than a missing one.
 *
 * Server-side only.
 */

import { fetchWithTimeout, memo, retry, UpstreamError } from "./upstream";
import { CHAIN } from "./config";

export const REGISTRY_URL = "https://api.robinhood.com/rhj/assets";

/** The registry changes when Robinhood lists a new equity — rarely. */
const REGISTRY_TTL_MS = 10 * 60 * 1000;

export type CanonicalToken = {
  symbol: string;
  name: string;
  address: string;
  /**
   * Robinhood restates supply through a multiplier rather than by minting,
   * so a value other than 1 means the holder's balance and the raw ERC-20
   * `balanceOf` disagree on purpose. Worth showing; never worth hiding.
   */
  multiplier: string | null;
  status: string | null;
};

export type Registry = {
  bySymbol: Map<string, CanonicalToken>;
  byAddress: Map<string, CanonicalToken>;
  all: CanonicalToken[];
};

type RawAsset = {
  tokenSymbol?: string;
  tokenName?: string;
  status?: string;
  currentMultiplier?: string;
  deployments?: Array<{ contractAddress?: string; chainId?: number }>;
};

async function fetchRegistry(): Promise<CanonicalToken[]> {
  return retry(
    async () => {
      const res = await fetchWithTimeout(REGISTRY_URL, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        throw new UpstreamError(`http ${res.status}`, "registry", res.status);
      }
      const json = (await res.json()) as { assets?: RawAsset[] };
      const assets = json.assets ?? [];

      const out: CanonicalToken[] = [];
      for (const a of assets) {
        const symbol = a.tokenSymbol?.trim();
        if (!symbol) continue;
        // An asset can in principle be deployed on more than one chain; only
        // the deployment on the chain this site reads is relevant here.
        const dep = a.deployments?.find(
          (d) => d.chainId === CHAIN.id && d.contractAddress,
        );
        if (!dep?.contractAddress) continue;
        out.push({
          symbol: symbol.toUpperCase(),
          name: a.tokenName?.trim() ?? symbol,
          address: dep.contractAddress,
          multiplier: a.currentMultiplier ?? null,
          status: a.status ?? null,
        });
      }
      if (out.length === 0) {
        throw new UpstreamError("registry returned no assets", "registry");
      }
      return out;
    },
    { label: "registry", attempts: 2 },
  );
}

/**
 * The registry, or null if it could not be read. Callers must handle null
 * by saying the check did not run rather than by assuming anything.
 */
export async function getRegistry(): Promise<Registry | null> {
  try {
    const { value } = await memo("registry", REGISTRY_TTL_MS, fetchRegistry);
    const bySymbol = new Map<string, CanonicalToken>();
    const byAddress = new Map<string, CanonicalToken>();
    for (const t of value) {
      bySymbol.set(t.symbol, t);
      byAddress.set(t.address.toLowerCase(), t);
    }
    return { bySymbol, byAddress, all: value };
  } catch (err) {
    console.error("[pylon] registry unavailable:", (err as Error)?.message);
    return null;
  }
}

/**
 * What the registry has to say about one address claiming one symbol.
 *
 * `impostor` is the case the documentation warns about and the only reason
 * this file exists: the ticker is a listed Robinhood equity, but the
 * contract in front of you is not the one Robinhood issued.
 */
export type CanonicalVerdict =
  | { state: "canonical"; listed: CanonicalToken }
  | { state: "impostor"; listed: CanonicalToken }
  | { state: "unlisted-symbol" }
  | { state: "no-symbol" }
  | { state: "unchecked"; reason: string };

export function checkCanonical(
  registry: Registry | null,
  address: string,
  symbol: string | null | undefined,
): CanonicalVerdict {
  if (!registry) {
    return { state: "unchecked", reason: "registry did not answer" };
  }

  const byAddr = registry.byAddress.get(address.toLowerCase());
  if (byAddr) return { state: "canonical", listed: byAddr };

  const sym = symbol?.trim().toUpperCase();
  if (!sym) return { state: "no-symbol" };

  const listed = registry.bySymbol.get(sym);
  if (listed) return { state: "impostor", listed };

  return { state: "unlisted-symbol" };
}
