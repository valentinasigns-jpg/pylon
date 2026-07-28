import Link from "next/link";

const PANELS = [
  { id: "blocks", href: "/blocks", label: "Blocks" },
  { id: "gas", href: "/gas", label: "Base fee" },
  { id: "stocks", href: "/stocks", label: "Equities" },
  { id: "scan", href: "/scan", label: "Check a token" },
] as const;

/**
 * Each panel also has a page of its own. This keeps them reachable from one
 * another and points back at the dashboard, where they sit together.
 */
export function SiblingLinks({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[color:var(--color-border)] pt-4 text-[11px] uppercase tracking-[0.14em]">
      <Link
        href="/app"
        className="text-[color:var(--color-accent)] transition-colors hover:underline"
      >
        ← all panels
      </Link>
      {PANELS.filter((p) => p.id !== current).map((p) => (
        <Link
          key={p.id}
          href={p.href}
          className="text-[color:var(--color-dim)] transition-colors hover:text-[color:var(--color-fg)]"
        >
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
