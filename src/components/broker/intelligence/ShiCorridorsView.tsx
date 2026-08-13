"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, PenLine, Route } from "lucide-react";
import { ShiCorridorsMap } from "@/components/broker/intelligence/ShiCorridorsMap";
import { shiCorridorsTraffic } from "@/lib/shi/client";
import {
  CORRIDOR_COUNTIES,
  CORRIDORS_HONESTY,
  defaultCorridorCounty,
  formatAadt,
  resolveCorridorCounty,
  type CorridorCounty,
  type CorridorsTrafficPayload,
  type TrafficStation,
} from "@/lib/shi/corridors";
import { cn } from "@/lib/utils";

/**
 * Archie Corridors — Wave 1 traffic desk.
 * Custom Traffic tool + TxDOT AADT (≥5 years) for launch counties.
 */
export function ShiCorridorsView({
  onOpenResearch,
}: {
  onOpenResearch?: () => void;
}) {
  const [county, setCounty] = useState<CorridorCounty>(() =>
    defaultCorridorCounty(),
  );
  const [payload, setPayload] = useState<CorridorsTrafficPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trafficToolActive, setTrafficToolActive] = useState(true);
  const [selected, setSelected] = useState<TrafficStation | null>(null);
  const [roadFilter, setRoadFilter] = useState("");

  const load = useCallback(async (fips: string) => {
    setLoading(true);
    setError("");
    setSelected(null);
    try {
      const data = await shiCorridorsTraffic(fips);
      setPayload(data);
    } catch (e) {
      setPayload(null);
      setError(
        e instanceof Error
          ? e.message
          : "Could not load corridor traffic for this county.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(county.fips);
  }, [county.fips, load]);

  const filteredStations = useMemo(() => {
    const list = payload?.stations ?? [];
    const q = roadFilter.trim().toUpperCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        (s.onRoad ?? "").toUpperCase().includes(q) ||
        s.stationId.toUpperCase().includes(q),
    );
  }, [payload?.stations, roadFilter]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-hairline bg-[var(--surface)] px-4 py-3 md:px-5">
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
          Access · traffic · growth
        </p>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          {CORRIDORS_HONESTY} Growth watch areas and investor scenarios ship in
          later Corridors waves — this desk is evidence first.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <label className="block min-w-[200px]">
          <span className="font-mono text-[10px] font-semibold tracking-wide text-[var(--muted)] uppercase">
            County
          </span>
          <select
            value={county.fips}
            onChange={(e) => setCounty(resolveCorridorCounty(e.target.value))}
            className="mt-1 flex h-10 w-full rounded-lg border border-hairline bg-[var(--background)] px-3 text-sm text-ink"
          >
            {CORRIDOR_COUNTIES.map((c) => (
              <option key={c.fips} value={c.fips}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTrafficToolActive((v) => !v)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold",
              trafficToolActive
                ? "bg-gold text-navy"
                : "border border-hairline text-ink",
            )}
            title="Custom traffic tool — tap stations on the map"
          >
            <PenLine className="h-4 w-4" />
            Traffic tool
          </button>
          <button
            type="button"
            onClick={() => void load(county.fips)}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Route className="h-4 w-4" />
            )}
            Refresh TxDOT
          </button>
          {onOpenResearch ? (
            <button
              type="button"
              onClick={onOpenResearch}
              className="inline-flex h-10 items-center rounded-lg border border-hairline px-4 text-sm font-semibold text-ink"
            >
              Open Research
            </button>
          ) : (
            <Link
              href="/portal/intelligence"
              className="inline-flex h-10 items-center rounded-lg border border-hairline px-4 text-sm font-semibold text-ink"
            >
              Open Research
            </Link>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void load(county.fips)}
            className="mt-2 text-xs font-semibold text-gold underline"
          >
            Retry TxDOT load
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <ShiCorridorsMap
          county={county}
          stations={payload?.stations ?? []}
          segments={payload?.segments ?? []}
          trafficToolActive={trafficToolActive}
          selectedStationId={selected?.id ?? null}
          onSelectStation={setSelected}
          loading={loading}
        />

        <aside className="flex min-h-0 flex-col gap-3 rounded-xl border border-hairline bg-[var(--surface)] p-4">
          <div>
            <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
              Station dossier
            </p>
            {selected ? (
              <StationDetail station={selected} />
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">
                {trafficToolActive
                  ? "Activate Traffic tool and tap a station on the map."
                  : "Turn on Traffic tool, then tap a count station."}
              </p>
            )}
          </div>

          <div className="border-t border-hairline pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                County summary
              </p>
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--muted)]" />
              ) : null}
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-[11px] text-[var(--muted)]">Stations</dt>
                <dd className="font-serif text-xl font-bold text-ink">
                  {payload?.stationCount ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--muted)]">Corridors</dt>
                <dd className="font-serif text-xl font-bold text-ink">
                  {payload?.segmentCount ?? "—"}
                </dd>
              </div>
            </dl>
            {payload?.yearsCovered?.length ? (
              <p className="mt-2 text-[11px] text-[var(--muted)]">
                Years in feed: {payload.yearsCovered.slice(0, 8).join(" · ")}
                {payload.yearsCovered.length > 8 ? "…" : ""}
              </p>
            ) : null}
            <p className="mt-2 text-[10px] leading-snug text-[var(--muted)]">
              {payload?.sourceLabel ??
                "TxDOT Open Data — free public planning counts"}
            </p>
          </div>

          <div className="min-h-0 flex-1 border-t border-hairline pt-3">
            <label className="block">
              <span className="font-mono text-[10px] font-semibold tracking-wide text-[var(--muted)] uppercase">
                Filter road / station
              </span>
              <input
                value={roadFilter}
                onChange={(e) => setRoadFilter(e.target.value)}
                placeholder="e.g. US0059"
                className="mt-1 h-9 w-full rounded-lg border border-hairline bg-[var(--background)] px-3 text-sm text-ink"
              />
            </label>
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
              {filteredStations.slice(0, 80).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(s)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                      selected?.id === s.id
                        ? "bg-gold/20 text-ink"
                        : "hover:bg-[var(--background)] text-[var(--muted)]",
                    )}
                  >
                    <span className="min-w-0 truncate font-semibold text-ink">
                      {s.onRoad || s.stationId}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums">
                      {formatAadt(s.latestAadt)}
                    </span>
                  </button>
                </li>
              ))}
              {!loading && filteredStations.length === 0 ? (
                <li className="px-2 py-3 text-xs text-[var(--muted)]">
                  No stations match this filter.
                </li>
              ) : null}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StationDetail({ station }: { station: TrafficStation }) {
  return (
    <div className="mt-2 space-y-2">
      <h3 className="font-serif text-xl font-bold text-ink">
        {station.onRoad || "Unnamed corridor"}
      </h3>
      <p className="font-mono text-[11px] text-[var(--muted)]">
        Station {station.stationId}
        {station.category ? ` · ${station.category}` : ""}
      </p>
      <p className="text-sm text-ink">
        Latest AADT{" "}
        <span className="font-serif text-2xl font-bold">
          {formatAadt(station.latestAadt)}
        </span>
        {station.latestYear != null ? (
          <span className="text-[var(--muted)]"> ({station.latestYear})</span>
        ) : null}
      </p>
      {station.trendLabel ? (
        <p className="font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
          Trend · {station.trendLabel}
        </p>
      ) : null}
      <div>
        <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
          History (newest → older)
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {station.history.map((h) => (
            <span
              key={`${station.id}-${h.year}`}
              className={cn(
                "rounded-md border px-2 py-1 font-mono text-[11px]",
                h.aadt != null
                  ? "border-hairline bg-[var(--background)] text-ink"
                  : "border-dashed border-hairline text-[var(--muted)]",
              )}
              title={h.aadt == null ? "No published count this year" : undefined}
            >
              {h.year > 1900 ? h.year : "—"} · {formatAadt(h.aadt)}
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-[var(--muted)]">
          Dashed chips = no published count that year (gap, not zero).
        </p>
      </div>
    </div>
  );
}
