"use client";

import { useState } from "react";
import { ShiEvidenceChip } from "@/components/broker/intelligence/ShiEvidenceChip";
import {
  CORRIDOR_ASK_HONESTY,
  CORRIDOR_ASK_INTENTS,
  type CorridorAskAnswer,
} from "@/lib/shi/corridor-ask";
import { EVIDENCE_LEGEND_LINES } from "@/lib/shi/evidence-tier";

/**
 * Shared Ask Archie panel — Corridors desk + Research Access desk (R2).
 */
export function ShiCorridorsAskPanel({
  answer,
  onAsk,
}: {
  answer: CorridorAskAnswer | null;
  onAsk: (query: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-3" data-corridor-ask-panel>
      <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
        Ask Archie
      </p>
      <p className="text-[11px] leading-snug text-[var(--muted)]">
        {CORRIDOR_ASK_HONESTY}
      </p>
      <div
        className="flex flex-wrap gap-1"
        data-evidence-legend
        title="Evidence labels Archie uses on desk facts"
      >
        {EVIDENCE_LEGEND_LINES.slice(0, 6).map((row) => (
          <ShiEvidenceChip key={row.tier} tier={row.tier} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5" data-corridor-ask-chips>
        {CORRIDOR_ASK_INTENTS.map((intent) => (
          <button
            key={intent.id}
            type="button"
            onClick={() => onAsk(intent.id)}
            className="rounded-md border border-hairline bg-[var(--background)] px-2 py-1.5 font-mono text-[10px] font-semibold uppercase text-ink hover:border-gold/40"
          >
            {intent.chip}
          </button>
        ))}
      </div>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onAsk(draft.trim());
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Or type a canned question…"
          className="field-input h-9 flex-1 text-xs"
          data-corridor-ask-input
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-lg bg-gold px-3 text-xs font-bold text-navy"
        >
          Ask
        </button>
      </form>
      {answer ? (
        <div className="story-well space-y-2 px-3 py-2.5" data-corridor-ask-answer>
          <p className="font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
            {answer.intentLabel}
          </p>
          <p className="text-sm text-ink">{answer.summary}</p>
          {answer.facts.length > 0 ? (
            <ul className="space-y-1.5" data-corridor-ask-facts>
              {answer.facts.map((f, i) => (
                <li key={`${f.label}:${i}`} className="text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-ink">{f.label}: </span>
                    <span className="tabular-nums text-ink">{f.value}</span>
                    {f.tier ? (
                      <ShiEvidenceChip tier={f.tier} asOf={f.asOf} />
                    ) : null}
                  </div>
                  {f.detail ? (
                    <span className="block text-[11px] text-[var(--muted)]">
                      {f.detail}
                    </span>
                  ) : null}
                  {f.source ? (
                    <span className="block font-mono text-[9px] text-[var(--muted)]">
                      {f.source}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {answer.missing.length > 0 ? (
            <ul className="space-y-1" data-corridor-ask-missing>
              {answer.missing.map((m) => (
                <li
                  key={m}
                  className="text-[11px] leading-snug text-[var(--muted)]"
                >
                  {m}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="font-mono text-[9px] text-[var(--muted)]">
            {answer.ruleVersion}
          </p>
        </div>
      ) : null}
    </div>
  );
}
