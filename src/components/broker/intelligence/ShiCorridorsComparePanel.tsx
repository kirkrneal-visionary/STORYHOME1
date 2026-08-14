"use client";

import type { CorridorCompareResult } from "@/lib/shi/corridor-compare";
import { cn } from "@/lib/utils";

type Props = {
  compare: CorridorCompareResult;
  onClear?: () => void;
};

/**
 * Side-by-side evidence contrast for two drawn areas.
 */
export function ShiCorridorsComparePanel({ compare, onClear }: Props) {
  return (
    <section
      className="rounded-xl border border-gold/35 bg-[var(--surface)] p-4 md:p-5"
      data-corridor-compare
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
            Compare areas
          </p>
          <h3 className="mt-1 font-serif text-xl font-bold text-ink">
            {compare.leftLabel} · {compare.rightLabel}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            {compare.honesty}
          </p>
        </div>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-gold underline"
          >
            Clear B
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-ink">{compare.summary}</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-wide text-[var(--muted)]">
              <th className="py-1.5 pr-2 font-semibold">Measure</th>
              <th className="py-1.5 pr-2 font-semibold">A</th>
              <th className="py-1.5 font-semibold">B</th>
            </tr>
          </thead>
          <tbody>
            {compare.rows.map((r) => (
              <tr key={r.id} className="border-t border-hairline">
                <td className="py-2 pr-2 text-[var(--muted)]">{r.label}</td>
                <td className="py-2 pr-2 font-semibold text-ink">{r.left}</td>
                <td className="py-2 font-semibold text-ink">{r.right}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {compare.signals.map((s) => (
          <div
            key={s.id}
            className="story-well px-3 py-2"
          >
            <p className="text-xs font-semibold text-ink">{s.label}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wide">
              <span className={cn("text-gold")}>A · {s.left}</span>
              <span className="mx-2 text-[var(--muted)]">/</span>
              <span className="text-gold">B · {s.right}</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
