"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "network", n: "01", label: "Network" },
  { id: "blocks", n: "02", label: "Blocks" },
  { id: "gas", n: "03", label: "Base fee" },
  { id: "stocks", n: "04", label: "Equities" },
  { id: "search", n: "05", label: "Search" },
  { id: "about", n: "06", label: "About" },
];

/**
 * Fixed index down the left margin, marking the section the reader is in.
 *
 * The section is chosen by span rather than by "the last one whose top has
 * passed a line": a section counts as current while the reading line falls
 * between its top and bottom. Picking by top alone lagged by one entry
 * whenever a tall section sat above a short one.
 *
 * Hidden below 2xl, where the page margin is not wide enough to hold it
 * clear of the content.
 */
export function SectionIndex() {
  const [active, setActive] = useState<string>("network");

  useEffect(() => {
    const measure = () => {
      const line = window.innerHeight * 0.3;
      let current = SECTIONS[0].id;
      let matched = false;

      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) {
          current = s.id;
          matched = true;
          break;
        }
        // Fallback for the gaps between sections: remember the last one
        // whose top the line has already crossed.
        if (r.top <= line) current = s.id;
      }

      // Past the last section, pin to it rather than snapping back.
      if (!matched) {
        const atBottom =
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 4;
        if (atBottom) current = SECTIONS[SECTIONS.length - 1].id;
      }

      setActive(current);
    };

    // Measured straight from the scroll event rather than deferred to an
    // animation frame: six rect reads is cheap, and a deferred measure
    // freezes the marker wherever rAF is throttled.
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    // Second trigger. An observer watching a thin band at the reading line
    // fires on its own whenever a boundary crosses it, so the marker still
    // tracks if scroll events arrive sparsely — during a smooth-scroll
    // animation, say, or an anchor jump.
    const io = new IntersectionObserver(() => measure(), {
      rootMargin: "-30% 0px -69% 0px",
      threshold: 0,
    });
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <nav
      aria-label="Section index"
      className="fixed left-5 top-1/2 z-30 hidden -translate-y-1/2 2xl:block"
    >
      <ul className="space-y-2.5">
        {SECTIONS.map((s) => {
          const on = active === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="group flex items-center gap-2"
                aria-current={on ? "true" : undefined}
              >
                <span
                  className={`h-px transition-all duration-200 ${
                    on
                      ? "w-5 bg-[color:var(--color-accent)]"
                      : "w-2.5 bg-[color:var(--color-border)] group-hover:w-4 group-hover:bg-[color:var(--color-dim)]"
                  }`}
                />
                <span
                  className={`text-[10px] tabular-nums tracking-[0.14em] transition-colors duration-200 ${
                    on
                      ? "text-[color:var(--color-accent)]"
                      : "text-[color:var(--color-border)] group-hover:text-[color:var(--color-dim)]"
                  }`}
                >
                  {s.n}
                </span>
                {/* The name is carried by the link's accessible label rather
                    than rendered — the rail reads as a scale, not a menu. */}
                <span className="sr-only">{s.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
