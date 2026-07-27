"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * A JSON-RPC endpoint is not a page. Opening one in a browser sends a GET
 * with no body and the node replies with a parse error, which looks broken
 * to anyone who clicks it. So the URL is rendered as copyable code rather
 * than a hyperlink, with the method it actually accepts spelled out.
 */
export function Endpoint({
  url,
  method = "POST",
  note,
  className = "",
}: {
  url: string;
  method?: string;
  note?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div
      className={`border border-[color:var(--color-border)] bg-[color:var(--color-bg)] ${className}`}
    >
      <div className="flex items-stretch">
        <span className="flex shrink-0 items-center border-r border-[color:var(--color-border)] px-2 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-accent)]">
          {method}
        </span>
        <code className="min-w-0 flex-1 overflow-x-auto px-2.5 py-2 text-[12px] whitespace-nowrap text-[color:var(--color-fg)]">
          {url}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${url}`}
          className="flex shrink-0 items-center gap-1.5 border-l border-[color:var(--color-border)] px-2.5 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-dim)] hover:bg-[color:var(--color-accent)] hover:text-[color:var(--color-bg)]"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      {note && (
        <p className="border-t border-[color:var(--color-border)] px-2.5 py-1.5 text-[10px] leading-relaxed text-[color:var(--color-dim)]">
          {note}
        </p>
      )}
    </div>
  );
}
