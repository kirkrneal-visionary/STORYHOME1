"use client";

import type { PropertyCompareResult } from "@/lib/shi/corridor-property-compare";

type Props = {
  compare: PropertyCompareResult;
  onClear?: () => void;
};

/**
 * Multi-property location compare — evidence tradeoffs, not a winner oracle.
 */
export function ShiCorridorsPropertyComparePanel({ compare, onClear }: Props) {
  return (
    <section
      className="story-surface border-gold/35 p-4 md:p-5"
      data-corridor-property-compare
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
            Compare properties
          </p>
          <h3 className="mt-1 font-serif text-xl font-bold text-ink">
            {compare.columns.map((c) => c.label).join(" · ")}
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
            Clear compare
          </button>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-ink" data-property-compare-summary>
        {compare.summary}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-wide text-[var(--muted)]">
              <th className="py-1.5 pr-2 font-semibold">Measure</th>
              {compare.columns.map((c) => (
                <th key={c.propId} className="py-1.5 pr-2 font-semibold">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compare.rows.map((r) => {
              const differs = new Set(r.values).size > 1;
              return (
                <tr
                  key={r.id}
                  className="border-t border-hairline"
                  data-compare-row-differs={differs ? "yes" : "no"}
                >
                  <td className="py-2 pr-2 text-[var(--muted)]">{r.label}</td>
                  {r.values.map((v, i) => (
                    <td
                      key={`${r.id}:${compare.columns[i]?.propId ?? i}`}
                      className={
                        differs
                          ? "py-2 pr-2 font-semibold text-ink"
                          : "py-2 pr-2 text-[var(--muted)]"
                      }
                    >
                      {v}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
