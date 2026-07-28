/**
 * What can actually be established about a contract, and what cannot.
 *
 * Every field here is either read from a source or left null with a reason
 * recorded next to it. Nothing is inferred, scored, or averaged, and there
 * is deliberately no overall verdict: the reader is given the facts and the
 * address of the source that supplied them, and draws their own conclusion.
 *
 * Server-side only.
 */

import { scout } from "./rpc";
import { checkCanonical, getRegistry, type CanonicalVerdict } from "./canonical";
import { readLiquidity, type LiquidityReading } from "./liquidity";
import { UpstreamError } from "./upstream";

export type AbiEntry = {
  type?: string;
  name?: string;
  stateMutability?: string;
  inputs?: Array<{ type?: string; name?: string }>;
};

/**
 * Groups of contract powers, each defined by which function names count and
 * nothing else. The matched signatures travel to the reader alongside the
 * label, so what is being claimed can always be checked against the ABI.
 */
export type PowerKey =
  | "mint"
  | "operatorBurn"
  | "pause"
  | "blacklist"
  | "fees"
  | "supply"
  | "upgrade"
  | "ownership";

type PowerRule = {
  key: PowerKey;
  label: string;
  /** What this power would let the holder of the keys do. */
  meaning: string;
  match: (fn: AbiEntry) => boolean;
};

const name = (fn: AbiEntry) => (fn.name ?? "").trim();
const firstInputIsAddress = (fn: AbiEntry) =>
  (fn.inputs?.[0]?.type ?? "") === "address";

const RULES: PowerRule[] = [
  {
    key: "mint",
    label: "Mint",
    meaning: "new units can be created after deployment",
    match: (fn) =>
      /^_?(mint|mintTo|mintFor|adminMint|issue|createTokens)$/i.test(name(fn)),
  },
  {
    key: "operatorBurn",
    label: "Burn from a holder",
    meaning: "someone other than the holder can destroy their balance",
    match: (fn) =>
      /^(adminBurn|forceBurn|burnFrom|seize|wipeFrozenAddress|destroyBlackFunds)$/i.test(
        name(fn),
      ) ||
      // Plain `burn(uint256)` destroys the caller's own balance and is not a
      // power over anyone else. `burn(address, …)` is a different function
      // wearing the same name.
      (/^burn$/i.test(name(fn)) && firstInputIsAddress(fn)),
  },
  {
    key: "pause",
    label: "Pause",
    meaning: "transfers or pricing can be stopped",
    match: (fn) =>
      /^(pause|unpause|setPaused|pauseOracle|unpauseOracle|halt|resume)$/i.test(
        name(fn),
      ),
  },
  {
    key: "blacklist",
    label: "Blacklist",
    meaning: "named addresses can be blocked from transacting",
    match: (fn) =>
      /^(add|remove|set)?(black|block|deny)_?list/i.test(name(fn)) ||
      /^(ban|unban|freezeAccount|unfreezeAccount|setFrozen|lockAccount|unlockAccount)$/i.test(
        name(fn),
      ),
  },
  {
    key: "fees",
    label: "Adjustable fees",
    meaning: "a cut can be taken from transfers, and changed later",
    match: (fn) =>
      /^(set|update|change)[A-Za-z]*(Fee|Fees|Tax|Taxes)([A-Za-z]*)?$/i.test(
        name(fn),
      ),
  },
  {
    key: "supply",
    label: "Supply restatement",
    meaning:
      "balances can be restated by a multiplier without any transfer taking place",
    match: (fn) =>
      /^(updateMultiplier|setMultiplier|rebase|setRebase|setSupplyMultiplier)$/i.test(
        name(fn),
      ),
  },
  {
    key: "upgrade",
    label: "Upgradeable code",
    meaning: "the code behind this address can be replaced",
    match: (fn) =>
      /^(upgradeTo|upgradeToAndCall|setImplementation|changeAdmin|upgrade)$/i.test(
        name(fn),
      ),
  },
  {
    key: "ownership",
    label: "Ownership and roles",
    meaning: "who holds the privileged keys can change",
    match: (fn) =>
      /^(transferOwnership|renounceOwnership|setOwner|setAdmin|grantRole|revokeRole|renounceRole)$/i.test(
        name(fn),
      ),
  },
];

export type PowerFinding = {
  key: PowerKey;
  label: string;
  meaning: string;
  /** Matched signatures, exactly as the ABI spells them. Empty means none. */
  signatures: string[];
  /** A fact about this power that does not come from the ABI. */
  note?: string;
};

const signature = (fn: AbiEntry) =>
  `${fn.name}(${(fn.inputs ?? []).map((i) => i.type ?? "").join(",")})`;

/**
 * Only functions that can change state are powers. `paused()` reports a
 * condition; `pause()` causes one. Treating them alike would flag every
 * contract that merely lets you ask a question.
 */
export function readPowers(abi: AbiEntry[]): PowerFinding[] {
  const writable = abi.filter(
    (fn) =>
      fn.type === "function" &&
      fn.stateMutability !== "view" &&
      fn.stateMutability !== "pure",
  );
  return RULES.map((rule) => ({
    key: rule.key,
    label: rule.label,
    meaning: rule.meaning,
    signatures: writable.filter(rule.match).map(signature).sort(),
  }));
}

// ---------------------------------------------------------------------------

type ScoutAddress = {
  hash?: string;
  is_contract?: boolean;
  is_verified?: boolean;
  is_scam?: boolean;
  reputation?: string | null;
  name?: string | null;
  creator_address_hash?: string | null;
  creation_transaction_hash?: string | null;
  proxy_type?: string | null;
  implementations?: Array<{ address_hash?: string; name?: string | null }>;
};

type ScoutToken = {
  name?: string | null;
  symbol?: string | null;
  type?: string | null;
  decimals?: string | null;
  total_supply?: string | null;
  holders_count?: string | null;
  exchange_rate?: string | null;
  volume_24h?: string | null;
  circulating_market_cap?: string | null;
  icon_url?: string | null;
};

type ScoutContract = {
  is_verified?: boolean;
  is_fully_verified?: boolean;
  is_partially_verified?: boolean;
  verified_at?: string | null;
  compiler_version?: string | null;
  license_type?: string | null;
  name?: string | null;
  abi?: AbiEntry[] | null;
  proxy_type?: string | null;
  implementations?: Array<{ address_hash?: string; name?: string | null }>;
};

type ScoutTx = { timestamp?: string | null; block_number?: number | null; from?: { hash?: string } };

type ScoutHolders = {
  items?: Array<{ address?: { hash?: string; is_contract?: boolean }; value?: string }>;
};

/**
 * The explorer answers a cold record slowly — measured at 11.2s for an
 * address it had not served recently. Eight seconds is the deadline anyway:
 * a scan runs two waves of these, and a checker nobody waits for is not a
 * checker. A source slower than this is reported as not having answered,
 * which is true and is the honest thing to print.
 */
const SCAN_TIMEOUT_MS = 8000;

/**
 * A 5xx arrives instantly, so a second attempt costs almost nothing — and
 * the holders endpoint does return the occasional 500 under load. It gets a
 * shorter deadline so a retry that hangs cannot double the wait.
 */
const SCAN_RETRY_TIMEOUT_MS = 4000;

/**
 * Three outcomes, not two. A 404 means the explorer has no such record —
 * an answer. A 500 or a timeout means it did not answer at all. Collapsing
 * those into one empty value produces the lie this whole page exists to
 * avoid: "this token has no holders" printed because a server was down.
 */
type Fetched<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "absent" | "unreachable"; detail: string };

async function optional<T>(path: string): Promise<Fetched<T>> {
  const started = Date.now();
  const once = (ms: number) => scout<T>(path, { attempts: 1, timeoutMs: ms });
  const log = (outcome: string) =>
    console.log(`[pylon] scan ${Date.now() - started}ms ${outcome} ${path}`);
  try {
    const value = await once(SCAN_TIMEOUT_MS);
    log("ok");
    return { ok: true, value };
  } catch (err) {
    const status = err instanceof UpstreamError ? err.status : undefined;
    if (status === 404) {
      log("absent");
      return { ok: false, reason: "absent", detail: "no record" };
    }
    if (status !== undefined && status >= 500) {
      try {
        const value = await once(SCAN_RETRY_TIMEOUT_MS);
        log("ok on retry");
        return { ok: true, value };
      } catch (retryErr) {
        log(`failed (${(retryErr as Error)?.message})`);
        return {
          ok: false,
          reason: "unreachable",
          detail: (retryErr as Error)?.message ?? "no response",
        };
      }
    }
    log(`failed (${(err as Error)?.message})`);
    return {
      ok: false,
      reason: "unreachable",
      detail: (err as Error)?.message ?? "no response",
    };
  }
}

/** Unwrap for the many places that only need the value or null. */
const got = <T>(f: Fetched<T>): T | null => (f.ok ? f.value : null);

export type ScanResult = {
  address: string;
  isContract: boolean;
  /** Explorer's own flags. Reported as the explorer's opinion, not ours. */
  explorer: { isScam: boolean | null; reputation: string | null; label: string | null };
  token: {
    name: string | null;
    symbol: string | null;
    type: string | null;
    decimals: number | null;
    totalSupply: string | null;
    holders: number | null;
    priceUsd: number | null;
    volume24hUsd: number | null;
    marketCapUsd: number | null;
  } | null;
  canonical: CanonicalVerdict;
  deployment: {
    creator: string | null;
    creatorIsContract: boolean | null;
    creationTxHash: string | null;
    originEoa: string | null;
    timestamp: string | null;
    ageSeconds: number | null;
    blockNumber: number | null;
  };
  verification: {
    verified: boolean | null;
    fully: boolean | null;
    partially: boolean | null;
    at: string | null;
    compiler: string | null;
    license: string | null;
    contractName: string | null;
  };
  proxy: {
    type: string | null;
    implementations: Array<{ address: string; name: string | null }>;
  };
  /** Which address's ABI the powers were read from, and whether one was read. */
  abi: { read: boolean; from: string | null; via: "self" | "implementation" | null };
  powers: PowerFinding[] | null;
  distribution: {
    counted: number;
    topShare: number | null;
    top: Array<{ address: string; value: string; share: number | null; isContract: boolean | null }>;
  } | null;
  liquidity: LiquidityReading;
  /** Signals a source did not supply, each with the reason it is absent. */
  missing: Array<{ field: string; reason: string }>;
};

export async function scanAddress(address: string): Promise<ScanResult> {
  const missing: Array<{ field: string; reason: string }> = [];

  /**
   * Nothing in this first group depends on anything else, so all of it goes
   * out at once. Only the creating transaction, the creator's own record and
   * the implementation's ABI need an answer first — that is two waves, not
   * the five round trips a naive top-to-bottom reading would take.
   */
  const [addrRes, tokenRes, contractRes, holdersRes, registry, liquidity] =
    await Promise.all([
      optional<ScoutAddress>(`/api/v2/addresses/${address}`),
      optional<ScoutToken>(`/api/v2/tokens/${address}`),
      optional<ScoutContract>(`/api/v2/smart-contracts/${address}`),
      optional<ScoutHolders>(`/api/v2/tokens/${address}/holders`),
      getRegistry(),
      // Only needs the address, so it belongs in the first wave rather than
      // adding its own budget to the end of the second. It gets a slightly
      // longer one: eight eth_calls in a single batch is more work than any
      // REST read here, and at eight seconds the node was missing the
      // deadline often enough to report "pools unknown" for tokens that
      // plainly have one.
      readLiquidity(address, 11000),
    ]);

  const addr = got(addrRes);
  const token = got(tokenRes);
  const contract = got(contractRes);

  /**
   * The address record is one source among several, not a gate. When it is
   * slow the token record and the verified source usually still arrive, and
   * throwing the whole scan away because one of five calls timed out would
   * discard answers already in hand.
   */
  if (!addrRes.ok && addrRes.reason === "unreachable") {
    missing.push({
      field: "deployer, creation date and the explorer's own flags",
      reason: `the explorer did not answer when asked for this address record (${addrRes.detail}). Anything below that comes from it is absent for that reason and not because the contract lacks it`,
    });
  }

  /**
   * Three sources can each establish that there is code here. Only when all
   * three are silent is the answer unknown — and unknown is said out loud
   * rather than reported as "not a contract".
   */
  const isContract =
    addr?.is_contract === true || contract !== null || token !== null;
  const contractStatusKnown =
    addrRes.ok || contractRes.ok || tokenRes.ok || addrRes.reason === "absent";

  const base: ScanResult = {
    address,
    isContract,
    explorer: {
      isScam: addr?.is_scam ?? null,
      reputation: addr?.reputation ?? null,
      label: addr?.name ?? null,
    },
    token: null,
    canonical: { state: "unchecked", reason: "not a token contract" },
    deployment: {
      creator: addr?.creator_address_hash ?? null,
      creatorIsContract: null,
      creationTxHash: addr?.creation_transaction_hash ?? null,
      originEoa: null,
      timestamp: null,
      ageSeconds: null,
      blockNumber: null,
    },
    verification: {
      verified: null,
      fully: null,
      partially: null,
      at: null,
      compiler: null,
      license: null,
      contractName: null,
    },
    proxy: { type: addr?.proxy_type ?? null, implementations: [] },
    abi: { read: false, from: null, via: null },
    powers: null,
    distribution: null,
    liquidity,
    missing,
  };

  if (!isContract) {
    missing.push({
      field: "everything below",
      reason: contractStatusKnown
        ? "this address holds no code, so there is no contract to examine — it is an ordinary account, or an address that has never been used"
        : "no source answered, so it is not known whether this address holds code. Nothing has been established about it either way",
    });
    return base;
  }

  const implAddress = (contract?.implementations ?? addr?.implementations ?? [])
    .find((i) => i.address_hash)?.address_hash;

  const [creationTxRes, creatorRes, implContractRes] = await Promise.all([
    addr?.creation_transaction_hash
      ? optional<ScoutTx>(`/api/v2/transactions/${addr.creation_transaction_hash}`)
      : Promise.resolve(null),
    addr?.creator_address_hash
      ? optional<ScoutAddress>(`/api/v2/addresses/${addr.creator_address_hash}`)
      : Promise.resolve(null),
    implAddress
      ? optional<ScoutContract>(`/api/v2/smart-contracts/${implAddress}`)
      : Promise.resolve(null),
  ]);

  const creationTx = creationTxRes ? got(creationTxRes) : null;
  const creator = creatorRes ? got(creatorRes) : null;
  const implContract = implContractRes ? got(implContractRes) : null;

  // --- identity -----------------------------------------------------------
  if (token?.symbol || token?.name) {
    base.token = {
      name: token.name ?? null,
      symbol: token.symbol ?? null,
      type: token.type ?? null,
      decimals: token.decimals ? Number(token.decimals) : null,
      totalSupply: token.total_supply ?? null,
      holders: token.holders_count ? Number(token.holders_count) : null,
      priceUsd: token.exchange_rate ? Number(token.exchange_rate) : null,
      volume24hUsd: token.volume_24h ? Number(token.volume_24h) : null,
      marketCapUsd: token.circulating_market_cap
        ? Number(token.circulating_market_cap)
        : null,
    };
    base.canonical = checkCanonical(registry, address, token.symbol);
  } else {
    missing.push({
      field: "token identity",
      reason: !tokenRes.ok && tokenRes.reason === "unreachable"
        ? `the explorer did not answer when asked for this token (${tokenRes.detail}), so nothing here has been checked against the canonical registry`
        : "the explorer has no token record for this address — it is a contract, but not one the indexer recognises as a token",
    });
  }

  // --- deployment ---------------------------------------------------------
  if (creationTx?.timestamp) {
    const t = Date.parse(creationTx.timestamp);
    base.deployment.timestamp = creationTx.timestamp;
    base.deployment.ageSeconds = Number.isFinite(t)
      ? Math.max(0, Math.floor((Date.now() - t) / 1000))
      : null;
    base.deployment.blockNumber = creationTx.block_number ?? null;
    base.deployment.originEoa = creationTx.from?.hash ?? null;
  } else {
    missing.push({
      field: "contract age",
      reason: !addr?.creation_transaction_hash
        ? "the explorer did not record a creating transaction for this address"
        : creationTxRes && !creationTxRes.ok && creationTxRes.reason === "unreachable"
          ? `the explorer did not answer when asked for the creating transaction (${creationTxRes.detail})`
          : "the explorer has no record of the creating transaction it named",
    });
  }

  if (base.deployment.creator) {
    base.deployment.creatorIsContract = creator?.is_contract ?? null;
  } else {
    missing.push({
      field: "deployer",
      reason: "the explorer did not record a creator for this address",
    });
  }

  // --- verification and ABI ----------------------------------------------
  const verificationUnknown = !contractRes.ok && contractRes.reason === "unreachable";
  if (verificationUnknown) {
    missing.push({
      field: "source verification",
      reason: `the explorer did not answer when asked whether this source is verified (${contractRes.detail}). Absence of an answer is not the same as an unverified contract, so nothing is claimed either way`,
    });
  }

  base.verification = {
    verified: verificationUnknown ? null : contract ? contract.is_verified === true : false,
    fully: contract?.is_fully_verified ?? null,
    partially: contract?.is_partially_verified ?? null,
    at: contract?.verified_at ?? null,
    compiler: contract?.compiler_version ?? null,
    license: contract?.license_type ?? null,
    contractName: contract?.name ?? addr?.name ?? null,
  };

  const impls = (contract?.implementations ?? addr?.implementations ?? [])
    .filter((i) => i.address_hash)
    .map((i) => ({ address: i.address_hash as string, name: i.name ?? null }));
  base.proxy = {
    type: contract?.proxy_type ?? addr?.proxy_type ?? null,
    implementations: impls,
  };

  /**
   * A proxy's own ABI describes the forwarding, not the token. Reading the
   * powers off it would report that a contract can do nothing, when in fact
   * everything it can do lives one hop away.
   */
  let abi: AbiEntry[] | null = null;
  if (impls.length > 0 && implContract?.abi?.length) {
    abi = implContract.abi;
    base.abi = { read: true, from: impls[0].address, via: "implementation" };
  }
  if (!abi && contract?.abi?.length) {
    abi = contract.abi;
    base.abi = { read: true, from: address, via: "self" };
  }

  if (abi) {
    base.powers = readPowers(abi);
    /**
     * A beacon or transparent proxy is upgradeable by construction, and the
     * function that does it sits on the proxy admin or the beacon, not in
     * the implementation ABI being read here. Left to the ABI alone this row
     * would report "none" about the one contract shape where the answer is
     * always yes.
     */
    if (base.proxy.type) {
      const upgrade = base.powers.find((p) => p.key === "upgrade");
      if (upgrade) {
        upgrade.note = `This address is a proxy of type ${base.proxy.type}, so the code behind it can be replaced by whoever holds the upgrade keys. That power sits on the proxy admin or the beacon, not in the implementation whose functions are listed here.`;
      }
    }
  } else {
    missing.push({
      field: "contract powers",
      reason:
        impls.length > 0
          ? "neither this contract nor the implementation behind it has verified source, so its functions cannot be listed"
          : "the source of this contract has not been verified, so its functions cannot be listed",
    });
  }

  // --- distribution -------------------------------------------------------
  const holders = got(holdersRes);
  const items = holders?.items ?? [];
  if (items.length > 0) {
    const supply = token?.total_supply ? BigInt(token.total_supply) : null;
    const top = items.slice(0, 10).map((h) => {
      const value = h.value ?? "0";
      return {
        address: h.address?.hash ?? "",
        value,
        share:
          supply && supply > 0n
            ? Number((BigInt(value) * 1000000n) / supply) / 10000
            : null,
        isContract: h.address?.is_contract ?? null,
      };
    });
    const sum = top.reduce((a, h) => a + BigInt(h.value), 0n);
    base.distribution = {
      counted: top.length,
      topShare:
        supply && supply > 0n
          ? Number((sum * 1000000n) / supply) / 10000
          : null,
      top,
    };
    if (!supply || supply === 0n) {
      missing.push({
        field: "top-10 share",
        reason:
          "the explorer reports no total supply for this token, so holdings cannot be expressed as a share of it",
      });
    }
  } else {
    missing.push({
      field: "holders and top-10 share",
      reason: !holdersRes.ok && holdersRes.reason === "unreachable"
        ? `the explorer did not answer when asked for the holder list (${holdersRes.detail}). This is a missing answer, not an empty one — do not read it as "no holders"`
        : "the explorer returned no holder list for this address — it may not be a token, or may have no holders yet",
    });
  }

  // --- liquidity ----------------------------------------------------------
  if (liquidity.state === "unchecked") {
    missing.push({
      field: "liquidity",
      reason: `${liquidity.reason}. Whether this token has a pool is therefore unknown — not zero`,
    });
  }

  return base;
}
