"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { POLL_MS } from "./config";

export type Feed<T> = {
  data: T | null;
  live: boolean;
  loading: boolean;
  /** true once the first request has resolved either way */
  settled: boolean;
};

/**
 * Poll a JSON endpoint on an interval. The endpoint contract is
 * `{ ok: boolean, ...payload }` — `ok:false` flips the feed offline
 * without throwing away the last good payload.
 */
export function usePoll<T extends { ok?: boolean }>(
  url: string,
  intervalMs: number = POLL_MS,
): Feed<T> {
  const [data, setData] = useState<T | null>(null);
  const [live, setLive] = useState(false);
  const [settled, setSettled] = useState(false);
  const alive = useRef(true);

  const tick = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as T;
      if (!alive.current) return;
      if (json?.ok === false) {
        setLive(false);
      } else {
        setData(json);
        setLive(true);
      }
    } catch {
      if (alive.current) setLive(false);
    } finally {
      if (alive.current) setSettled(true);
    }
  }, [url]);

  useEffect(() => {
    alive.current = true;
    void tick();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void tick();
    }, intervalMs);
    return () => {
      alive.current = false;
      clearInterval(id);
    };
  }, [tick, intervalMs]);

  return { data, live, loading: !settled, settled };
}
