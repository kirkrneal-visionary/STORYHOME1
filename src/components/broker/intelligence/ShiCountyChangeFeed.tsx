"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Radio } from "lucide-react";
import { shiCountyChanges } from "@/lib/shi/client";
import type { CountyChangeEvent } from "@/lib/shi/county-changes";
import { AVAILABLE_COUNTIES } from "@/lib/supabase/parcels";
import { cn } from "@/lib/utils";

function when(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

type Props = {
  /** Prefill county CAD source (e.g. from Research filter or farm). */
  source?: string;
  className?: string;
  onOpenProperty?: (opts: {
    propId: string;
    source: string;
  }) => void;
};

/**
 * County observation change feed — Archie-detected CAD diffs between pulls.
 */
export function ShiCountyChangeFeed({
  source: sourceProp = "",
  className,
  onOpenProperty,
}: Props) {
  const [source, setSource] = useState(sourceProp);
  const [field, setField] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [changes, setChanges] = useState<CountyChangeEvent[]>([]);

  useEffect(() => {
    if (sourceProp) setSource(sourceProp);
  }, [sourceProp]);

  const load = useCallback(async () => {
    if (!source) {
      setChanges([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const body = await shiCountyChanges({
        source,
        limit: 40,
        field: field || undefined,
      });
      setChanges(body.changes);
      setNote(body.note);
    } catch (e) {
      setChanges([]);
      setError(e instanceof Error ? e.message : "Could not load change feed");
    } finally {
      setLoading(false);
    }
  }, [source, field]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <section
      className={cn(
        "rounded-2xl border border-hairline bg-[var(--surface)]",
        className,
      )}
    >
      <div className="border-b border-hairline px-4 py-3">
        <p className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
          <Radio className="h-3.5 w-3.5" />
          County observation feed
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
          What Archie saw change between CAD pulls — owner, address, value,
          acreage, or presence. Not deed history. Not a sale prediction.
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="field-input h-9 text-xs sm:w-52"
            aria-label="County for change feed"
          >
            <option value="">Pick county</option>
            {AVAILABLE_COUNTIES.map((c) => (
              <option key={c.source} value={c.source}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="field-input h-9 text-xs sm:w-44"
            aria-label="Filter change field"
          >
            <option value="">All fields</option>
            <option value="owner_name">Owner name</option>
            <option value="cad_owner_id">Owner id</option>
            <option value="situs_address">Site address</option>
            <option value="market_value">Market value</option>
            <option value="legal_acreage">Acreage</option>
            <option value="presence">Presence</option>
          </select>
        </div>
      </div>

      <div className="px-4 py-3">
        {error ? (
          <p className="text-xs font-semibold text-red-300">{error}</p>
        ) : null}
        {!source ? (
          <p className="text-xs text-[var(--muted)]">
            Select a county to load observation events.
          </p>
        ) : loading ? (
          <div className="flex justify-center py-8 text-[var(--muted)]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : changes.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            No observation events yet for this county. They appear after CAD
            refreshes compare successive pulls (apply migrations 0027/0028).
          </p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {changes.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-hairline px-2.5 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-ink">{c.summary}</p>
                  <span className="shrink-0 font-mono text-[9px] text-[var(--muted)]">
                    {c.fieldLabel}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                  {when(c.observedAt)} · ID {c.propId}
                </p>
                {onOpenProperty ? (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenProperty({ propId: c.propId, source: c.source })
                    }
                    className="mt-1 text-[10px] font-bold text-gold"
                  >
                    Research property →
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {note ? (
          <p className="mt-2 text-[9px] leading-relaxed text-[var(--muted)]">
            {note}
          </p>
        ) : null}
      </div>
    </section>
  );
}
