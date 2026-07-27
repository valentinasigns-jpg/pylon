"use client";

import { useEffect, useState } from "react";

const SEARCH_ID = "pylon-search";
const ROW_ATTR = "data-block-row";

function isTyping(el: EventTarget | null) {
  const n = el as HTMLElement | null;
  if (!n) return false;
  const tag = n.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || n.isContentEditable;
}

/**
 * Keyboard access, wired against the DOM rather than shared state so that
 * no component needs to know the shortcuts exist.
 *
 *   /      focus search
 *   j / k  step down / up the block list
 *   Esc    clear search, or drop focus
 */
export function KeyboardShortcuts() {
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const rows = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(`[${ROW_ATTR}]`),
      ).filter((el) => el.offsetParent !== null);

    function step(dir: 1 | -1) {
      const list = rows();
      if (list.length === 0) return;
      const at = list.indexOf(document.activeElement as HTMLElement);
      const next =
        at === -1
          ? 0
          : Math.max(0, Math.min(list.length - 1, at + dir));
      const el = list[next];
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const search = document.getElementById(SEARCH_ID) as HTMLInputElement | null;

      if (e.key === "Escape") {
        if (search && document.activeElement === search) {
          search.value = "";
          search.dispatchEvent(new Event("input", { bubbles: true }));
          search.blur();
        } else {
          (document.activeElement as HTMLElement | null)?.blur();
        }
        return;
      }

      if (isTyping(e.target)) return;

      if (e.key === "/") {
        e.preventDefault();
        search?.focus();
        search?.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
      if (e.key === "j") {
        e.preventDefault();
        step(1);
        return;
      }
      if (e.key === "k") {
        e.preventDefault();
        step(-1);
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setHint((v) => !v);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 hidden lg:block">
      <div
        className={`border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 transition-opacity duration-200 ${
          hint ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="space-y-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
          <div>
            <Key>/</Key> search
          </div>
          <div>
            <Key>j</Key> <Key>k</Key> blocks
          </div>
          <div>
            <Key>esc</Key> clear
          </div>
        </div>
      </div>
      <div className="mt-1.5 text-right text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-border)]">
        press ? for keys
      </div>
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span className="mr-1 inline-block border border-[color:var(--color-border)] px-1 text-[color:var(--color-fg)]">
      {children}
    </span>
  );
}
