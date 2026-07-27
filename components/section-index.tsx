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
 * Fixed index down the left margin. Highlights whichever section owns the
 * upper third of the viewport. Hidden below 2xl, where the margin the site
 * runs at is not wide enough to hold it clear of the content.
 */
export function SectionIndex() {
  const [active, setActive] = useState<string>("network");

  useEffect(() => {
    const onScroll = () => {
      const line = window.innerHeight * 0.33;
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = s.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
