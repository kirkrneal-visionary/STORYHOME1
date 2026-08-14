"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Route,
  Eye,
  Presentation,
  Printer,
  BookmarkCheck,
} from "lucide-react";
import {
  ShiCorridorsMap,
  type CorridorMapTool,
} from "@/components/broker/intelligence/ShiCorridorsMap";
import { ShiCorridorsAnalysisPanel } from "@/components/broker/intelligence/ShiCorridorsAnalysisPanel";
import { ShiCorridorsComparePanel } from "@/components/broker/intelligence/ShiCorridorsComparePanel";
import { ShiCorridorsScenarioBoard } from "@/components/broker/intelligence/ShiCorridorsScenarioBoard";
import {
  shiAnalyzeArea,
  shiCorridorsProjects,
  shiCorridorsTraffic,
  shiCreateFolder,
  shiListFolders,
  shiSaveFrame,
} from "@/lib/shi/client";
import {
  openBoundaryInResearch,
  openWatchInResearch,
} from "@/lib/shi/corridor-handoff";
import {
  openMapPackPrint,
  PRESENTATION_HONESTY,
} from "@/lib/shi/corridor-presentation";
import {
  composeCorridorAnalysis,
  CORRIDOR_ANALYSIS_HONESTY,
  type CorridorAnalysisResult,
} from "@/lib/shi/corridor-analysis";
import {
  compareCorridorAnalyses,
  type CorridorCompareResult,
} from "@/lib/shi/corridor-compare";
import { openDevelopmentIntelligenceReport } from "@/lib/shi/corridor-report";
import {
  listCorridorStudies,
  saveCorridorStudy,
  type CorridorSavedStudy,
} from "@/lib/shi/corridor-studies";
import { writeLastArchieModule } from "@/lib/navigation/archieMemory";
import type { DrawnBoundary } from "@/lib/geo";
import { validateBoundaryCaps } from "@/lib/shi/boundary-caps";
import {
  CORRIDOR_COUNTIES,
  defaultCorridorCounty,
  formatAadt,
  resolveCorridorCounty,
  type CorridorCounty,
  type CorridorsTrafficPayload,
  type TrafficStation,
} from "@/lib/shi/corridors";
import {
  type GrowthWatchArea,
} from "@/lib/shi/growth-watch";
import {
  TXDOT_PROJECTS_HONESTY,
  type TxdotProject,
} from "@/lib/shi/txdot-projects";
import {
  TRAFFIC_MEMORY_HONESTY,
  diffTrafficMemory,
  ensureTrafficMemoryBaseline,
  formatTrafficDelta,
  readTrafficMemory,
  rememberTrafficLook,
  whenShort,
  type TrafficMemoryDiff,
} from "@/lib/shi/traffic-memory";
import { cn } from "@/lib/utils";

/**
 * Corridors V.1 — Corridor Intelligence
 * Draw / select → analyze → explain (stations are evidence, not the product).
 */
export function ShiCorridorsView({
  onOpenResearch,
}: {
  onOpenResearch?: () => void;
}) {
  const router = useRouter();
  const [county, setCounty] = useState<CorridorCounty>(() =>
    defaultCorridorCounty(),
  );
  const [payload, setPayload] = useState<CorridorsTrafficPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tool, setTool] = useState<CorridorMapTool>("pan");
  const [showWatch, setShowWatch] = useState(true);
  const [selected, setSelected] = useState<TrafficStation | null>(null);
  const [selectedWatch, setSelectedWatch] = useState<GrowthWatchArea | null>(
    null,
  );
  const [roadFilter, setRoadFilter] = useState("");
  const [panel, setPanel] = useState<"station" | "watch" | "memory">("watch");
  const [projects, setProjects] = useState<TxdotProject[]>([]);
  const [projectsNote, setProjectsNote] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsAvailable, setProjectsAvailable] = useState(true);
  const [showProjects, setShowProjects] = useState(true);
  const [presentationMode, setPresentationMode] = useState(false);
  const [memoryDiff, setMemoryDiff] = useState<TrafficMemoryDiff | null>(null);
  const [memoryAt, setMemoryAt] = useState<string | null>(null);
  const [analysisBoundary, setAnalysisBoundary] =
    useState<DrawnBoundary | null>(null);
  const [analysis, setAnalysis] = useState<CorridorAnalysisResult | null>(null);
  const [analysisB, setAnalysisB] = useState<CorridorAnalysisResult | null>(
    null,
  );
  const [compareMode, setCompareMode] = useState(false);
  const [compare, setCompare] = useState<CorridorCompareResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [drawWarn, setDrawWarn] = useState("");
  const [revealStations, setRevealStations] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [savedStudies, setSavedStudies] = useState<CorridorSavedStudy[]>([]);

  useEffect(() => {
    setSavedStudies(listCorridorStudies(county.fips));
  }, [county.fips, analysis?.analyzedAt, analysisB?.analyzedAt]);

  const applyMemory = useCallback(
    (fips: string, name: string, stations: TrafficStation[]) => {
      const prior = readTrafficMemory(fips);
      if (!prior) {
        const seeded = ensureTrafficMemoryBaseline({
          countyFips: fips,
          countyName: name,
          stations,
        });
        setMemoryAt(seeded.capturedAt);
        setMemoryDiff({
          previousAt: null,
          appeared: [],
          disappeared: [],
          aadtChanged: [],
          unchangedCount: stations.length,
          comparedCount: stations.length,
          note: "Archie saved this look as your baseline. Next time you open this county, you’ll see what changed.",
        });
        return;
      }
      setMemoryAt(prior.capturedAt);
      setMemoryDiff(diffTrafficMemory(prior, stations));
    },
    [],
  );

  const load = useCallback(
    async (fips: string) => {
      setLoading(true);
      setError("");
      setSelected(null);
      setSelectedWatch(null);
      setProjects([]);
      setProjectsNote("");
      try {
        const data = await shiCorridorsTraffic(fips);
        setPayload(data);
        const first = data.watch?.areas?.[0] ?? null;
        setSelectedWatch(first);
        setPanel(first ? "watch" : "station");
        applyMemory(data.county.fips, data.county.name, data.stations);
      } catch (e) {
        setPayload(null);
        setMemoryDiff(null);
        setMemoryAt(null);
        setError(
          e instanceof Error
            ? e.message
            : "Could not load corridor evidence for this county.",
        );
      } finally {
        setLoading(false);
      }
    },
    [applyMemory],
  );

  useEffect(() => {
    void load(county.fips);
  }, [county.fips, load]);

  useEffect(() => {
    let cancelled = false;
    const bbox = selectedWatch?.bbox ?? county.bbox;
    setProjectsLoading(true);
    void shiCorridorsProjects({ countyFips: county.fips, bbox })
      .then((data) => {
        if (cancelled) return;
        setProjectsAvailable(true);
        setProjects(data.projects);
        setProjectsNote(
          data.projectCount
            ? `${data.projectCount} TxDOT project${data.projectCount === 1 ? "" : "s"} in view`
            : "No TxDOT projects returned in this view",
        );
      })
      .catch((e) => {
        if (cancelled) return;
        setProjectsAvailable(false);
        setProjects([]);
        setProjectsNote(
          e instanceof Error
            ? e.message
            : "Could not load TxDOT projects for this area.",
        );
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [county.fips, county.bbox, selectedWatch?.id, selectedWatch?.bbox]);

  const runAnalysis = useCallback(
    async (boundary: DrawnBoundary) => {
      const cap = validateBoundaryCaps(boundary);
      if (!cap.ok) {
        setDrawWarn(cap.error);
        return;
      }
      setDrawWarn("");
      setAnalysisBoundary(boundary);
      setAnalyzing(true);
      setAnalyzeStatus(
        compareMode
          ? "Reading property activity for comparison area B…"
          : "Reading property activity in the area…",
      );
      setTool("pan");
      setRevealStations(false);
      try {
        const area = await shiAnalyzeArea({
          boundary,
          source: county.source,
        });
        setAnalyzeStatus(
          `Found ${area.parcelCount.toLocaleString("en-US")} parcels — organizing traffic signals…`,
        );
        const cadPulse = payload?.watch?.cadPulse;
        const result = composeCorridorAnalysis({
          countyName: county.name,
          countyFips: county.fips,
          boundary,
          area,
          stations: payload?.stations ?? [],
          watchAreas: payload?.watch?.areas ?? [],
          trafficAvailable: Boolean(payload),
          trafficError: payload ? null : error || "Traffic not loaded",
          projectCount: projects.length,
          projectsAvailable,
          cadPulseAvailable: Boolean(cadPulse?.available),
          cadPulseNote: cadPulse?.note ?? null,
        });
        if (compareMode && analysis) {
          setAnalysisB(result);
          setCompare(
            compareCorridorAnalyses(analysis, result, {
              left: "Area A",
              right: "Area B",
            }),
          );
          setCompareMode(false);
          setAnalyzeStatus(result.statusLine);
        } else {
          setAnalysis(result);
          setAnalysisB(null);
          setCompare(null);
          setAnalyzeStatus(result.statusLine);
        }
      } catch (e) {
        if (!compareMode) setAnalysis(null);
        setDrawWarn(
          e instanceof Error
            ? e.message
            : "Could not analyze this area. Try a smaller outline.",
        );
      } finally {
        setAnalyzing(false);
      }
    },
    [
      county,
      payload,
      error,
      compareMode,
      analysis,
      projects.length,
      projectsAvailable,
    ],
  );

  const saveStudy = useCallback(async () => {
    if (!analysis || !analysisBoundary) return;
    setSaving(true);
    setSaveNote("");
    try {
      let folders = await shiListFolders(county.source);
      let folder = folders.find((f) =>
        f.name.toLowerCase().includes("corridor"),
      );
      if (!folder) {
        folder = await shiCreateFolder({
          name: "Corridors",
          countySource: county.source,
        });
      }
      const frame = await shiSaveFrame({
        folderId: folder.id,
        name: `Corridor · ${county.shortName} · ${new Date().toLocaleDateString("en-US")}`,
        color: "#f5b71e",
        boundary: analysisBoundary,
        analysis: analysis.evidence.area,
      });
      const study = saveCorridorStudy({
        name: frame.name,
        analysis,
        vaultFrameId: frame.id,
      });
      setSavedStudies(listCorridorStudies(county.fips));
      setSaveNote(
        `Saved “${study.name}” to Study Vault (Corridors folder) and your corridor studies.`,
      );
    } catch (e) {
      // Still keep private browser study if Vault fails
      try {
        const study = saveCorridorStudy({
          name: `Corridor · ${county.shortName}`,
          analysis,
          vaultFrameId: null,
        });
        setSavedStudies(listCorridorStudies(county.fips));
        setSaveNote(
          e instanceof Error
            ? `Saved locally (“${study.name}”). Vault: ${e.message}`
            : `Saved locally (“${study.name}”).`,
        );
      } catch {
        setSaveNote(
          e instanceof Error ? e.message : "Could not save this study.",
        );
      }
    } finally {
      setSaving(false);
    }
  }, [analysis, analysisBoundary, county]);

  const openReport = useCallback(() => {
    if (!analysis) return;
    openDevelopmentIntelligenceReport({
      studyName: `Development Intelligence · ${county.shortName}`,
      primary: analysis,
      secondary: analysisB,
      compare,
    });
  }, [analysis, analysisB, compare, county.shortName]);

  const studyAnalysisInResearch = useCallback(() => {
    if (!analysisBoundary) return;
    const area = analysis?.evidence.area;
    openBoundaryInResearch({
      boundary: analysisBoundary,
      countySource: county.source,
      countyName: county.name,
      label: `Corridors · ${county.shortName}`,
      areaMetrics: area
        ? {
            metrics: { ...area, parcels: area.parcels.slice(0, 40) },
            thumbnailPath: null,
            analyzedAt: analysis?.analyzedAt ?? new Date().toISOString(),
          }
        : undefined,
    });
    writeLastArchieModule("research");
    router.replace(
      `/portal/intelligence?handoff=corridor&t=${Date.now()}`,
      { scroll: false },
    );
  }, [analysisBoundary, analysis, county, router]);

  const studyWatchLand = useCallback(
    (area: GrowthWatchArea) => {
      openWatchInResearch({
        area,
        countySource: county.source,
        countyName: county.name,
      });
      writeLastArchieModule("research");
      router.replace(
        `/portal/intelligence?handoff=corridor&t=${Date.now()}`,
        { scroll: false },
      );
    },
    [county.source, county.name, router],
  );

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

  const rememberLook = useCallback(() => {
    if (!payload) return;
    const snap = rememberTrafficLook({
      countyFips: payload.county.fips,
      countyName: payload.county.name,
      stations: payload.stations,
    });
    setMemoryAt(snap.capturedAt);
    setMemoryDiff(diffTrafficMemory(snap, payload.stations));
  }, [payload]);

  const printMapPack = useCallback(() => {
    if (!payload) return;
    openMapPackPrint({
      countyName: payload.county.name,
      countyFips: payload.county.fips,
      stationCount: payload.stationCount,
      segmentCount: payload.segmentCount,
      yearsCovered: payload.yearsCovered,
      stations: payload.stations,
      watchAreas: payload.watch?.areas ?? [],
      selectedWatch,
      memory: memoryDiff,
      projectsNote: projectsNote || undefined,
    });
  }, [payload, selectedWatch, memoryDiff, projectsNote]);

  return (
    <div className="space-y-4" data-corridors-version="v2-toolbox">
      {/* Hero — tools live on the map, not here */}
      <div className="story-surface px-4 py-4 md:px-6 md:py-5">
        <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-gold uppercase">
          Corridor intelligence
        </p>
        <h2 className="mt-1 font-serif text-2xl font-bold text-ink md:text-3xl">
          See where movement may become opportunity.
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Explore traffic patterns and property activity together — or use the
          map toolbox to draw your own area and let Archie organize the signals.
        </p>
        <p className="mt-2 max-w-3xl text-xs text-[var(--muted)]">
          {CORRIDOR_ANALYSIS_HONESTY}
        </p>
        <p className="mt-3 font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
          Map toolbox · Freehand · Box · Radius · pan locked while drawing
        </p>
      </div>

      {/* How Archie reads */}
      <div className="story-well px-4 py-3 md:px-5">
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
          How Archie reads a corridor
        </p>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          Traffic alone doesn&apos;t tell the whole story. Archie combines
          available transportation patterns with property and parcel evidence to
          help surface areas showing meaningful change.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <label className="block min-w-[200px]">
          <span className="font-mono text-[10px] font-semibold tracking-wide text-[var(--muted)] uppercase">
            County
          </span>
          <select
            value={county.fips}
            onChange={(e) => {
              setCounty(resolveCorridorCounty(e.target.value));
              setAnalysis(null);
              setAnalysisBoundary(null);
            }}
            className="field-input mt-1 h-10"
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
            onClick={() => setShowWatch((v) => !v)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold",
              showWatch
                ? "bg-gold text-navy"
                : "border border-hairline text-ink",
            )}
          >
            <Eye className="h-4 w-4" />
            Growth patterns
          </button>
          <button
            type="button"
            onClick={() => setShowProjects((v) => !v)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold",
              showProjects
                ? "bg-gold text-navy"
                : "border border-hairline text-ink",
            )}
          >
            <Route className="h-4 w-4" />
            TxDOT projects
          </button>
          <button
            type="button"
            onClick={() => setPresentationMode((v) => !v)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold",
              presentationMode
                ? "bg-gold text-navy"
                : "border border-hairline text-ink",
            )}
          >
            <Presentation className="h-4 w-4" />
            Presentation
          </button>
          <button
            type="button"
            onClick={printMapPack}
            disabled={!payload || loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-semibold text-ink disabled:opacity-40"
          >
            <Printer className="h-4 w-4" />
            Map pack
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
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          <p>{error}</p>
          <p className="mt-1 text-xs opacity-80">
            You can still draw an area — property evidence may load without
            traffic.
          </p>
          <button
            type="button"
            onClick={() => void load(county.fips)}
            className="mt-2 text-xs font-semibold text-gold underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {drawWarn ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {drawWarn}
        </div>
      ) : null}

      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          presentationMode || !exploreOpen
            ? "lg:grid-cols-1"
            : "lg:grid-cols-[1fr_320px]",
        )}
      >
        <ShiCorridorsMap
          county={county}
          stations={payload?.stations ?? []}
          segments={payload?.segments ?? []}
          watchAreas={payload?.watch?.areas ?? []}
          showWatchAreas={showWatch}
          selectedWatchId={selectedWatch?.id ?? null}
          onSelectWatch={(area) => {
            setSelectedWatch(area);
            if (area) {
              setPanel("watch");
              setExploreOpen(true);
            }
          }}
          projects={projects}
          showProjects={showProjects}
          tool={tool}
          onToolChange={(t) => {
            setTool(t);
            setPresentationMode(false);
            setDrawWarn("");
            if (t === "traffic" || t === "pan") setExploreOpen(true);
          }}
          selectedStationId={selected?.id ?? null}
          onSelectStation={(s) => {
            setSelected(s);
            if (s) {
              setPanel("station");
              setExploreOpen(true);
              setRevealStations(true);
            }
          }}
          onBoundaryDrawn={(b) => void runAnalysis(b)}
          analysisBoundary={analysisBoundary}
          revealStations={revealStations || tool === "traffic"}
          loading={loading}
          presentationMode={presentationMode}
          drawWarn={drawWarn}
        />

        {exploreOpen && !presentationMode ? (
          <aside className="flex min-h-0 flex-col gap-3 story-surface p-4">
            <div className="flex gap-1 story-chrome rounded-[var(--radius-md)] border p-0.5">
              {(
                [
                  ["watch", "Patterns"],
                  ["station", "Station"],
                  ["memory", "Memory"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPanel(id)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
                    panel === id
                      ? "bg-gold text-navy"
                      : "text-[var(--muted)] hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {panel === "watch" ? (
              <WatchPanel
                areas={payload?.watch?.areas ?? []}
                selected={selectedWatch}
                onSelect={setSelectedWatch}
                cadNote={payload?.watch?.cadPulse?.note}
                projects={projects}
                projectsLoading={projectsLoading}
                projectsNote={projectsNote}
                onStudyLand={studyWatchLand}
              />
            ) : null}
            {panel === "station" ? (
              <div>
                <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Station dossier
                </p>
                {selected ? (
                  <StationDetail station={selected} />
                ) : (
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Select a corridor to explore traffic growth — or zoom in to
                    reveal count stations.
                  </p>
                )}
              </div>
            ) : null}
            {panel === "memory" ? (
              <MemoryPanel
                diff={memoryDiff}
                memoryAt={memoryAt}
                onRemember={rememberLook}
                disabled={!payload || loading}
              />
            ) : null}

            <div className="border-t border-hairline pt-3">
              <dl className="grid grid-cols-2 gap-2 text-sm">
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
            </div>

            <div className="min-h-0 flex-1 border-t border-hairline pt-3">
              <label className="block">
                <span className="font-mono text-[10px] font-semibold tracking-wide text-[var(--muted)] uppercase">
                  Filter road
                </span>
                <input
                  value={roadFilter}
                  onChange={(e) => setRoadFilter(e.target.value)}
                  placeholder="e.g. US 59"
                  className="field-input mt-1 h-9"
                />
              </label>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-1">
                {filteredStations.slice(0, 60).map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(s);
                        setPanel("station");
                        setRevealStations(true);
                        setTool("traffic");
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                        selected?.id === s.id
                          ? "bg-gold text-navy"
                          : "hover:bg-[var(--background)] text-[var(--muted)]",
                      )}
                    >
                      <span className="min-w-0 truncate font-semibold">
                        {s.onRoad || s.stationId}
                      </span>
                      <span className="shrink-0 font-mono tabular-nums">
                        {formatAadt(s.latestAadt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        ) : null}
      </div>

      {compareMode && !analyzing ? (
        <div className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
          Draw area <strong>B</strong> to compare with the current analysis.
          <button
            type="button"
            onClick={() => setCompareMode(false)}
            className="ml-3 text-xs font-semibold text-gold underline"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {(analyzing || analysis) && !presentationMode ? (
        <ShiCorridorsAnalysisPanel
          result={analysis}
          statusLine={analyzeStatus}
          analyzing={analyzing}
          slotLabel={
            compareMode || analysisB
              ? analyzing && compareMode
                ? "Comparing · Area B"
                : "Area A"
              : undefined
          }
          saving={saving}
          onRevealStations={() => {
            setRevealStations(true);
            setTool("traffic");
            setExploreOpen(true);
          }}
          onStudyInResearch={
            analysisBoundary ? studyAnalysisInResearch : undefined
          }
          onSelectStation={(s) => {
            setSelected(s);
            setPanel("station");
            setExploreOpen(true);
          }}
          onSaveStudy={analysis ? () => void saveStudy() : undefined}
          onHoldForCompare={
            analysis
              ? () => {
                  setCompareMode(true);
                  setTool("freehand");
                  setSaveNote("");
                }
              : undefined
          }
          onReport={analysis ? openReport : undefined}
        />
      ) : null}

      {saveNote ? (
        <p className="text-sm text-[var(--muted)]">{saveNote}</p>
      ) : null}

      {compare && !presentationMode ? (
        <ShiCorridorsComparePanel
          compare={compare}
          onClear={() => {
            setAnalysisB(null);
            setCompare(null);
          }}
        />
      ) : null}

      {savedStudies.length > 0 && !presentationMode ? (
        <section className="story-surface p-4">
          <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
            Saved corridor studies
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Reopen a prior analysis in this browser. Vault-linked studies also
            appear under Study Vault → Corridors.
          </p>
          <ul className="mt-3 space-y-1">
            {savedStudies.slice(0, 8).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setAnalysis(s.analysis);
                    setAnalysisBoundary(s.analysis.boundary);
                    setAnalysisB(null);
                    setCompare(null);
                    setSaveNote(`Reopened “${s.name}”.`);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-[var(--background)]"
                >
                  <span className="truncate font-semibold text-ink">
                    {s.name}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-[var(--muted)]">
                    {s.vaultFrameId ? "Vault · " : ""}
                    {new Date(s.savedAt).toLocaleDateString("en-US")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {presentationMode ? (
        <p className="text-sm text-[var(--muted)]">{PRESENTATION_HONESTY}</p>
      ) : null}

      {!presentationMode ? (
        <ShiCorridorsScenarioBoard
          countyName={county.name}
          countyFips={county.fips}
          stations={payload?.stations ?? []}
          watch={selectedWatch}
          station={selected}
        />
      ) : null}

      {!exploreOpen && !presentationMode ? (
        <button
          type="button"
          onClick={() => setExploreOpen(true)}
          className="text-xs font-semibold text-gold underline"
        >
          Open patterns & station evidence panel
        </button>
      ) : null}
    </div>
  );
}

function WatchPanel({
  areas,
  selected,
  onSelect,
  cadNote,
  projects,
  projectsLoading,
  projectsNote,
  onStudyLand,
}: {
  areas: GrowthWatchArea[];
  selected: GrowthWatchArea | null;
  onSelect: (a: GrowthWatchArea) => void;
  cadNote?: string;
  projects: TxdotProject[];
  projectsLoading: boolean;
  projectsNote: string;
  onStudyLand: (area: GrowthWatchArea) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-[var(--muted)]">
        Find the roads gaining momentum — evidence patterns, not a hot score.
      </p>
      {areas.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No growth patterns yet for this county.
        </p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {areas.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelect(a)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                  selected?.id === a.id
                    ? "bg-gold text-navy"
                    : "hover:bg-[var(--background)] text-[var(--muted)]",
                )}
              >
                <span className="min-w-0 truncate font-semibold">
                  {a.title}
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide">
                  {a.strength}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <div className="space-y-2 border-t border-hairline pt-3">
          <h3 className="font-serif text-xl font-bold text-ink">
            {selected.title}
          </h3>
          <ul className="space-y-2">
            {selected.reasons.map((r) => (
              <li
                key={`${selected.id}-${r.kind}-${r.label}`}
                className="story-well px-3 py-2"
              >
                <p className="font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
                  {r.label}
                </p>
                <p className="mt-0.5 text-xs text-ink">{r.detail}</p>
              </li>
            ))}
          </ul>
          <div className="story-well px-3 py-2">
            <p className="font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
              TxDOT projects nearby
              {projectsLoading ? " · loading" : ""}
            </p>
            {projects.length === 0 ? (
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {projectsNote || TXDOT_PROJECTS_HONESTY}
              </p>
            ) : (
              <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto">
                {projects.slice(0, 8).map((p) => (
                  <li key={p.id} className="text-[11px] text-ink">
                    <span className="font-semibold">
                      {p.highway || "Highway"}
                    </span>
                    {p.phase ? (
                      <span className="text-[var(--muted)]"> · {p.phase}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => onStudyLand(selected)}
            className="inline-flex h-9 items-center rounded-lg bg-gold px-3 text-xs font-bold text-navy"
          >
            Study land in Research
          </button>
        </div>
      ) : null}
      {cadNote ? (
        <p className="text-[10px] leading-snug text-[var(--muted)]">{cadNote}</p>
      ) : null}
    </div>
  );
}

function StationDetail({ station }: { station: TrafficStation }) {
  return (
    <div className="mt-2 space-y-2">
      <h3 className="font-serif text-xl font-bold text-ink">
        {station.onRoad || "Unnamed corridor"}
      </h3>
      <p className="text-sm text-ink">
        Latest published volume{" "}
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
          >
            {h.year > 1900 ? h.year : "—"} · {formatAadt(h.aadt)}
          </span>
        ))}
      </div>
    </div>
  );
}

function MemoryPanel({
  diff,
  memoryAt,
  onRemember,
  disabled,
}: {
  diff: TrafficMemoryDiff | null;
  memoryAt: string | null;
  onRemember: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-[var(--muted)]">
        {TRAFFIC_MEMORY_HONESTY}
      </p>
      <p className="text-sm text-ink">
        {diff?.note ?? "Load a county to start traffic memory."}
      </p>
      {memoryAt ? (
        <p className="font-mono text-[10px] text-[var(--muted)]">
          Remembered · {whenShort(memoryAt)}
        </p>
      ) : null}
      {diff && diff.aadtChanged.length > 0 ? (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {diff.aadtChanged.slice(0, 12).map((c) => (
            <li
              key={`chg-${c.stationId}`}
              className="rounded-md border border-hairline bg-[var(--background)] px-2 py-1.5 text-xs"
            >
              <span className="font-semibold text-ink">
                {c.onRoad || c.stationId}
              </span>
              <span className="mt-0.5 block font-mono tabular-nums text-[var(--muted)]">
                {formatAadt(c.previousAadt)} → {formatAadt(c.currentAadt)} (
                {formatTrafficDelta(c.delta)})
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        onClick={onRemember}
        disabled={disabled}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-gold px-3 text-xs font-bold text-navy disabled:opacity-40"
      >
        <BookmarkCheck className="h-3.5 w-3.5" />
        Remember this look
      </button>
    </div>
  );
}
