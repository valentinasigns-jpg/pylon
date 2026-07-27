import type { ReactNode } from "react";

/** Shared chrome for the per-page header widgets. */
export function WidgetFrame({
  title,
  status,
  live = true,
  children,
  footer,
}: {
  title: string;
  status?: string;
  live?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/70 backdrop-blur-[2px]">
      <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            <span className="h-1.5 w-1.5 bg-[color:var(--color-border)]" />
            <span className="h-1.5 w-1.5 bg-[color:var(--color-border)]" />
            <span className="h-1.5 w-1.5 bg-[color:var(--color-accent)]" />
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-dim)]">
            {title}
          </span>
        </div>
        {status && (
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em]">
            {live ? (
              <>
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)]" />
                <span className="text-[color:var(--color-accent)]">
                  {status}
                </span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 bg-[color:var(--color-dim)]" />
                <span className="text-[color:var(--color-dim)]">offline</span>
              </>
            )}
          </span>
        )}
      </div>

      {children}

      {footer && (
        <div className="border-t border-[color:var(--color-border)] px-3 py-2">
          {footer}
        </div>
      )}

      <span aria-hidden className="absolute -left-px -top-px h-2 w-2 border-l border-t border-[color:var(--color-accent)]" />
      <span aria-hidden className="absolute -right-px -top-px h-2 w-2 border-r border-t border-[color:var(--color-accent)]" />
      <span aria-hidden className="absolute -bottom-px -left-px h-2 w-2 border-b border-l border-[color:var(--color-accent)]" />
      <span aria-hidden className="absolute -bottom-px -right-px h-2 w-2 border-b border-r border-[color:var(--color-accent)]" />
    </div>
  );
}
