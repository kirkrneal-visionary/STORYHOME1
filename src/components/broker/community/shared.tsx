"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Send } from "lucide-react";
import { scanAntitrust } from "@/lib/community";
import { cn } from "@/lib/utils";

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function GuardrailNotice({ hits }: { hits: string[] }) {
  if (hits.length === 0) return null;
  return (
    <div className="mt-2 flex items-start gap-2 rounded-md border border-gold/40 bg-gold/10 p-2.5 text-xs text-ink">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
      <span>
        Antitrust guardrail: this mentions {hits.map((h) => `“${h}”`).join(", ")}.
        Discussing or agreeing on commissions/fees with other brokerages can
        raise price-fixing concerns. Keep it educational and avoid setting rates.
      </span>
    </div>
  );
}

/** Body composer with a live antitrust guardrail. */
export function GuardrailComposer({
  placeholder,
  submitLabel = "Post",
  onSubmit,
  disabled,
  rows = 3,
  extraControls,
}: {
  placeholder: string;
  submitLabel?: string;
  onSubmit: (body: string) => void;
  disabled?: boolean;
  rows?: number;
  extraControls?: React.ReactNode;
}) {
  const [body, setBody] = useState("");
  const scan = useMemo(() => scanAntitrust(body), [body]);

  function submit() {
    if (!body.trim()) return;
    onSubmit(body.trim());
    setBody("");
  }

  return (
    <div>
      <textarea
        value={body}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setBody(e.target.value)}
        className="w-full rounded-md border border-hairline bg-[var(--background)] px-3 py-2 text-sm text-ink outline-none focus:border-gold disabled:opacity-60"
      />
      <GuardrailNotice hits={scan.hits} />
      <div className="mt-2 flex items-center justify-between gap-2">
        {extraControls}
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !body.trim()}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-opacity",
            body.trim() && !disabled
              ? "bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90"
              : "cursor-not-allowed bg-[var(--accent)]/30 text-[var(--accent-contrast)]/50",
          )}
        >
          <Send className="h-3.5 w-3.5" /> {submitLabel}
        </button>
      </div>
    </div>
  );
}
