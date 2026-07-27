"use client";

import { useEffect, useRef, useState } from "react";

export type Direction = "up" | "down" | null;

const DURATION = 300;
const FLASH_MS = 200;
const DECAY_MS = 600;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Tween a metric toward each new reading.
 *
 * The displayed figure is only ever travelling between two values the
 * upstream actually reported — nothing is extrapolated past the last
 * reading, so a number in motion is a transition, never a guess.
 */
export function useAnimatedNumber(target: number | null): {
  value: number | null;
  direction: Direction;
  /** 1 at the moment of change, decaying to 0 — drives the flash */
  flash: number;
} {
  const [value, setValue] = useState<number | null>(target);
  const [direction, setDirection] = useState<Direction>(null);
  const [flash, setFlash] = useState(0);

  const from = useRef<number | null>(target);
  const raf = useRef(0);
  const flashRaf = useRef(0);

  useEffect(() => {
    if (target === null) return;

    const start = from.current;

    // First real reading: adopt it without a tween or a flash.
    if (start === null) {
      from.current = target;
      setValue(target);
      return;
    }
    if (start === target) return;

    const dir: Direction = target > start ? "up" : "down";
    setDirection(dir);

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      from.current = target;
      setValue(target);
    } else {
      const t0 = performance.now();
      cancelAnimationFrame(raf.current);
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / DURATION);
        setValue(start + (target - start) * easeOut(p));
        if (p < 1) raf.current = requestAnimationFrame(step);
        else from.current = target;
      };
      raf.current = requestAnimationFrame(step);
    }

    // hold the flash, then decay it
    const f0 = performance.now();
    cancelAnimationFrame(flashRaf.current);
    const decay = (now: number) => {
      const age = now - f0;
      if (age < FLASH_MS) {
        setFlash(1);
        flashRaf.current = requestAnimationFrame(decay);
      } else if (age < FLASH_MS + DECAY_MS) {
        setFlash(1 - (age - FLASH_MS) / DECAY_MS);
        flashRaf.current = requestAnimationFrame(decay);
      } else {
        setFlash(0);
      }
    };
    flashRaf.current = requestAnimationFrame(decay);

    return () => {
      cancelAnimationFrame(raf.current);
      cancelAnimationFrame(flashRaf.current);
    };
  }, [target]);

  return { value, direction, flash };
}

/** Keep the last N readings of a value, for sparklines. */
export function useHistory(value: number | null, size = 50): number[] {
  const [hist, setHist] = useState<number[]>([]);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (value === null || value === last.current) return;
    last.current = value;
    setHist((h) => {
      const next = [...h, value];
      return next.length > size ? next.slice(next.length - size) : next;
    });
  }, [value, size]);

  return hist;
}
