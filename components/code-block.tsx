import type { ReactNode } from "react";

/**
 * A framed code sample, built from the panel and label tokens the rest of
 * the site already uses — same hairline, same raised header bar, same muted
 * caps for the filename. Wide lines scroll inside the frame rather than
 * pushing the page sideways.
 */
export function CodeBlock({
  file,
  children,
  note,
}: {
  file: string;
  children: string;
  note?: ReactNode;
}) {
  return (
    <div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-raised)] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)]">
        {file}
      </div>
      <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed text-[color:var(--color-fg)]">
        <code>{children}</code>
      </pre>
      {note && (
        <p className="border-t border-[color:var(--color-border)] px-4 py-3 text-[11px] leading-relaxed text-[color:var(--color-dim)]">
          {note}
        </p>
      )}
    </div>
  );
}

/** A numbered step with a heading, matching the three-step block on `/`. */
export function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] text-[color:var(--color-accent)]">[{n}]</span>
        <h3 className="h-display text-[15px] text-[color:var(--color-fg)]">
          {title}
        </h3>
      </div>
      <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
        {children}
      </div>
    </div>
  );
}

/** Question and answer, for the "what if" sections. */
export function QA({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div className="border-b border-[color:var(--color-border)] py-4 last:border-b-0">
      <dt className="text-[13px] text-[color:var(--color-fg)]">{q}</dt>
      <dd className="mt-2 max-w-[76ch] space-y-2 text-[13px] leading-relaxed text-[color:var(--color-dim)]">
        {children}
      </dd>
    </div>
  );
}
