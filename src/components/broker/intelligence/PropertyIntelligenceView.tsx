"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search, Users } from "lucide-react";
import { ShiMarketFramesPanel } from "@/components/broker/intelligence/ShiMarketFramesPanel";
import {
  ShiResearchMap,
  type ShiMapHandle,
  type ShiMapSelect,
} from "@/components/broker/intelligence/ShiResearchMap";
import {
  CAD_SEARCH_FIELDS,
  cadSearchPlaceholder,
  type CadSearchField,
} from "@/lib/cad-layers";
import type { DrawnBoundary } from "@/lib/geo";
import { makeShiAcronym } from "@/lib/shi/acronym";
import { SHI_CAPS } from "@/lib/shi/caps";
import { nextFrameColor } from "@/lib/shi/frame-colors";
import { AVAILABLE_COUNTIES } from "@/lib/supabase/parcels";
import {
  consumeOpenSavedFrame,
  shiAnalyzeArea,
  shiCreateFolder,
  shiFreshness,
  shiGetProperty,
  shiListFolders,
  shiOwnerMatches,
  shiSaveFrame,
  shiSearch,
} from "@/lib/shi/client";
import type {
  ShiAreaAnalysis,
  ShiCountyFreshness,
  ShiLocalFrame,
  ShiOwnerMatch,
  ShiPropertyDetail,
  ShiPropertySummary,
  ShiSavedFrame,
  ShiStudyFolder,
} from "@/lib/shi/types";
import { cn } from "@/lib/utils";

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function acres(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ac`;
}

type ResearchProps = {
  onOpenVault?: () => void;
};

/**
 * SHI Research — classic 3-split (Search | Map | Property) with Market Frames below.
 * Study Vault lives on its own submenu (not crammed here).
 */
export function PropertyIntelligenceView({ onOpenVault }: ResearchProps = {}) {
  const [query, setQuery] = useState("");
  const [field, setField] = useState<CadSearchField>("all");
  const [source, setSource] = useState("");
  const [results, setResults] = useState<ShiPropertySummary[]>([]);
  const [indexNote, setIndexNote] = useState<string | null>(null);
  const [selected, setSelected] = useState<ShiPropertyDetail | null>(null);
  const [matches, setMatches] = useState<ShiOwnerMatch[]>([]);
  const [matchNote, setMatchNote] = useState("");
  const [exactCount, setExactCount] = useState(0);
  const [possibleCount, setPossibleCount] = useState(0);
  const [frames, setFrames] = useState<ShiLocalFrame[]>([]);
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ShiAreaAnalysis | null>(null);
  const [areaError, setAreaError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [folders, setFolders] = useState<ShiStudyFolder[]>([]);
  const [saving, setSaving] = useState(false);
  const [freshness, setFreshness] = useState<ShiCountyFreshness[]>([]);
  const [error, setError] = useState("");
  const [searching, startSearch] = useTransition();
  const [loadingProperty, setLoadingProperty] = useState(false);
  const mapRef = useRef<ShiMapHandle | null>(null);
  const countyLockRef = useRef<{ selectedSource?: string; filterSource: string }>(
    { filterSource: "" },
  );
  const frameSeq = useRef(1);

  const countyName =
    AVAILABLE_COUNTIES.find((c) => c.source === source)?.name ?? "";

  useEffect(() => {
    countyLockRef.current = {
      selectedSource: selected?.source,
      filterSource: source,
    };
  }, [selected?.source, source]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await shiFreshness();
        if (!cancelled) setFreshness(rows);
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMatches = useCallback(async (property: ShiPropertyDetail) => {
    try {
      const res = await shiOwnerMatches({
        source: property.source,
        propId: property.propId,
        cadOwnerId: property.cadOwnerId,
        ownerName: property.ownerName,
      });
      setMatches(res.matches);
      setMatchNote(res.note);
      setExactCount(res.exactCount);
      setPossibleCount(res.possibleCount);
    } catch {
      setMatches([]);
      setMatchNote("Could not load owner relationships.");
      setExactCount(0);
      setPossibleCount(0);
    }
  }, []);

  const refreshFolders = useCallback(async (countySource: string) => {
    if (!countySource) {
      setFolders([]);
      return;
    }
    try {
      setFolders(await shiListFolders(countySource));
    } catch {
      setFolders([]);
    }
  }, []);

  const openProperty = useCallback(
    async (opts: {
      propId: string;
      source?: string;
      countyFips?: string;
      preferredSource?: string;
      nearLat?: number;
      nearLng?: number;
    }) => {
      setLoadingProperty(true);
      setError("");
      const lock = countyLockRef.current;
      try {
        const property = await shiGetProperty({
          ...opts,
          // Stay in the county the agent is researching when prop_ids collide.
          preferredSource:
            opts.preferredSource ||
            opts.source ||
            lock.selectedSource ||
            lock.filterSource ||
            undefined,
        });
        if (!property) {
          setError("Property not found");
          setSelected(null);
          setMatches([]);
          return;
        }
        setSelected(property);
        // Keep search / frames county aligned with the opened parcel.
        if (property.source && property.source !== countyLockRef.current.filterSource) {
          setSource(property.source);
          void refreshFolders(property.source);
        }
        void loadMatches(property);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load property");
      } finally {
        setLoadingProperty(false);
      }
    },
    [loadMatches, refreshFolders],
  );

  const openFromMap = useCallback(
    (sel: ShiMapSelect) => {
      const lock = countyLockRef.current;
      void openProperty({
        propId: sel.propId,
        source: sel.source,
        countyFips: sel.countyFips,
        preferredSource:
          sel.preferredSource || lock.selectedSource || lock.filterSource,
        nearLat: sel.lat,
        nearLng: sel.lng,
      });
    },
    [openProperty],
  );

  function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError("Enter at least 2 characters");
      return;
    }
    setError("");
    startSearch(async () => {
      try {
        const { results: rows, indexNote: note } = await shiSearch({
          q,
          field,
          source: source || undefined,
          limit: 30,
        });
        setResults(rows);
        setIndexNote(note);
        if (rows.length === 1) {
          void openProperty({
            propId: rows[0].propId,
            source: rows[0].source,
            countyFips: rows[0].countyFips ?? undefined,
          });
        }
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : "Search failed");
      }
    });
  }

  function onCountyChange(next: string) {
    setSource(next);
    void refreshFolders(next);
  }

  function createFrame(boundary: DrawnBoundary) {
    if (frames.length >= SHI_CAPS.maxFramesOnMap) {
      setAreaError(
        `Map frame limit (${SHI_CAPS.maxFramesOnMap}). Remove a frame first.`,
      );
      return;
    }
    if (!source) {
      setAreaError("Pick a county before drawing market frames");
      return;
    }
    const n = frameSeq.current++;
    const name = `Frame ${n}`;
    const localId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `frame-${n}-${Date.now()}`;
    const frame: ShiLocalFrame = {
      localId,
      name,
      acronym: makeShiAcronym(name),
      color: nextFrameColor(frames.length),
      boundary,
      analysis: null,
    };
    setFrames((prev) => [...prev, frame]);
    setActiveFrameId(localId);
    setAnalysis(null);
    setAreaError("");
  }

  async function runAreaAnalyze() {
    const active = frames.find((f) => f.localId === activeFrameId);
    if (!active) {
      setAreaError("Select or draw a market frame first");
      return;
    }
    if (!source) {
      setAreaError("Pick a county before analyzing");
      return;
    }
    setAnalyzing(true);
    setAreaError("");
    try {
      const result = await shiAnalyzeArea({
        boundary: active.boundary,
        source,
      });
      setAnalysis(result);
      setFrames((prev) =>
        prev.map((f) =>
          f.localId === active.localId ? { ...f, analysis: result } : f,
        ),
      );
    } catch (e) {
      setAnalysis(null);
      setAreaError(e instanceof Error ? e.message : "Area analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function createFolder(name: string): Promise<ShiStudyFolder> {
    if (!source) throw new Error("Pick a county first");
    const folder = await shiCreateFolder({ name, countySource: source });
    await refreshFolders(source);
    return folder;
  }

  async function saveActiveFrame(name: string, folderId: string) {
    const active = frames.find((f) => f.localId === activeFrameId);
    if (!active?.analysis) throw new Error("Analyze the frame before saving");
    setSaving(true);
    setAreaError("");
    try {
      const view = mapRef.current?.getView();
      const thumb = mapRef.current?.captureThumbnail() ?? null;
      const saved = await shiSaveFrame({
        folderId,
        name,
        color: active.color,
        boundary: active.boundary,
        analysis: active.analysis,
        mapCenterLat: view?.centerLat,
        mapCenterLng: view?.centerLng,
        mapZoom: view?.zoom,
        thumbnailDataUrl: thumb,
        frameId: active.savedId,
      });
      setFrames((prev) =>
        prev.map((f) =>
          f.localId === active.localId
            ? {
                ...f,
                savedId: saved.id,
                folderId: saved.folderId,
                name: saved.name,
                acronym: saved.acronym,
              }
            : f,
        ),
      );
      await refreshFolders(source);
    } catch (e) {
      setAreaError(e instanceof Error ? e.message : "Save failed");
      throw e;
    } finally {
      setSaving(false);
    }
  }

  function loadSavedFrame(frame: ShiSavedFrame) {
    const localId = frame.id;
    const existing = frames.find(
      (f) => f.savedId === frame.id || f.localId === frame.id,
    );
    if (existing) {
      setActiveFrameId(existing.localId);
    } else {
      if (frames.length >= SHI_CAPS.maxFramesOnMap) {
        setAreaError(`Map frame limit (${SHI_CAPS.maxFramesOnMap}).`);
        return;
      }
      const local: ShiLocalFrame = {
        localId,
        savedId: frame.id,
        folderId: frame.folderId,
        name: frame.name,
        acronym: frame.acronym,
        color: frame.color,
        boundary: frame.boundary,
        analysis: frame.snapshot
          ? ({
              ...frame.snapshot.metrics,
              parcels: frame.snapshot.metrics.parcels ?? [],
            } as ShiAreaAnalysis)
          : null,
      };
      setFrames((prev) => [...prev, local]);
      setActiveFrameId(localId);
    }
    if (frame.snapshot?.metrics) {
      setAnalysis({
        ...(frame.snapshot.metrics as ShiAreaAnalysis),
        parcels: frame.snapshot.metrics.parcels ?? [],
      });
    }
    mapRef.current?.fitBoundary(frame.boundary);
  }

  // Study Vault → Research hand-off (after loadSavedFrame is defined).
  useEffect(() => {
    const queued = consumeOpenSavedFrame();
    if (!queued?.boundary) return;
    const fromMetrics = queued.snapshot?.metrics?.countySource;
    if (fromMetrics) {
      setSource(fromMetrics);
      void refreshFolders(fromMetrics);
    }
    const t = window.setTimeout(() => loadSavedFrame(queued), 120);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedFresh =
    selected &&
    freshness.find(
      (c) =>
        c.countyFips === selected.countyFips ||
        c.countyName === selected.countyName,
    );

  return (
    <div className="space-y-3">
      {freshness.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {freshness.map((c) => (
            <span
              key={c.countyFips}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-bold uppercase",
                c.stale
                  ? "border-gold/40 bg-gold/10 text-navy"
                  : "border-hairline bg-[var(--surface)] text-[var(--muted)]",
              )}
              title={c.label}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  c.stale ? "bg-gold" : "bg-emerald-600",
                )}
              />
              {c.countyName.replace(/ County$/i, "")}
              <span className="font-semibold normal-case opacity-70">
                {c.stale ? "stale" : "fresh"}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {/* Classic 3-split: Search | Map | Property */}
      <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)_340px] xl:items-start">
        <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Search className="h-4 w-4 text-gold" />
            Search
          </h3>
          <form onSubmit={runSearch} className="mt-3 space-y-2">
            <label className="block text-[11px] font-semibold text-[var(--muted)]">
              County
              <select
                value={source}
                onChange={(e) => onCountyChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hairline bg-[var(--background)] px-2.5 py-2 text-sm text-ink"
              >
                <option value="">Select county (required for frames)</option>
                {AVAILABLE_COUNTIES.map((c) => (
                  <option key={c.source} value={c.source}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-semibold text-[var(--muted)]">
              Field
              <select
                value={field}
                onChange={(e) => setField(e.target.value as CadSearchField)}
                className="mt-1 w-full rounded-lg border border-hairline bg-[var(--background)] px-2.5 py-2 text-sm text-ink"
              >
                {CAD_SEARCH_FIELDS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-semibold text-[var(--muted)]">
              Query
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={cadSearchPlaceholder(field)}
                className="mt-1 w-full rounded-lg border border-hairline bg-[var(--background)] px-2.5 py-2 text-sm text-ink outline-none focus:border-gold"
              />
            </label>
            <button
              type="submit"
              disabled={searching}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-navy text-sm font-bold text-gold disabled:opacity-60"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search properties
            </button>
          </form>

          {error ? (
            <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>
          ) : null}
          {indexNote ? (
            <p className="mt-2 text-[11px] text-[var(--muted)]">{indexNote}</p>
          ) : null}

          <ul className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
            {results.length === 0 && !searching ? (
              <li className="py-4 text-center text-xs text-[var(--muted)]">
                Results appear here. Or click a parcel on the map.
              </li>
            ) : null}
            {results.map((r) => {
              const active =
                selected?.propId === r.propId && selected?.source === r.source;
              return (
                <li key={`${r.source}:${r.propId}`}>
                  <button
                    type="button"
                    onClick={() =>
                      void openProperty({
                        propId: r.propId,
                        source: r.source,
                        countyFips: r.countyFips ?? undefined,
                      })
                    }
                    className={cn(
                      "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-gold bg-gold/10"
                        : "border-hairline hover:border-gold/50 hover:bg-[var(--background)]",
                    )}
                  >
                    <p className="truncate text-sm font-bold text-ink">
                      {r.situsAddress ||
                        r.legalDescription ||
                        `Parcel ${r.propId}`}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {r.ownerName || "Owner unknown"}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                      {r.countyName} · ID {r.propId}
                      {r.legalAcreage != null
                        ? ` · ${acres(r.legalAcreage)}`
                        : ""}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <ShiResearchMap
          ref={mapRef}
          selected={selected}
          related={matches}
          frames={frames}
          activeFrameId={activeFrameId}
          onFramesChange={setFrames}
          onActiveFrameIdChange={setActiveFrameId}
          onCreateFrame={createFrame}
          onSelectParcel={openFromMap}
          className="h-[480px] min-h-[400px] xl:h-[600px]"
        />

        <section className="max-h-[600px] overflow-y-auto rounded-2xl border border-hairline bg-[var(--surface)] p-4 xl:max-h-[600px]">
          <h3 className="text-sm font-bold text-ink">Property record</h3>
          {loadingProperty ? (
            <div className="mt-8 flex justify-center text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !selected ? (
            <p className="mt-6 text-sm text-[var(--muted)]">
              Select a search result or click a parcel on the map.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
                  {selected.countyName}
                  {selected.propertyCategory
                    ? ` · ${selected.propertyCategory}`
                    : ""}
                </p>
                <h4 className="mt-1 font-serif text-xl font-bold text-ink">
                  {selected.situsAddress ||
                    selected.legalDescription ||
                    `Property ${selected.propId}`}
                </h4>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {selected.ownerName || "Owner not listed"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip
                    stale={selected.freshness.stale}
                    label={selected.freshness.label}
                  />
                  {selectedFresh ? (
                    <Chip
                      stale={selectedFresh.stale}
                      label={`County ${selectedFresh.stale ? "stale" : "fresh"}`}
                    />
                  ) : null}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <Fact label="Property ID" value={selected.propId} mono />
                <Fact label="Geo ID" value={selected.geoId ?? "—"} mono />
                <Fact label="Owner ID" value={selected.cadOwnerId ?? "—"} mono />
                <Fact label="Acres" value={acres(selected.legalAcreage)} />
                <Fact label="Market value" value={money(selected.marketValue)} />
                <Fact label="Land" value={money(selected.landValue)} />
                <Fact
                  label="Improvements"
                  value={money(selected.improvementValue)}
                />
                <Fact
                  label="Tax year"
                  value={
                    selected.taxYear != null ? String(selected.taxYear) : "—"
                  }
                />
                <Fact
                  label="School"
                  value={selected.schoolName ?? selected.schoolCode ?? "—"}
                />
                <Fact
                  label="City / ZIP"
                  value={
                    [selected.situsCity, selected.situsZip]
                      .filter(Boolean)
                      .join(" ") || "—"
                  }
                />
              </dl>

              <div>
                <h4 className="flex items-center gap-2 text-xs font-bold text-ink">
                  <Users className="h-3.5 w-3.5 text-gold" />
                  Owner relationships
                </h4>
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  {exactCount} EXACT · {possibleCount} POSSIBLE
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
                  {matchNote}
                </p>
                {matches.length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    No related tracts in this county.
                  </p>
                ) : (
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                    {matches.map((m) => (
                      <li key={`${m.source}:${m.propId}`}>
                        <button
                          type="button"
                          onClick={() =>
                            void openProperty({
                              propId: m.propId,
                              source: m.source,
                              countyFips: m.countyFips ?? undefined,
                            })
                          }
                          className="w-full rounded-lg border border-hairline px-2.5 py-2 text-left hover:border-gold/50"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                                m.matchTier === "EXACT"
                                  ? "bg-gold/25 text-navy"
                                  : "bg-[var(--background)] text-[var(--muted)]",
                              )}
                            >
                              {m.matchTier}
                            </span>
                            <span className="truncate font-mono text-[10px] text-[var(--muted)]">
                              {m.propId}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs font-semibold text-ink">
                            {m.situsAddress ||
                              m.legalDescription ||
                              `Parcel ${m.propId}`}
                          </p>
                          <p className="truncate text-[10px] text-[var(--muted)]">
                            {m.matchReason}
                            {m.legalAcreage != null
                              ? ` · ${acres(m.legalAcreage)}`
                              : ""}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selected.legalDescription ? (
                <div>
                  <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                    Legal
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink">
                    {selected.legalDescription}
                  </p>
                </div>
              ) : null}

              {selected.mhSerialNumber ? (
                <div>
                  <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                    Manufactured home
                  </p>
                  <p className="mt-1 text-xs text-ink">
                    Serial {selected.mhSerialNumber}
                    {selected.mhHudLabel ? ` · HUD ${selected.mhHudLabel}` : ""}
                  </p>
                </div>
              ) : null}

              <div>
                <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                  Observed CAD history
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
                  Only values and county pull observations — not deed or
                  ownership transfer history.
                </p>
                {(selected.observedHistory ?? []).length === 0 ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    No observed history rows on file for this parcel.
                  </p>
                ) : (
                  <ol className="mt-2 space-y-2 border-l border-hairline pl-3">
                    {(selected.observedHistory ?? []).map((ev, i) => (
                      <li key={`${ev.kind}-${ev.at}-${i}`}>
                        <p className="text-xs font-semibold text-ink">{ev.title}</p>
                        <p className="text-[10px] text-[var(--muted)]">
                          {ev.detail}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <p className="text-[10px] leading-relaxed text-[var(--muted)]">
                Public appraisal record for research. Prospects + CRM convert ship
                in SHI-3.
              </p>
            </div>
          )}
        </section>
      </div>

      <ShiMarketFramesPanel
        countySource={source}
        countyName={countyName}
        frames={frames}
        activeFrameId={activeFrameId}
        onSelectFrame={(id) => {
          setActiveFrameId(id);
          const f = frames.find((x) => x.localId === id);
          setAnalysis(f?.analysis ?? null);
        }}
        analysis={analysis}
        analyzing={analyzing}
        analyzeError={areaError}
        onAnalyze={() => void runAreaAnalyze()}
        folders={folders}
        onCreateFolder={createFolder}
        onSaveActive={saveActiveFrame}
        saving={saving}
        onOpenVault={() => onOpenVault?.()}
      />
    </div>
  );
}


function Chip({ label, stale }: { label: string; stale: boolean }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
        stale ? "bg-gold/20 text-navy" : "bg-emerald-600/15 text-emerald-800",
      )}
    >
      {label}
    </span>
  );
}

function Fact({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[var(--background)] px-2.5 py-2">
      <dt className="font-mono text-[9px] font-bold tracking-wider text-[var(--muted)] uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-xs font-semibold text-ink",
          mono && "font-mono",
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
