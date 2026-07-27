import type { ReactNode } from "react";

export function PageShell({
  index,
  title,
  lede,
  children,
}: {
  index: string;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-[color:var(--color-border)]">
        <div aria-hidden className="hero-grid absolute inset-0" />
        <div className="relative mx-auto max-w-[1400px] px-4 py-12 sm:px-6 sm:py-16">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-accent)]">
            [{index}]
          </div>
          <h1 className="h-display mt-2 text-3xl text-[color:var(--color-fg)] sm:text-5xl">
            {title}
          </h1>
          {lede && (
            <p className="mt-4 max-w-[70ch] text-[13px] leading-relaxed text-[color:var(--color-dim)] sm:text-sm">
              {lede}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] space-y-14 px-4 py-12 sm:px-6">
        {children}
      </div>
    </main>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[76ch] space-y-4 text-[13px] leading-relaxed text-[color:var(--color-dim)] [&_a]:text-[color:var(--color-accent)] [&_a:hover]:underline [&_h2]:mt-8 [&_h2]:text-[13px] [&_h2]:uppercase [&_h2]:tracking-[0.14em] [&_h2]:text-[color:var(--color-fg)] [&_strong]:text-[color:var(--color-fg)] [&_strong]:font-normal">
      {children}
    </div>
  );
}
