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
import { ShiCorridorsPropertyComparePanel } from "@/components/broker/intelligence/ShiCorridorsPropertyComparePanel";
import { ShiCorridorsScenarioBoard } from "@/components/broker/intelligence/ShiCorridorsScenarioBoard";
import {
  shiAddProspect,
  shiAnalyzeArea,
  shiCorridorsParcelLocation,
  shiCorridorsProjects,
  shiCorridorsStrongestSites,
  shiCorridorsTraffic,
  shiCreateFarm,
  shiCreateFolder,
  shiFloodAtPoint,
  shiUtilitiesAtPoint,
  shiEnvironmentAtPoint,
  shiDeedsForParcel,
  shiListFolders,
  shiSaveFrame,
} from "@/lib/shi/client";
import { ShiFloodEvidencePanel } from "@/components/broker/intelligence/ShiFloodEvidencePanel";
import { ShiUtilitiesEvidencePanel } from "@/components/broker/intelligence/ShiUtilitiesEvidencePanel";
import { ShiEnvironmentEvidencePanel } from "@/components/broker/intelligence/ShiEnvironmentEvidencePanel";
import { ShiDeedsEvidencePanel } from "@/components/broker/intelligence/ShiDeedsEvidencePanel";
import { ShiEvidenceChip } from "@/components/broker/intelligence/ShiEvidenceChip";
import type { FloodFact } from "@/lib/shi/flood-fema";
import type { UtilitiesFact } from "@/lib/shi/utilities-ccn";
import type { EnvironmentDesk } from "@/lib/shi/environment-desk";
import type { DeedsFact } from "@/lib/shi/deeds-clerk";
import { EVIDENCE_LEGEND_LINES } from "@/lib/shi/evidence-tier";
import {
  openBoundaryInResearch,
  openParcelInResearch,
  openWatchInResearch,
} from "@/lib/shi/corridor-handoff";
import {
  openMapPackPrint,
  PRESENTATION_HONESTY,
} from "@/lib/shi/corridor-presentation";
import {
  comparePropertySites,
  PROPERTY_COMPARE_MAX,
  toggleCompareSite,
} from "@/lib/shi/corridor-property-compare";
import {
  answerCorridorAsk,
  CORRIDOR_ASK_HONESTY,
  CORRIDOR_ASK_INTENTS,
  type CorridorAskAnswer,
} from "@/lib/shi/corridor-ask";
import { openPropertyLocationReport } from "@/lib/shi/corridor-property-report";
import { boundsAroundPoints } from "@/lib/shi/discover-bounds";
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
  type TrafficCorridorSegment,
  type TrafficStation,
} from "@/lib/shi/corridors";
import {
  AADT_EXPLAINER_V1,
  CORRIDOR_STATUS_LABEL,
  CORRIDORS_2_HERO,
  CORRIDORS_2_PURPOSE,
  CORRIDORS_2_SUPPORT,
  TRAFFIC_INTENSITY_LABEL,
  corridorStatusFromHistory,
  trafficIntensityClass,
  vehiclesPerDayCaption,
} from "@/lib/shi/corridor-language";
import {
  associateParcelTraffic,
  formatAcres,
  parcelTrafficSummary,
  type CorridorParcelPick,
} from "@/lib/shi/corridor-parcel-traffic";
import {
  approxFrontageFromGeojson,
  buildParcelLocationIntel,
  formatApproxFrontageFt,
  type ParcelLocationIntel,
} from "@/lib/shi/corridor-frontage";
import {
  exposureBandLabel,
  scoreCommercialExposure,
  type RankedSite,
} from "@/lib/shi/corridor-exposure";
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
  const [selectedParcel, setSelectedParcel] =
    useState<CorridorParcelPick | null>(null);
  const [selectedWatch, setSelectedWatch] = useState<GrowthWatchArea | null>(
    null,
  );
  const [roadFilter, setRoadFilter] = useState("");
  const [panel, setPanel] = useState<
    "watch" | "station" | "site" | "memory" | "ask"
  >("watch");
  const [askAnswer, setAskAnswer] = useState<CorridorAskAnswer | null>(null);
  const [parcelIntel, setParcelIntel] = useState<ParcelLocationIntel | null>(
    null,
  );
  const [deskFlood, setDeskFlood] = useState<FloodFact | null>(null);
  const [deskUtilities, setDeskUtilities] = useState<UtilitiesFact | null>(
    null,
  );
  const [deskEnvironment, setDeskEnvironment] =
    useState<EnvironmentDesk | null>(null);
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
  const [commercialExposureMode, setCommercialExposureMode] = useState(false);
  const [rankedSites, setRankedSites] = useState<RankedSite[]>([]);
  const [strongestLoading, setStrongestLoading] = useState(false);
  const [strongestNote, setStrongestNote] = useState("");
  const [comparePicks, setComparePicks] = useState<CorridorParcelPick[]>([]);
  const [compareIntelById, setCompareIntelById] = useState<
    Record<string, ParcelLocationIntel | null>
  >({});
  const [workflowNote, setWorkflowNote] = useState("");
  const [workflowBusy, setWorkflowBusy] = useState(false);

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
      setSelectedParcel(null);
      setSelectedWatch(null);
      setProjects([]);
      setProjectsNote("");
      setRankedSites([]);
      setStrongestNote("");
      setCommercialExposureMode(false);
      setComparePicks([]);
      setCompareIntelById({});
      setWorkflowNote("");
      setAskAnswer(null);
      setParcelIntel(null);
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
          setRankedSites([]);
          setStrongestNote("");
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

  const findStrongestSites = useCallback(async () => {
    if (!analysisBoundary) {
      setStrongestNote("Draw an area first, then Find Strongest Sites.");
      return;
    }
    setStrongestLoading(true);
    setStrongestNote("Ranking parcels by commercial exposure…");
    setCommercialExposureMode(true);
    try {
      const body = await shiCorridorsStrongestSites({
        countyFips: county.fips,
        boundary: analysisBoundary,
        limit: 12,
      });
      setRankedSites(body.sites);
      setStrongestNote(
        body.sites.length
          ? `Top ${body.sites.length} sites of ${body.parcelCount.toLocaleString("en-US")} parcels — ${body.honesty}`
          : "No parcels to rank in this outline.",
      );
      setPanel("site");
      setExploreOpen(true);
    } catch (e) {
      setRankedSites([]);
      setStrongestNote(
        e instanceof Error
          ? e.message
          : "Could not rank strongest sites for this area.",
      );
    } finally {
      setStrongestLoading(false);
    }
  }, [analysisBoundary, county.fips]);

  const propertyCompare = useMemo(() => {
    if (comparePicks.length < 2) return null;
    return comparePropertySites(
      comparePicks.map((pick) => ({
        pick,
        intel: compareIntelById[pick.propId] ?? null,
      })),
      payload?.stations ?? [],
    );
  }, [comparePicks, compareIntelById, payload?.stations]);

  const addParcelToCompare = useCallback(
    (pick: CorridorParcelPick, intel?: ParcelLocationIntel | null) => {
      setComparePicks((prev) => {
        const next = toggleCompareSite(prev, pick);
        return next;
      });
      if (intel) {
        setCompareIntelById((prev) => ({ ...prev, [pick.propId]: intel }));
      }
    },
    [],
  );

  const saveParcelToVault = useCallback(
    async (pick: CorridorParcelPick) => {
      setWorkflowBusy(true);
      setWorkflowNote("");
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
        const pad = 0.004;
        const label = pick.situsAddress?.trim() || `CAD #${pick.propId}`;
        await shiSaveFrame({
          folderId: folder.id,
          name: `Corridors · ${label}`,
          color: "#f5b71e",
          boundary: {
            type: "rectangle",
            bounds: {
              west: pick.lng - pad,
              south: pick.lat - pad,
              east: pick.lng + pad,
              north: pick.lat + pad,
            },
          },
        });
        setWorkflowNote(`Saved “${label}” to Study Vault (Corridors).`);
      } catch (e) {
        setWorkflowNote(
          e instanceof Error ? e.message : "Could not save to Study Vault.",
        );
      } finally {
        setWorkflowBusy(false);
      }
    },
    [county.source],
  );

  const addParcelProspect = useCallback(
    async (pick: CorridorParcelPick) => {
      setWorkflowBusy(true);
      setWorkflowNote("");
      try {
        const { created } = await shiAddProspect({
          source: pick.source ?? county.source,
          propId: pick.propId,
          countyFips: pick.countyFips ?? county.fips,
          countyName: county.name,
          label: pick.situsAddress,
          ownerName: pick.ownerName,
          situsAddress: pick.situsAddress,
          legalAcreage: pick.legalAcreage,
          marketValue: pick.marketValue,
          centroidLat: pick.lat,
          centroidLng: pick.lng,
        });
        writeLastArchieModule("prospects");
        setWorkflowNote(
          created
            ? "Added to Prospects — opening…"
            : "Already in Prospects — opening…",
        );
        router.push("/portal/intelligence?section=prospects");
      } catch (e) {
        setWorkflowNote(
          e instanceof Error ? e.message : "Could not add prospect.",
        );
      } finally {
        setWorkflowBusy(false);
      }
    },
    [county, router],
  );

  const createParcelFarm = useCallback(
    async (pick: CorridorParcelPick) => {
      setWorkflowBusy(true);
      setWorkflowNote("");
      try {
        const boundary = boundsAroundPoints([{ lat: pick.lat, lng: pick.lng }]);
        if (!boundary) throw new Error("Could not build farm boundary.");
        const label = pick.situsAddress?.trim() || `CAD #${pick.propId}`;
        await shiCreateFarm({
          name: `Corridors · ${label}`,
          countySource: county.source,
          countyName: county.name,
          boundary,
          mapCenterLat: pick.lat,
          mapCenterLng: pick.lng,
          mapZoom: 15,
        });
        writeLastArchieModule("farms");
        setWorkflowNote("Farm created — opening…");
        router.push("/portal/intelligence?section=farms");
      } catch (e) {
        setWorkflowNote(
          e instanceof Error ? e.message : "Could not create farm.",
        );
      } finally {
        setWorkflowBusy(false);
      }
    },
    [county, router],
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
    <div
      className="space-y-4"
      data-corridors-version="c2-0-f"
      data-data-coverage="dc-5"
    >
      {/* Hero — tools live on the map, not here */}
      <div className="story-surface px-4 py-4 md:px-6 md:py-5">
        <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-gold uppercase">
          Corridors
        </p>
        <h2 className="mt-1 font-serif text-2xl font-bold text-ink md:text-3xl">
          {CORRIDORS_2_PURPOSE}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          {CORRIDORS_2_HERO} {CORRIDORS_2_SUPPORT}
        </p>
        <p className="mt-2 max-w-3xl text-xs text-[var(--muted)]">
          {CORRIDOR_ANALYSIS_HONESTY}
        </p>
        <p className="mt-3 font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
          Map toolbox · Freehand · Box · Radius · Traffic · pan locked while
          drawing
        </p>
      </div>

      {/* How Archie reads */}
      <div className="story-well px-4 py-3 md:px-5">
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
          How Archie reads a corridor
        </p>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
          The road tells Archie where movement is concentrated. The goal is the
          land: which parcels sit in that flow, whether traffic is growing, and
          what deserves a closer look — without traffic-engineering jargon.
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
              setRankedSites([]);
              setStrongestNote("");
              setComparePicks([]);
              setCompareIntelById({});
              setDeskFlood(null);
              setDeskUtilities(null);
              setDeskEnvironment(null);
              setAskAnswer(null);
              setSelectedParcel(null);
              setParcelIntel(null);
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
            data-commercial-exposure-toggle
            onClick={() => setCommercialExposureMode((v) => !v)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold",
              commercialExposureMode
                ? "bg-gold text-navy"
                : "border border-hairline text-ink",
            )}
          >
            Commercial Exposure
          </button>
          <button
            type="button"
            data-find-strongest-sites
            onClick={() => void findStrongestSites()}
            disabled={strongestLoading || !analysisBoundary}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-semibold text-ink disabled:opacity-40"
          >
            {strongestLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Find Strongest Sites
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
              setSelectedParcel(null);
              setPanel("station");
              setExploreOpen(true);
              setRevealStations(true);
            }
          }}
          selectedParcelId={selectedParcel?.propId ?? null}
          onSelectParcel={(p) => {
            setSelectedParcel(p);
            if (p) {
              setSelected(null);
              setPanel("site");
              setExploreOpen(true);
            }
          }}
          commercialExposureMode={commercialExposureMode}
          rankedSites={rankedSites}
          onSelectRankedSite={(site) => {
            setSelectedParcel({
              propId: site.propId,
              source: site.source,
              lat: site.lat,
              lng: site.lng,
              situsAddress: site.situsAddress,
              ownerName: site.ownerName,
              legalAcreage: site.legalAcreage,
              marketValue: site.marketValue,
            });
            setSelected(null);
            setPanel("site");
            setExploreOpen(true);
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
            <div className="flex gap-1 story-glass rounded-[var(--radius-md)] p-0.5">
              {(
                [
                  ["ask", "Ask"],
                  ["watch", "Patterns"],
                  ["site", "Site"],
                  ["station", "Traffic"],
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

            {panel === "ask" ? (
              <AskArchiePanel
                answer={askAnswer}
                onAsk={(q) => {
                  const answer = answerCorridorAsk(q, {
                    countyName: county.name,
                    stations: payload?.stations ?? [],
                    watchAreas: payload?.watch?.areas ?? [],
                    selectedParcel,
                    selectedStation: selected,
                    parcelIntel,
                    rankedSites,
                    hasAnalysisBoundary: Boolean(analysisBoundary),
                    compareCount: comparePicks.length,
                    flood: deskFlood,
                    utilities: deskUtilities,
                    environment: deskEnvironment,
                  });
                  setAskAnswer(answer);
                  if (answer.hint === "draw_area") {
                    setTool("freehand");
                  } else if (answer.hint === "run_strongest") {
                    void findStrongestSites();
                  } else if (answer.hint === "select_parcel") {
                    setTool("pan");
                    setPanel("site");
                  } else if (answer.hint === "select_station") {
                    setTool("traffic");
                    setRevealStations(true);
                    setPanel("station");
                  } else if (answer.hint === "open_compare") {
                    /* stay — compare panel is below */
                  }
                }}
              />
            ) : null}
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
            {panel === "site" ? (
              <ParcelSitePanel
                parcel={selectedParcel}
                stations={payload?.stations ?? []}
                segments={payload?.segments ?? []}
                county={county}
                compareSelected={
                  !!selectedParcel &&
                  comparePicks.some((p) => p.propId === selectedParcel.propId)
                }
                compareCount={comparePicks.length}
                workflowBusy={workflowBusy}
                onIntelChange={setParcelIntel}
                onDeskEvidence={(desk) => {
                  setDeskFlood(desk.flood);
                  setDeskUtilities(desk.utilities);
                  setDeskEnvironment(desk.environment);
                }}
                onToggleCompare={(intel) => {
                  if (!selectedParcel) return;
                  addParcelToCompare(selectedParcel, intel);
                }}
                onStudyLand={() => {
                  if (!selectedParcel) return;
                  openParcelInResearch({
                    propId: selectedParcel.propId,
                    lat: selectedParcel.lat,
                    lng: selectedParcel.lng,
                    countySource: county.source,
                    countyName: county.name,
                    situsAddress: selectedParcel.situsAddress,
                  });
                  writeLastArchieModule("research");
                  if (onOpenResearch) onOpenResearch();
                  else
                    router.push(
                      "/portal/intelligence?section=research&handoff=corridor",
                    );
                }}
                onSave={() => {
                  if (!selectedParcel) return;
                  void saveParcelToVault(selectedParcel);
                }}
                onProspect={() => {
                  if (!selectedParcel) return;
                  void addParcelProspect(selectedParcel);
                }}
                onFarm={() => {
                  if (!selectedParcel) return;
                  void createParcelFarm(selectedParcel);
                }}
                onReport={(intel) => {
                  if (!selectedParcel) return;
                  openPropertyLocationReport({
                    countyName: county.name,
                    pick: selectedParcel,
                    stations: payload?.stations ?? [],
                    intel,
                    compareSites:
                      comparePicks.length >= 2
                        ? comparePicks.map((pick) => ({
                            pick,
                            intel: compareIntelById[pick.propId] ?? null,
                          }))
                        : undefined,
                  });
                }}
              />
            ) : null}
            {panel === "station" ? (
              <div>
                <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Traffic at this location
                </p>
                {selected ? (
                  <StationDetail station={selected} />
                ) : (
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Tap Traffic on the map, then a count station — or zoom in to
                    reveal stations along the corridor.
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

      {propertyCompare && !presentationMode ? (
        <ShiCorridorsPropertyComparePanel
          compare={propertyCompare}
          onClear={() => {
            setComparePicks([]);
            setCompareIntelById({});
          }}
        />
      ) : null}

      {workflowNote && !presentationMode ? (
        <p className="text-sm text-[var(--muted)]" data-corridor-workflow-note>
          {workflowNote}
        </p>
      ) : null}

      {strongestNote && !presentationMode ? (
        <p
          className="text-sm text-[var(--muted)]"
          data-strongest-sites-note
        >
          {strongestNote}
        </p>
      ) : null}

      {rankedSites.length > 0 && !presentationMode ? (
        <section
          className="story-surface p-4"
          data-strongest-sites-list
        >
          <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
            Strongest sites · commercial exposure
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Ranked land parcels — transparent factors, not an AI mystery score.
            Select 2–{PROPERTY_COMPARE_MAX} to compare properties.
          </p>
          <ul className="mt-3 space-y-1">
            {rankedSites.map((s) => {
              const pick: CorridorParcelPick = {
                propId: s.propId,
                source: s.source,
                lat: s.lat,
                lng: s.lng,
                situsAddress: s.situsAddress,
                ownerName: s.ownerName,
                legalAcreage: s.legalAcreage,
                marketValue: s.marketValue,
              };
              const inCompare = comparePicks.some((p) => p.propId === s.propId);
              return (
                <li
                  key={s.propId}
                  className="flex items-center gap-1"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedParcel(pick);
                      setSelected(null);
                      setPanel("site");
                      setExploreOpen(true);
                    }}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-[var(--background)]"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-[10px] text-gold">
                        #{s.rank}
                      </span>{" "}
                      <span className="font-semibold text-ink">
                        {s.situsAddress?.trim() || `CAD #${s.propId}`}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--muted)]">
                      {s.commercial.score}/{s.commercial.maxScore} ·{" "}
                      {exposureBandLabel(s.commercial.band)}
                    </span>
                  </button>
                  <button
                    type="button"
                    data-property-compare-toggle
                    onClick={() => addParcelToCompare(pick)}
                    className={cn(
                      "shrink-0 rounded-md px-2 py-1.5 font-mono text-[10px] font-semibold uppercase",
                      inCompare
                        ? "bg-gold text-navy"
                        : "border border-hairline text-[var(--muted)]",
                    )}
                  >
                    {inCompare ? "In compare" : "Compare"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
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

function AskArchiePanel({
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

function ParcelSitePanel({
  parcel,
  stations,
  segments,
  county,
  compareSelected,
  compareCount,
  workflowBusy,
  onIntelChange,
  onDeskEvidence,
  onToggleCompare,
  onStudyLand,
  onSave,
  onProspect,
  onFarm,
  onReport,
}: {
  parcel: CorridorParcelPick | null;
  stations: TrafficStation[];
  segments: TrafficCorridorSegment[];
  county: CorridorCounty;
  compareSelected: boolean;
  compareCount: number;
  workflowBusy: boolean;
  onIntelChange?: (intel: ParcelLocationIntel | null) => void;
  onDeskEvidence?: (desk: {
    flood: FloodFact | null;
    utilities: UtilitiesFact | null;
    environment: EnvironmentDesk | null;
  }) => void;
  onToggleCompare: (intel: ParcelLocationIntel | null) => void;
  onStudyLand: () => void;
  onSave: () => void;
  onProspect: () => void;
  onFarm: () => void;
  onReport: (intel: ParcelLocationIntel | null) => void;
}) {
  const [intel, setIntel] = useState<ParcelLocationIntel | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [floodFact, setFloodFact] = useState<FloodFact | null>(null);
  const [utilitiesFact, setUtilitiesFact] = useState<UtilitiesFact | null>(
    null,
  );
  const [environmentDesk, setEnvironmentDesk] =
    useState<EnvironmentDesk | null>(null);
  const [deedsFact, setDeedsFact] = useState<DeedsFact | null>(null);

  useEffect(() => {
    onDeskEvidence?.({
      flood: floodFact,
      utilities: utilitiesFact,
      environment: environmentDesk,
    });
  }, [floodFact, utilitiesFact, environmentDesk, onDeskEvidence]);

  useEffect(() => {
    if (!parcel) {
      setIntel(null);
      setFloodFact(null);
      setUtilitiesFact(null);
      setEnvironmentDesk(null);
      setDeedsFact(null);
      onIntelChange?.(null);
      return;
    }

    /* Immediate client approx when map gave us a polygon + live segments. */
    if (parcel.geojson && segments.length > 0) {
      const roads = approxFrontageFromGeojson({
        parcelGeojson: parcel.geojson,
        segments,
      });
      const next = buildParcelLocationIntel({
        roads,
        source: "client_approx",
        observationYear: new Date().getFullYear(),
        stationNearby: roads.length > 0,
      });
      setIntel(next);
      onIntelChange?.(next);
    } else {
      setIntel(null);
      onIntelChange?.(null);
    }

    let cancelled = false;
    setIntelLoading(true);
    setFloodFact(null);
    setUtilitiesFact(null);
    setEnvironmentDesk(null);
    setDeedsFact(null);
    void shiCorridorsParcelLocation({
      propId: parcel.propId,
      source: parcel.source ?? county.source,
      countyFips: parcel.countyFips ?? county.fips,
      lat: parcel.lat,
      lng: parcel.lng,
    })
      .then((body) => {
        if (cancelled || !body.intel) return;
        setIntel((prev) => {
          let next = body.intel;
          if (body.intel.source === "postgis") next = body.intel;
          else if (
            prev &&
            prev.totalApproxFrontageFt > body.intel.totalApproxFrontageFt
          ) {
            next = prev;
          }
          onIntelChange?.(next);
          return next;
        });
      })
      .catch(() => {
        /* Soft-fail — station estimate still shows. */
      })
      .finally(() => {
        if (!cancelled) setIntelLoading(false);
      });

    const fips = parcel.countyFips ?? county.fips;
    /* DC-1…5 — flood · utilities · environment · deeds dark; retract when userReveal false. */
    void shiFloodAtPoint({
      countyFips: fips,
      lat: parcel.lat,
      lng: parcel.lng,
    })
      .then((body) => {
        if (cancelled) return;
        setFloodFact(body.flood?.userReveal ? body.flood : null);
      })
      .catch(() => {
        if (!cancelled) setFloodFact(null);
      });
    void shiUtilitiesAtPoint({
      countyFips: fips,
      lat: parcel.lat,
      lng: parcel.lng,
    })
      .then((body) => {
        if (cancelled) return;
        setUtilitiesFact(
          body.utilities?.userReveal ? body.utilities : null,
        );
      })
      .catch(() => {
        if (!cancelled) setUtilitiesFact(null);
      });
    void shiEnvironmentAtPoint({
      countyFips: fips,
      lat: parcel.lat,
      lng: parcel.lng,
    })
      .then((body) => {
        if (cancelled) return;
        setEnvironmentDesk(body.environment ?? null);
      })
      .catch(() => {
        if (!cancelled) setEnvironmentDesk(null);
      });
    void shiDeedsForParcel({
      countyFips: fips,
      propId: parcel.propId,
      lat: parcel.lat,
      lng: parcel.lng,
    })
      .then((body) => {
        if (cancelled) return;
        setDeedsFact(body.deeds?.userReveal ? body.deeds : null);
      })
      .catch(() => {
        if (!cancelled) setDeedsFact(null);
      });

    return () => {
      cancelled = true;
    };
  }, [parcel, segments, county.fips, county.source, onIntelChange]);

  if (!parcel) {
    return (
      <div data-corridor-parcel-empty>
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          Location · parcel
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Zoom in until parcel lines appear, then tap a parcel. Archie shows
          approx frontage and nearby published traffic — never surveyed
          frontage.
        </p>
      </div>
    );
  }

  const assoc = associateParcelTraffic(parcel, stations);
  const summary = parcelTrafficSummary(assoc);
  const confidenceLabel = (intel?.confidence ?? assoc.confidence).toUpperCase();
  const commercial = scoreCommercialExposure({
    pick: parcel,
    stations,
    intel,
    legalAcreage: parcel.legalAcreage,
  });

  return (
    <div className="space-y-3" data-corridor-parcel-panel>
      <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
        Location · parcel
      </p>
      <h3 className="font-serif text-xl font-bold text-ink">
        {formatAcres(parcel.legalAcreage)}
      </h3>
      <p className="text-sm text-ink">
        {parcel.situsAddress?.trim() ||
          `${county.shortName} County · CAD #${parcel.propId}`}
      </p>
      {parcel.situsAddress ? (
        <p className="text-xs text-[var(--muted)]">CAD #{parcel.propId}</p>
      ) : null}

      <ShiFloodEvidencePanel flood={floodFact} compact />
      <ShiUtilitiesEvidencePanel utilities={utilitiesFact} compact />
      <ShiEnvironmentEvidencePanel environment={environmentDesk} compact />
      <ShiDeedsEvidencePanel deeds={deedsFact} compact />

      <div className="story-well px-3 py-2.5" data-corridor-exposure-score>
        <p className="font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
          Commercial exposure
        </p>
        <p className="mt-1 font-serif text-3xl font-bold tabular-nums text-ink">
          {commercial.score}
          <span className="text-lg text-[var(--muted)]">
            /{commercial.maxScore}
          </span>
        </p>
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
          {exposureBandLabel(commercial.band)}
        </p>
        <details className="mt-2" data-corridor-exposure-why>
          <summary className="cursor-pointer text-[11px] font-semibold text-gold">
            WHY?
          </summary>
          <ul className="mt-2 space-y-1.5">
            {commercial.factors.map((f) => (
              <li key={f.id} className="text-[11px] leading-snug text-[var(--muted)]">
                <span className="font-semibold text-ink">
                  {f.label} · {f.points}/{f.maxPoints}
                </span>
                <br />
                {f.detail}
              </li>
            ))}
          </ul>
        </details>
      </div>

      <div className="story-well px-3 py-2.5" data-corridor-frontage-block>
        <p className="font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
          Approx. frontage
        </p>
        <p
          className="mt-1 font-serif text-2xl font-bold tabular-nums text-ink"
          data-corridor-frontage-ft
        >
          {intelLoading && !intel
            ? "…"
            : formatApproxFrontageFt(intel?.totalApproxFrontageFt ?? 0)}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
          Mapped-road proximity — not a survey. Label always APPROX.
        </p>
        {intel?.roads?.length ? (
          <ul className="mt-2 space-y-1" data-corridor-frontage-roads>
            {intel.roads.slice(0, 4).map((r) => (
              <li
                key={`${r.routeId}:${r.segmentId}`}
                className="flex justify-between gap-2 text-xs text-ink"
              >
                <span className="truncate">{r.routeId}</span>
                <span className="shrink-0 tabular-nums text-[var(--muted)]">
                  ~{r.approxFrontageFt.toLocaleString("en-US")} ft
                  {r.aadt != null
                    ? ` · ${Math.round(r.aadt).toLocaleString("en-US")}/day`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {intel?.dualRoad ? (
            <span
              data-corridor-dual-road
              className="rounded-md border border-gold/35 bg-gold/10 px-2 py-1 font-mono text-[10px] font-semibold text-gold uppercase"
            >
              Dual-road
            </span>
          ) : null}
          {intel?.cornerLikely ? (
            <span
              data-corridor-corner
              className="rounded-md border border-hairline bg-[var(--background)] px-2 py-1 font-mono text-[10px] font-semibold uppercase"
            >
              Corner likely
            </span>
          ) : null}
          <span
            data-corridor-data-confidence
            className="rounded-md border border-hairline bg-[var(--background)] px-2 py-1 font-mono text-[10px] font-semibold uppercase"
          >
            Data {confidenceLabel}
          </span>
        </div>
        {intel?.confidenceWhy ? (
          <p className="mt-1.5 text-[11px] text-[var(--muted)]">
            {intel.confidenceWhy}
          </p>
        ) : null}
      </div>

      <div className="story-well px-3 py-2.5">
        <p className="font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
          Traffic exposure
        </p>
        <p className="mt-1 font-serif text-3xl font-bold tabular-nums text-ink">
          {summary.vehiclesLabel}
        </p>
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
          Vehicles / day
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">{summary.caption}</p>
        <p
          className="mt-2 font-mono text-[10px] font-semibold tracking-wide uppercase text-ink"
          data-parcel-traffic-kind
        >
          {assoc.kind === "estimated"
            ? `${assoc.label} · ${assoc.confidence} confidence`
            : assoc.label}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
          {assoc.detail}
        </p>
        {summary.intensity || summary.status ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {summary.intensity ? (
              <span className="rounded-md border border-hairline bg-[var(--background)] px-2 py-1 font-mono text-[10px] font-semibold uppercase">
                {summary.intensity}
              </span>
            ) : null}
            {summary.status ? (
              <span className="rounded-md border border-gold/35 bg-gold/10 px-2 py-1 font-mono text-[10px] font-semibold text-gold uppercase">
                {summary.status}
              </span>
            ) : null}
          </div>
        ) : null}
        {summary.statusWhy ? (
          <p className="mt-1.5 text-[11px] text-[var(--muted)]">
            {summary.statusWhy}
          </p>
        ) : null}
      </div>

      <p className="text-[11px] leading-snug text-[var(--muted)]">
        Full CAD research stays in Research. This panel is location intelligence
        — approx frontage and published traffic only.
      </p>

      <div
        className="flex flex-wrap gap-1.5"
        data-corridor-workflow-ctas
      >
        <button
          type="button"
          onClick={onStudyLand}
          data-corridor-parcel-research
          className="inline-flex h-9 items-center rounded-lg bg-gold px-3 text-xs font-bold text-navy"
        >
          Research
        </button>
        <button
          type="button"
          onClick={onProspect}
          disabled={workflowBusy}
          data-corridor-parcel-prospect
          className="inline-flex h-9 items-center rounded-lg border border-hairline px-3 text-xs font-semibold text-ink disabled:opacity-40"
        >
          Prospects
        </button>
        <button
          type="button"
          onClick={onFarm}
          disabled={workflowBusy}
          data-corridor-parcel-farm
          className="inline-flex h-9 items-center rounded-lg border border-hairline px-3 text-xs font-semibold text-ink disabled:opacity-40"
        >
          Farms
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={workflowBusy}
          data-corridor-parcel-save
          className="inline-flex h-9 items-center rounded-lg border border-hairline px-3 text-xs font-semibold text-ink disabled:opacity-40"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => onReport(intel)}
          data-corridor-parcel-report
          className="inline-flex h-9 items-center rounded-lg border border-hairline px-3 text-xs font-semibold text-ink"
        >
          Report
        </button>
        <button
          type="button"
          onClick={() => onToggleCompare(intel)}
          data-corridor-parcel-compare
          className={cn(
            "inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold",
            compareSelected
              ? "bg-gold text-navy"
              : "border border-hairline text-ink",
          )}
        >
          {compareSelected
            ? `In compare (${compareCount})`
            : compareCount >= PROPERTY_COMPARE_MAX
              ? "Compare full"
              : "Add to compare"}
        </button>
      </div>
    </div>
  );
}

function StationDetail({ station }: { station: TrafficStation }) {
  const [showExplainer, setShowExplainer] = useState(false);
  const status = corridorStatusFromHistory(station.history);
  const intensity = trafficIntensityClass(station.latestAadt);

  return (
    <div className="mt-2 space-y-3" data-corridor-traffic-dossier>
      <h3 className="font-serif text-xl font-bold text-ink">
        {station.onRoad || "Unnamed corridor"}
      </h3>

      <div>
        <p className="font-serif text-3xl font-bold tabular-nums text-ink">
          {formatAadt(station.latestAadt)}
        </p>
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
          Vehicles / day
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {vehiclesPerDayCaption(station.latestYear)}
        </p>
        <button
          type="button"
          onClick={() => setShowExplainer((v) => !v)}
          className="mt-1 text-[11px] font-semibold text-gold underline-offset-2 hover:underline"
          data-aadt-explainer-toggle
        >
          What does this mean?
        </button>
        {showExplainer ? (
          <p
            className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]"
            data-aadt-explainer
          >
            {AADT_EXPLAINER_V1}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-md border border-hairline bg-[var(--background)] px-2 py-1 font-mono text-[10px] font-semibold tracking-wide text-ink uppercase">
          {TRAFFIC_INTENSITY_LABEL[intensity]}
        </span>
        <span className="rounded-md border border-gold/35 bg-gold/10 px-2 py-1 font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
          {CORRIDOR_STATUS_LABEL[status.status]}
        </span>
      </div>
      <p className="text-[11px] leading-snug text-[var(--muted)]">{status.why}</p>
      {status.changePct != null ? (
        <p className="font-mono text-[11px] tabular-nums text-ink">
          {status.changePct >= 0 ? "↑" : "↓"}{" "}
          {Math.abs(status.changePct).toFixed(1)}% across published years
        </p>
      ) : null}

      <div>
        <p className="font-mono text-[10px] font-semibold tracking-wide text-[var(--muted)] uppercase">
          View history
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
            >
              {h.year > 1900 ? h.year : "—"} · {formatAadt(h.aadt)}
            </span>
          ))}
        </div>
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
