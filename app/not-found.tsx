import Link from "next/link";
import { NAV } from "@/lib/config";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-[1400px] flex-col justify-center px-4 py-20 sm:px-6">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-accent)]">
        [404]
      </div>
      <h1 className="h-display mt-2 text-4xl text-[color:var(--color-fg)] sm:text-6xl">
        No such page
      </h1>
      <p className="mt-4 max-w-[60ch] text-[13px] leading-relaxed text-[color:var(--color-dim)]">
        That route does not exist on PYLON. If you were looking for a block, a
        transaction, or an address, use the search on the front page.
      </p>
      <div className="mt-8 flex flex-wrap gap-px bg-[color:var(--color-border)]">
        <Link
          href="/"
          className="bg-[color:var(--color-surface)] px-5 py-3 text-[12px] uppercase tracking-[0.14em] text-[color:var(--color-accent)] hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-bg)]"
        >
          Home
        </Link>
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="bg-[color:var(--color-surface)] px-5 py-3 text-[12px] uppercase tracking-[0.14em] text-[color:var(--color-dim)] hover:text-[color:var(--color-fg)]"
          >
            {n.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
