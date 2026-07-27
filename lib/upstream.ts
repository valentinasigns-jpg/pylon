/**
 * Resilience helpers for the two public upstreams.
 *
 * Production was returning "feed offline" because every request went
 * straight to the node with no timeout, no retry and no cache. A cold
 * function plus a slow upstream reached Vercel's execution limit, the
 * platform killed the request, and the client read that as an outage.
 *
 * Server-side only.
 */

export const UPSTREAM_TIMEOUT_MS = 9000;

/** Which host actually served a value. */
export type Source = "rpc" | "blockscout";

/**
 * Why a panel has nothing to show. These are different situations for the
 * reader and are worth separating: a silent endpoint is an outage, an empty
 * answer is simply an absence.
 */
export type Reason = "unreachable" | "empty";

/**
 * Carried through a request so a route can report which host answered and
 * whether it had to fall back, without changing every call signature.
 */
export type Trace = { source?: Source; fellBack?: boolean };

/**
 * A source that keeps failing is skipped for a while.
 *
 * Without this, every request in an outage pays the primary's full timeout
 * before reaching the fallback — measured at thirteen seconds a call
 * against a host that was never going to answer. After a couple of
 * failures the primary is stepped over entirely and requests go straight to
 * the source that works, until the window lapses and it is tried again.
 */
const BREAKER_THRESHOLD = 2;
// Long enough that a sustained outage is not re-probed on every poll — at
// twenty seconds the window kept lapsing between requests and each one paid
// the dead host's timeout again.
const BREAKER_COOLDOWN_MS = 60000;

const breaker = new Map<string, { failures: number; openedAt: number }>();

function isOpen(key: string): boolean {
  const b = breaker.get(key);
  if (!b) return false;
  if (b.failures < BREAKER_THRESHOLD) return false;
  if (Date.now() - b.openedAt > BREAKER_COOLDOWN_MS) {
    // Cooldown lapsed — let one request through to see if it recovered.
    breaker.delete(key);
    return false;
  }
  return true;
}

function noteFailure(key: string) {
  const b = breaker.get(key) ?? { failures: 0, openedAt: 0 };
  b.failures += 1;
  if (b.failures >= BREAKER_THRESHOLD) b.openedAt = Date.now();
  breaker.set(key, b);
}

function noteSuccess(key: string) {
  breaker.delete(key);
}

/** Which primaries are currently being stepped over, for /api/health. */
export function openBreakers(): string[] {
  return [...breaker.keys()].filter(isOpen);
}

/**
 * Try the primary, and on failure the secondary. Records the winner in the
 * trace. Only throws if both are down.
 */
export async function withFallback<T>(
  primary: { source: Source; run: () => Promise<T> },
  secondary: { source: Source; run: () => Promise<T> },
  trace?: Trace,
  label = "upstream",
): Promise<T> {
  const key = `${label}:${primary.source}`;

  if (!isOpen(key)) {
    try {
      const v = await primary.run();
      noteSuccess(key);
      if (trace) {
        trace.source = primary.source;
        trace.fellBack = false;
      }
      return v;
    } catch (err) {
      noteFailure(key);
      console.error(
        `[pylon] ${label}: ${primary.source} failed, trying ${secondary.source}:`,
        (err as Error)?.message,
      );
    }
  }

  const v = await secondary.run();
  if (trace) {
    trace.source = secondary.source;
    trace.fellBack = true;
  }
  return v;
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly source: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/** fetch with a hard deadline, so a hung socket can never pin the function. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = UPSTREAM_TIMEOUT_MS,
): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Retry with a short backoff. Two attempts total by default — enough to
 * ride out a single dropped connection without doubling worst-case latency.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  { attempts = 2, baseMs = 250, label = "upstream" }: {
    attempts?: number;
    baseMs?: number;
    label?: string;
  } = {},
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
      }
    }
  }
  console.error(
    `[pylon] ${label} failed after ${attempts} attempts:`,
    (last as Error)?.message ?? last,
  );
  throw last;
}

type Entry<T> = { at: number; value: T };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * Cache a value in module memory for `ttlMs`, and collapse concurrent
 * callers onto one upstream request.
 *
 * Serverless instances are reused between invocations, so even a few
 * seconds of TTL removes most of the load — and a burst of viewers all
 * polling at once costs exactly one upstream call.
 *
 * On failure, a stale entry is served if one exists rather than surfacing
 * an outage the visitor does not actually have.
 */
export async function memo<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<{ value: T; stale: boolean }> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && now - hit.at < ttlMs) {
    return { value: hit.value, stale: false };
  }

  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) {
    return { value: await running, stale: false };
  }

  const p = (async () => {
    try {
      const v = await fn();
      store.set(key, { at: Date.now(), value: v });
      return v;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);

  try {
    return { value: await p, stale: false };
  } catch (err) {
    if (hit) {
      console.error(
        `[pylon] ${key} refresh failed, serving stale (${Math.round(
          (now - hit.at) / 1000,
        )}s old):`,
        (err as Error)?.message,
      );
      return { value: hit.value, stale: true };
    }
    throw err;
  }
}

/** Snapshot of what is currently cached, for /api/health. */
export function cacheAges(): Record<string, number> {
  const now = Date.now();
  const out: Record<string, number> = {};
  for (const [k, v] of store) out[k] = now - v.at;
  return out;
}
