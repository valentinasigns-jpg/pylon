"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { NAV, X_HANDLE } from "@/lib/config";
import { usePoll } from "@/lib/use-poll";
import { LivePill } from "./primitives";

export function Header() {
  const [open, setOpen] = useState(false);
  const { live, settled, reason } = usePoll<{ ok: boolean }>("/api/chain");

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/92 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <PylonMark />
          <span className="h-display text-[15px] text-[color:var(--color-fg)]">
            PYLON
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-[12px] uppercase tracking-[0.1em] text-[color:var(--color-dim)] hover:text-[color:var(--color-fg)]"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <span className="hidden sm:block">
            {settled ? (
              <LivePill live={live} reason={reason} />
            ) : (
              <span className="inline-flex items-center gap-2 border border-[color:var(--color-border)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
                <span className="h-1.5 w-1.5 bg-[color:var(--color-dim)]" />
                connecting
              </span>
            )}
          </span>

          <span className="hidden border border-[color:var(--color-border)] px-2 py-1 text-[11px] text-[color:var(--color-dim)] lg:inline-block">
            $PYLON
          </span>

          {/* TODO: replace X_HANDLE in lib/config.ts with the real handle */}
          <a
            href={X_HANDLE}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
            className="grid h-8 w-8 place-items-center border border-[color:var(--color-border)] text-[color:var(--color-dim)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
          >
            <XGlyph />
          </a>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            className="grid h-8 w-8 place-items-center border border-[color:var(--color-border)] text-[color:var(--color-dim)] md:hidden"
          >
            {open ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)] md:hidden">
          <div className="mx-auto max-w-[1400px] px-4 py-2 sm:px-6">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="block border-b border-[color:var(--color-border)] py-3 text-[12px] uppercase tracking-[0.1em] text-[color:var(--color-dim)] last:border-b-0 hover:text-[color:var(--color-fg)]"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

function PylonMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M2 16 L9 2 L16 16" fill="none" stroke="#00FF9C" strokeWidth="1.6" />
      <path d="M5.2 10.5 H12.8" stroke="#00FF9C" strokeWidth="1.6" />
      <path d="M9 2 V16" stroke="#00FF9C" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M18.244 2H21l-6.56 7.5L22.5 22h-6.9l-4.54-6.03L5.9 22H3.14l7.03-8.03L2.5 2h7.03l4.11 5.48L18.24 2zm-1.21 18.4h1.9L7.06 3.5H5.06l11.97 16.9z" />
    </svg>
  );
}
