"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { POLL_MS } from "./config";

/** Give up on a single poll well before the user notices it hanging. */
const REQUEST_TIMEOUT_MS = 12000;
/**
 * One failed poll is a blip, not an outage. Only report offline after this
 * many in a row — otherwise a single cold start on the server flips every
 * panel on the page to "feed offline" while the data is perfectly fine.
 */
const FAILURES_BEFORE_OFFLINE = 2;

/** Why there is nothing to show. */
/**
 * Why a panel has nothing to show. Three situations, not two: a silent
 * endpoint is an outage, an answer with nothing in it is an absence, and
 * "nothing was ever deployed to ask" is neither — it is the expected state
 * of a page whose contract does not exist yet, and showing it as an outage
 * would be a lie about our own uptime.
 */
export type FeedReason = "unreachable" | "empty" | "not-deployed" | null;

export type Feed<T> = {
  data: T | null;
  live: boolean;
  loading: boolean;
  /** true once the first request has resolved either way */
  settled: boolean;
  /** the server served a cached value because a refresh failed */
  stale: boolean;
  /** epoch ms of the last successful response */
  updatedAt: number | null;
  /** distinguishes a silent endpoint from an empty answer */
  reason: FeedReason;
  /** which upstream served the current payload */
  source: string | null;
  /** the primary was down and a secondary answered */
  fellBack: boolean;
};

type Envelope = {
  ok?: boolean;
  stale?: boolean;
  reason?: FeedReason;
  source?: string | null;
  fellBack?: boolean;
};

/**
 * Poll a JSON endpoint on an interval. The endpoint contract is
 * `{ ok: boolean, ...payload }`. The last good payload is always kept, so
 * a transient failure never blanks the UI.
 */
export function usePoll<T extends Envelope>(
  url: string,
  intervalMs: number = POLL_MS,
): Feed<T> {
  const [data, setData] = useState<T | null>(null);
  const [live, setLive] = useState(false);
  const [settled, setSettled] = useState(false);
  const [stale, setStale] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [reason, setReason] = useState<FeedReason>(null);
  const [source, setSource] = useState<string | null>(null);
  const [fellBack, setFellBack] = useState(false);

  const alive = useRef(true);
  const failures = useRef(0);
  const inFlight = useRef(false);

  const tick = useCallback(async () => {
    // Never stack requests: if the previous poll is still running, skip.
    if (inFlight.current) return;
    inFlight.current = true;

    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, { cache: "no-store", signal: ctl.signal });
      if (!res.ok) throw new Error(`http ${res.status}`);
      const json = (await res.json()) as T;

      if (!alive.current) return;

      /**
       * "Nothing is deployed to ask" is a settled fact, not a failure. It
       * must not spend two rounds pretending to be an outage before it
       * admits what it is, and the payload has to reach the component —
       * the server's explanation of why there is nothing is the only thing
       * worth rendering.
       */
      if (json?.reason === "not-deployed") {
        failures.current = 0;
        setData(json);
        setLive(false);
        setStale(false);
        setReason("not-deployed");
        setSource(null);
        setFellBack(false);
        setUpdatedAt(Date.now());
      } else if (json?.ok === false) {
        failures.current += 1;
        if (failures.current >= FAILURES_BEFORE_OFFLINE) {
          setLive(false);
          setReason(json.reason ?? "unreachable");
        }
      } else {
        failures.current = 0;
        setData(json);
        setLive(true);
        setStale(Boolean(json?.stale));
        setReason(json?.reason ?? null);
        setSource(json?.source ?? null);
        setFellBack(Boolean(json?.fellBack));
        setUpdatedAt(Date.now());
      }
    } catch {
      if (!alive.current) return;
      failures.current += 1;
      if (failures.current >= FAILURES_BEFORE_OFFLINE) {
        setLive(false);
        // The request itself never completed, so this is the endpoint being
        // silent rather than the chain having nothing to report.
        setReason("unreachable");
      }
    } finally {
      clearTimeout(timer);
      inFlight.current = false;
      if (alive.current) setSettled(true);
    }
  }, [url]);

  useEffect(() => {
    alive.current = true;
    failures.current = 0;
    void tick();

    const id = setInterval(() => {
      if (document.visibilityState === "visible") void tick();
    }, intervalMs);

    // Catch up immediately when the tab comes back rather than waiting out
    // a whole interval on stale numbers.
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive.current = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [tick, intervalMs]);

  return {
    data,
    live,
    loading: !settled,
    settled,
    stale,
    updatedAt,
    reason,
    source,
    fellBack,
  };
}
