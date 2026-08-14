"use client";

import {
  BIS_CAD_COUNTY_OPTIONS,
  CAD_OVERLAYS,
  type CadOverlayId,
} from "@/lib/cad-layers";
import { cn } from "@/lib/utils";

type Props = {
  activeCounty: string;
  onCountyChange: (source: string) => void;
  enabled: Set<CadOverlayId>;
  onToggle: (id: CadOverlayId) => void;
  loading?: boolean;
  className?: string;
};

export function CadOverlayControl({
  activeCounty,
  onCountyChange,
  enabled,
  onToggle,
  loading = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "w-[220px] story-glass rounded-[var(--radius-md)] p-3 text-paper",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-paper/70">
          CAD layers
        </span>
        {loading ? (
          <em className="text-[10px] text-gold not-italic">Loading…</em>
        ) : null}
      </div>
      <label className="mb-2 block text-[11px] font-semibold text-paper/80">
        County
        <select
          value={activeCounty}
          onChange={(e) => onCountyChange(e.target.value)}
          className="mt-1 w-full rounded-[var(--radius-sm)] border border-paper/20 bg-navy/80 px-2 py-1.5 text-[11px] font-semibold text-paper"
        >
          {BIS_CAD_COUNTY_OPTIONS.map((c) => (
            <option key={c.source} value={c.source}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <ul className="space-y-1">
        {CAD_OVERLAYS.map((layer) => (
          <li key={layer.id}>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-paper hover:text-gold">
              <input
                type="checkbox"
                checked={enabled.has(layer.id)}
                onChange={() => onToggle(layer.id)}
                className="accent-[var(--gold,#f5b71e)]"
              />
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: layer.color }}
                aria-hidden
              />
              {layer.label}
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-snug text-paper/55">
        BIS overlays for this county. Pan to load the viewport. Angelina/Tyler
        use parcel GIS only.
      </p>
    </div>
  );
}
