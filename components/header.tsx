"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { NAV, GITHUB_URL, X_HANDLE } from "@/lib/config";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/92 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        {/* Wordmark and nav travel together. Left as two ends of a
            space-between row, a 1400px header opened a gap between them
            wider than the menu itself.

            The full menu appears at xl rather than md: seven labels measure
            809px, and below about 1170px of viewport that runs into the
            status pill on the right. Under that width the same seven live
            in the drawer. */}
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <PylonMark />
            <span className="h-display text-[15px] text-[color:var(--color-fg)]">
              PYLON
            </span>
          </Link>

          <nav className="hidden items-center gap-6 xl:flex">
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
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Top right is for getting out of here — the source and the
              account. The live pill used to sit here, reporting on a chain
              this site no longer exists to report on; the panels that
              actually depend on a feed still carry their own. */}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            title="GitHub"
            className="grid h-8 w-8 place-items-center border border-[color:var(--color-border)] text-[color:var(--color-dim)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
          >
            <GitHubGlyph />
          </a>

          {/* The account. Until there is a handle it is present but inert:
              the pair should look finished, and a box that leads nowhere is
              worse than a box that says it is not ready yet. Same "soon" the
              rest of the site uses for things that exist but are not live.
              Set X_HANDLE and it becomes a link with no other change. */}
          {X_HANDLE ? (
            <a
              href={X_HANDLE}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X"
              title="X"
              className="grid h-8 w-8 place-items-center border border-[color:var(--color-border)] text-[color:var(--color-dim)] transition-colors hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
            >
              <XGlyph />
            </a>
          ) : (
            <span
              aria-label="X — soon"
              title="X — soon"
              className="grid h-8 w-8 cursor-default place-items-center border border-[color:var(--color-border)] text-[color:var(--color-dim)]/70"
            >
              <XGlyph />
            </span>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
            className="grid h-8 w-8 place-items-center border border-[color:var(--color-border)] text-[color:var(--color-dim)] xl:hidden"
          >
            {open ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)] xl:hidden">
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

/**
 * A P built as a pylon: one mast the full height of the glyph, a bowl that
 * is a braced frame hung off it. The old mark was an apex and a tie — next
 * to the word it read as an A.
 *
 * The brace carries half the weight of the frame, the same relationship the
 * previous mark used for its secondary line. Everything is stroked; there
 * are no fills to collapse at small sizes.
 */
function PylonMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <g fill="none" stroke="#00FF9C" strokeWidth="1.6">
        <path d="M4.6 1.8 V16.2" />
        <path d="M4.6 1.8 H13.4 V8.4 H4.6" />
      </g>
      <path
        d="M4.6 8.4 L13.4 1.8"
        fill="none"
        stroke="#00FF9C"
        strokeWidth="0.8"
        opacity="0.5"
      />
    </svg>
  );
}

function GitHubGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.19c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/**
 * Sized to match the GitHub mark's box rather than its ink. The octocat is
 * effectively a filled disc and this is four thin strokes, so they will
 * never weigh the same — sharing a footprint is what makes them read as a
 * pair.
 */
function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M18.244 2H21l-6.56 7.5L22.5 22h-6.9l-4.54-6.03L5.9 22H3.14l7.03-8.03L2.5 2h7.03l4.11 5.48L18.24 2zm-1.21 18.4h1.9L7.06 3.5H5.06l11.97 16.9z" />
    </svg>
  );
}
