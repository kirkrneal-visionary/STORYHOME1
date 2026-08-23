"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, Users } from "lucide-react";
import { ShiCadEvidencePanel } from "@/components/broker/intelligence/ShiCadEvidencePanel";
import { ShiFloodEvidencePanel } from "@/components/broker/intelligence/ShiFloodEvidencePanel";
import { ShiUtilitiesEvidencePanel } from "@/components/broker/intelligence/ShiUtilitiesEvidencePanel";
import { ShiEnvironmentEvidencePanel } from "@/components/broker/intelligence/ShiEnvironmentEvidencePanel";
import { ShiDeedsEvidencePanel } from "@/components/broker/intelligence/ShiDeedsEvidencePanel";
import { ShiResearchAccessPanel } from "@/components/broker/intelligence/ShiResearchAccessPanel";
import { ShiParcelPositionCard } from "@/components/broker/intelligence/ShiParcelPositionCard";
import {
  ShiResearchAccessDesk,
  type ResearchAccessDeskTab,
} from "@/components/broker/intelligence/ShiResearchAccessDesk";
import { ShiMultifamilyRead } from "@/components/broker/intelligence/ShiMultifamilyRead";
import { ShiResearchPanelHost } from "@/components/broker/intelligence/ShiResearchDesktopDrawer";
import { ShiWorkspaceBar } from "@/components/broker/intelligence/ShiWorkspaceBar";
import { ShiArchieIntelligencePanel } from "@/components/broker/intelligence/ShiArchieIntelligencePanel";
import { ShiCountyChangeFeed } from "@/components/broker/intelligence/ShiCountyChangeFeed";
import { ShiDiscoverPanel } from "@/components/broker/intelligence/ShiDiscoverPanel";
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
import { track } from "@/lib/analytics";
import { makeShiAcronym } from "@/lib/shi/acronym";
import { validateBoundaryCaps } from "@/lib/shi/boundary-caps";
import { SHI_CAPS } from "@/lib/shi/caps";
import { nextFrameColor } from "@/lib/shi/frame-colors";
import { fitThumbnailDataUrl } from "@/lib/shi/thumbnail";
import { AVAILABLE_COUNTIES } from "@/lib/supabase/parcels";
import {
  consumeOpenSavedFrame,
  shiAddProspect,
  shiAnalyzeArea,
  shiWorthALook,
  shiCreateFarm,
  shiCreateFolder,
  shiFreshness,
  shiGetFrame,
  shiGetProperty,
  shiFloodAtPoint,
  shiUtilitiesAtPoint,
  shiEnvironmentAtPoint,
  shiDeedsForParcel,
  shiCorridorsTraffic,
  shiCorridorsParcelLocation,
  shiAttachPositionToRankedSites,
  shiCorridorsStrongestSites,
  shiMultifamilyParcel,
  shiMultifamilyReview,
  shiParcelNeighbors,
  shiListFolders,
  shiOwnerMatches,
  shiSaveFrame,
  shiSearch,
} from "@/lib/shi/client";
import { isLaunchCorridorFips } from "@/lib/shi/corridors";
import type {
  TrafficCorridorSegment,
  TrafficStation,
} from "@/lib/shi/corridors";
import type { ParcelLocationIntel } from "@/lib/shi/corridor-frontage";
import type { ParcelNeighborsResult } from "@/lib/shi/parcel-neighbors";
import {
  answerCorridorAsk,
  type CorridorAskAnswer,
} from "@/lib/shi/corridor-ask";
import type { WorthALookItem } from "@/lib/shi/parcel-position-area";
import type { ParcelPositionRecord } from "@/lib/shi/parcel-position";
import type { ParcelPositionProfile } from "@/lib/shi/parcel-position-profile";
import type { ParcelPositionContext } from "@/lib/shi/parcel-position-context";
import {
  pickFromCandidates,
  type LookCandidate,
  type PositionObjective,
} from "@/lib/shi/parcel-position-objective";
import type { RankedSite } from "@/lib/shi/corridor-exposure";
import {
  RESEARCH_MODES,
  researchModeFromSaved,
  type ResearchModeChip,
  type ResearchModeId,
} from "@/lib/shi/research-modes";
import {
  modeReviewFromRankedFacts,
  type ModeReviewResult,
} from "@/lib/shi/research-mode-reason";
import type { MultifamilyRead } from "@/lib/shi/multifamily-read";
import type { MultifamilyReviewResult } from "@/lib/shi/multifamily-review";
import {
  comparePropertySites,
  toggleCompareSite,
} from "@/lib/shi/corridor-property-compare";
import type { CorridorParcelPick } from "@/lib/shi/corridor-parcel-traffic";
import { formatShiVaultError } from "@/lib/shi/vault-errors";
import {
  RESEARCH_WORKSPACE_VERSION,
  WORKSPACE_COPY,
  drawerWidthPx,
  readWorkspaceSnapshot,
  workspaceContext,
  workspaceLayout,
  writeWorkspaceSnapshot,
  type WorkspaceLayout,
  type WorkspaceSheetSnap,
} from "@/lib/shi/research-workspace";
import type {
  ShiAreaAnalysis,
  ShiCountyFreshness,
  ShiDiscoverPin,
  ShiLocalFrame,
  ShiOwnerMatch,
  ShiPropertyDetail,
  ShiPropertySummary,
  ShiSavedFrame,
  ShiStudyFolder,
} from "@/lib/shi/types";
import type { FloodFact } from "@/lib/shi/flood-fema";
import type { UtilitiesFact } from "@/lib/shi/utilities-ccn";
import type { EnvironmentDesk } from "@/lib/shi/environment-desk";
import type { DeedsFact } from "@/lib/shi/deeds-clerk";
import { cn } from "@/lib/utils";

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

const EMPTY_WORTH: WorthALookItem[] = [];

function acres(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ac`;
}

type ResearchProps = {
  researchMode?: ResearchModeId;
  onChangeResearchMode?: () => void;
  onRestoreResearchMode?: (mode: ResearchModeId) => void;
  onOpenVault?: () => void;
  onOpenFarms?: () => void;
};

/**
 * SHI Research — classic 3-split (Search | Map | Property) with Market Frames below.
 * Study Vault lives on its own submenu (not crammed here).
 */
export function PropertyIntelligenceView({
  researchMode = "general",
  onChangeResearchMode,
  onRestoreResearchMode,
  onOpenVault,
  onOpenFarms,
}: ResearchProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [field, setField] = useState<CadSearchField>("all");
  const [source, setSource] = useState(() => readWorkspaceSnapshot()?.source ?? "");
  const [results, setResults] = useState<ShiPropertySummary[]>([]);
  const [indexNote, setIndexNote] = useState<string | null>(null);
  const [selected, setSelected] = useState<ShiPropertyDetail | null>(null);
  const [floodFact, setFloodFact] = useState<FloodFact | null>(null);
  const [utilitiesFact, setUtilitiesFact] = useState<UtilitiesFact | null>(
    null,
  );
  const [environmentDesk, setEnvironmentDesk] =
    useState<EnvironmentDesk | null>(null);
  const [deedsFact, setDeedsFact] = useState<DeedsFact | null>(null);
  const [accessIntel, setAccessIntel] = useState<ParcelLocationIntel | null>(
    null,
  );
  const [positionProfile, setPositionProfile] =
    useState<ParcelPositionProfile | null>(null);
  const [positionContext, setPositionContext] =
    useState<ParcelPositionContext | null>(null);
  const [parcelNeighbors, setParcelNeighbors] =
    useState<ParcelNeighborsResult | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessTrafficOn, setAccessTrafficOn] = useState(false);
  const [accessTrafficLoading, setAccessTrafficLoading] = useState(false);
  const [accessSegments, setAccessSegments] = useState<TrafficCorridorSegment[]>(
    [],
  );
  const [accessStations, setAccessStations] = useState<TrafficStation[]>([]);
  const [accessDeskTab, setAccessDeskTab] = useState<ResearchAccessDeskTab>("ask");
  const [askAnswer, setAskAnswer] = useState<CorridorAskAnswer | null>(null);
  const [rankedSites, setRankedSites] = useState<RankedSite[]>([]);
  const [strongestLoading, setStrongestLoading] = useState(false);
  const [strongestNote, setStrongestNote] = useState("");
  const [comparePicks, setComparePicks] = useState<CorridorParcelPick[]>([]);
  const [compareIntelById, setCompareIntelById] = useState<
    Record<string, ParcelLocationIntel | null>
  >({});
  const [comparePositionById, setComparePositionById] = useState<
    Record<string, ParcelPositionRecord | null>
  >({});
  const [modeReview, setModeReview] = useState<ModeReviewResult | null>(null);
  const [mfReview, setMfReview] = useState<MultifamilyReviewResult | null>(null);
  const [mfRead, setMfRead] = useState<MultifamilyRead | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [workspaceMenu, setWorkspaceMenu] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<WorkspaceSheetSnap>(
    () => readWorkspaceSnapshot()?.sheetSnap ?? "peek",
  );
  const [expandedMap, setExpandedMap] = useState(
    () => readWorkspaceSnapshot()?.expandedMap !== false,
  );
  const [drawerOpen, setDrawerOpen] = useState(
    () => readWorkspaceSnapshot()?.drawerOpen !== false,
  );
  const [layout, setLayout] = useState<WorkspaceLayout>("sheet");
  const [drawerW, setDrawerW] = useState(380);
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
  const [reopening, setReopening] = useState(false);
  const [savingProspect, setSavingProspect] = useState(false);
  const [prospectMsg, setProspectMsg] = useState("");
  const [discoverPins, setDiscoverPins] = useState<ShiDiscoverPin[]>([]);
  const [worthALook, setWorthALook] = useState<WorthALookItem[] | null>(null);
  const [lookCandidates, setLookCandidates] = useState<LookCandidate[]>([]);
  const [lookObjective, setLookObjective] =
    useState<PositionObjective>("road_position");
  const lookObjectiveRef = useRef<PositionObjective>("road_position");
  lookObjectiveRef.current = lookObjective;
  const [worthLoading, setWorthLoading] = useState(false);
  const mapRef = useRef<ShiMapHandle | null>(null);
  const persistViewTimer = useRef(0);
  const savedMapView = useMemo(() => {
    const snap = readWorkspaceSnapshot();
    if (
      snap?.mapCenterLat == null ||
      snap?.mapCenterLng == null ||
      snap?.mapZoom == null
    ) {
      return null;
    }
    return {
      centerLat: snap.mapCenterLat,
      centerLng: snap.mapCenterLng,
      zoom: snap.mapZoom,
    };
  }, []);
  const persistMapView = useCallback(
    (view: { centerLat: number; centerLng: number; zoom: number }) => {
      window.clearTimeout(persistViewTimer.current);
      persistViewTimer.current = window.setTimeout(() => {
        writeWorkspaceSnapshot({
          mapCenterLat: view.centerLat,
          mapCenterLng: view.centerLng,
          mapZoom: view.zoom,
        });
      }, 400);
    },
    [],
  );
  const openedPropRef = useRef<string | null>(null);
  const ownerPortfolioRef = useRef<HTMLDivElement | null>(null);
  const countyLockRef = useRef<{ selectedSource?: string; filterSource: string }>(
    { filterSource: "" },
  );
  const frameSeq = useRef(1);
  const openedFrameRef = useRef<string | null>(null);

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

  useEffect(() => {
    const sync = () => {
      const w = window.innerWidth;
      setLayout(workspaceLayout(w));
      setDrawerW(drawerWidthPx(w));
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (expandedMap) root.dataset.mapExpanded = "true";
    else delete root.dataset.mapExpanded;
    root.dataset.workspaceLayout = layout;
    return () => {
      delete root.dataset.mapExpanded;
      delete root.dataset.workspaceLayout;
    };
  }, [expandedMap, layout]);

  useEffect(() => {
    writeWorkspaceSnapshot({
      expandedMap,
      drawerOpen,
      sheetSnap,
    });
  }, [expandedMap, drawerOpen, sheetSnap]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => mapRef.current?.resize());
    return () => window.cancelAnimationFrame(id);
  }, [layout, drawerOpen, drawerW, expandedMap, sheetSnap]);

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
    } catch (e) {
      setFolders([]);
      setAreaError(formatShiVaultError(e));
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
          setFloodFact(null);
          setUtilitiesFact(null);
          setMfRead(null);
          setEnvironmentDesk(null);
          setDeedsFact(null);
          setAccessIntel(null);
          setPositionProfile(null);
          setPositionContext(null);
          setMatches([]);
          setParcelNeighbors(null);
          setDiscoverPins([]);
          return;
        }
        setSelected(property);
        setSheetSnap((s) => (s === "collapsed" || s === "peek" ? "expanded" : s));
        setFloodFact(null);
        setUtilitiesFact(null);
        setMfRead(null);
        setEnvironmentDesk(null);
        setDeedsFact(null);
        setAccessIntel(null);
        setPositionProfile(null);
        setPositionContext(null);
        setParcelNeighbors(null);
        setDiscoverPins([]);
        if (property.countyFips) {
          track("archie_parcel_opened", { county_fips: property.countyFips });
        }
        // Keep search / frames county aligned with the opened parcel.
        if (property.source && property.source !== countyLockRef.current.filterSource) {
          setSource(property.source);
          void refreshFolders(property.source);
        }
        void loadMatches(property);
        /* DC-1…5 — flood · utilities · environment · deeds dark; retract when userReveal false. */
        if (
          property.countyFips &&
          property.centroidLat != null &&
          property.centroidLng != null
        ) {
          const fips = property.countyFips;
          const lat = property.centroidLat;
          const lng = property.centroidLng;
          void shiFloodAtPoint({ countyFips: fips, lat, lng })
            .then((body) => {
              setFloodFact(body.flood?.userReveal ? body.flood : null);
            })
            .catch(() => {
              setFloodFact(null);
            });
          void shiUtilitiesAtPoint({ countyFips: fips, lat, lng })
            .then((body) => {
              setUtilitiesFact(
                body.utilities?.userReveal ? body.utilities : null,
              );
            })
            .catch(() => {
              setUtilitiesFact(null);
            });
          if (researchMode === "multifamily") {
            void shiMultifamilyParcel({
              propId: property.propId,
              source: property.source,
              countyFips: fips,
              lat,
              lng,
              acres: property.legalAcreage,
              address: property.situsAddress,
              ownerName: property.ownerName,
            })
              .then((body) => setMfRead(body.read))
              .catch(() => setMfRead(null));
          }
          void shiEnvironmentAtPoint({ countyFips: fips, lat, lng })
            .then((body) => {
              setEnvironmentDesk(body.environment ?? null);
            })
            .catch(() => {
              setEnvironmentDesk(null);
            });
          void shiDeedsForParcel({
            countyFips: fips,
            propId: property.propId,
            lat,
            lng,
          })
            .then((body) => {
              setDeedsFact(body.deeds?.userReveal ? body.deeds : null);
            })
            .catch(() => {
              setDeedsFact(null);
            });
          /* R1 — Access desk facts inside Research (same APIs as Corridors). */
          if (isLaunchCorridorFips(fips)) {
            setAccessLoading(true);
            void shiCorridorsParcelLocation({
              propId: property.propId,
              source: property.source,
              countyFips: fips,
              lat,
              lng,
            })
              .then((body) => {
                setAccessIntel(body.intel ?? null);
                setPositionProfile(body.profile ?? null);
                setPositionContext(body.context ?? null);
              })
              .catch(() => {
                setAccessIntel(null);
                setPositionProfile(null);
                setPositionContext(null);
              })
              .finally(() => {
                setAccessLoading(false);
              });
            /* N1 — CAD polygon neighbors (soft-fail empty). */
            void shiParcelNeighbors({
              propId: property.propId,
              source: property.source,
              countyFips: fips,
              cadOwnerId: property.cadOwnerId,
            })
              .then((body) => {
                setParcelNeighbors(body.neighbors ?? null);
              })
              .catch(() => {
                setParcelNeighbors(null);
              });
          } else {
            setAccessIntel(null);
            setPositionProfile(null);
            setPositionContext(null);
            setParcelNeighbors(null);
            setAccessLoading(false);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load property");
      } finally {
        setLoadingProperty(false);
      }
    },
    [loadMatches, refreshFolders, researchMode],
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
    writeWorkspaceSnapshot({ source: next });
    void refreshFolders(next);
  }

  function createFrame(boundary: DrawnBoundary): boolean {
    if (frames.length >= SHI_CAPS.maxFramesOnMap) {
      setAreaError(
        `Map frame limit (${SHI_CAPS.maxFramesOnMap}). Remove a frame first.`,
      );
      return false;
    }
    if (!source) {
      setAreaError("Pick a county before drawing market frames");
      return false;
    }
    const cap = validateBoundaryCaps(boundary);
    if (!cap.ok) {
      setAreaError(cap.error);
      return false;
    }
    const n = frameSeq.current++;
    const name = `Frame ${n}`;
    const localId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `frame-${n}-${Date.now()}`;
    const frame: ShiLocalFrame = {
      localId,
      countySource: source,
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
    setSheetSnap("expanded");
    return true;
  }

  function onFramesChange(next: ShiLocalFrame[]) {
    setFrames(next);
    const stillActive =
      activeFrameId != null && next.some((f) => f.localId === activeFrameId);
    if (!stillActive) {
      setActiveFrameId(null);
      setAnalysis(null);
      setAreaError("");
    }
    // Allow Vault → Research reopen of the same memory after remove.
    if (
      openedFrameRef.current &&
      !next.some(
        (f) =>
          f.savedId === openedFrameRef.current ||
          f.localId === openedFrameRef.current,
      )
    ) {
      openedFrameRef.current = null;
    }
  }

  async function runAreaAnalyze() {
    const active = frames.find((f) => f.localId === activeFrameId);
    if (!active) {
      setAreaError("Select or draw a market frame first");
      return;
    }
    const frameCounty = active.countySource || source;
    if (!frameCounty) {
      setAreaError("Pick a county before analyzing");
      return;
    }
    // Keep the search selector aligned with the frame's locked county.
    if (frameCounty !== source) {
      setSource(frameCounty);
      void refreshFolders(frameCounty);
    }
    setAnalyzing(true);
    setAreaError("");
    setWorthALook(null);
    setLookCandidates([]);
    try {
      const result = await shiAnalyzeArea({
        boundary: active.boundary,
        source: frameCounty,
      });
      setAnalysis(result);
      setFrames((prev) =>
        prev.map((f) =>
          f.localId === active.localId
            ? { ...f, countySource: frameCounty, analysis: result }
            : f,
        ),
      );
      const fips =
        AVAILABLE_COUNTIES.find((c) => c.source === frameCounty)?.fips || "";
      if (
        fips &&
        isLaunchCorridorFips(fips) &&
        result.parcels.length > 0
      ) {
        setWorthLoading(true);
        try {
          const look = await shiWorthALook({
            countyFips: fips,
            parcels: result.parcels.slice(0, 48).map((p) => ({
              propId: p.propId,
              lat: p.centroidLat,
              lng: p.centroidLng,
              acres: p.legalAcreage,
            })),
            objective: lookObjectiveRef.current,
          });
          setLookCandidates(look.candidates ?? []);
          setWorthALook(
            look.candidates?.length
              ? pickFromCandidates(look.candidates, {
                  objective: lookObjectiveRef.current,
                })
              : look.worthALook,
          );
        } catch {
          setWorthALook(null);
          setLookCandidates([]);
        } finally {
          setWorthLoading(false);
        }
      }
    } catch (e) {
      setAnalysis(null);
      setWorthALook(null);
      setLookCandidates([]);
      setAreaError(e instanceof Error ? e.message : "Area analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function createFolder(
    name: string,
    countyForFolder?: string,
  ): Promise<ShiStudyFolder> {
    const county = countyForFolder || source;
    if (!county) throw new Error("Pick a county first");
    const folder = await shiCreateFolder({ name, countySource: county });
    await refreshFolders(county);
    if (county !== source) {
      setSource(county);
    }
    return folder;
  }

  async function saveActiveAsFarm(name: string) {
    const active = frames.find((f) => f.localId === activeFrameId);
    if (!active) throw new Error("Select a market frame first");
    if (!active.analysis) throw new Error("Analyze the frame before saving");
    const county = active.countySource || source;
    if (!county) throw new Error("Pick a county before saving a farm");
    setSaving(true);
    setAreaError("");
    try {
      const view = mapRef.current?.getView();
      const countyLabel =
        AVAILABLE_COUNTIES.find((c) => c.source === county)?.name ?? countyName;
      await shiCreateFarm({
        name,
        countySource: county,
        countyName: countyLabel,
        boundary: active.boundary,
        mapCenterLat: view?.centerLat,
        mapCenterLng: view?.centerLng,
        mapZoom: view?.zoom,
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveActiveFrame(name: string, folderId: string) {
    const active = frames.find((f) => f.localId === activeFrameId);
    if (!active) throw new Error("Select a market frame first");
    if (!active.analysis) throw new Error("Analyze the frame before saving");
    setSaving(true);
    setAreaError("");
    try {
      // Map Memory: fit frame → snap → downscale to vault byte cap → restore camera.
      let thumb =
        (await mapRef.current?.captureMapMemory(active.boundary)) ??
        mapRef.current?.captureThumbnail() ??
        null;
      if (thumb) {
        try {
          thumb = await fitThumbnailDataUrl(thumb);
        } catch {
          /* keep original snap */
        }
      }
      const view = mapRef.current?.getView();
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
        researchMode,
      });
      const savedCounty =
        saved.snapshot?.metrics?.countySource || active.countySource;
      setFrames((prev) =>
        prev.map((f) =>
          f.localId === active.localId
            ? {
                ...f,
                savedId: saved.id,
                folderId: saved.folderId,
                countySource: savedCounty,
                name: saved.name,
                acronym: saved.acronym,
                analysis: saved.snapshot
                  ? ({
                      ...saved.snapshot.metrics,
                      parcels: saved.snapshot.metrics.parcels ?? [],
                    } as ShiAreaAnalysis)
                  : f.analysis,
              }
            : f,
        ),
      );
      if (saved.snapshot?.metrics) {
        setAnalysis({
          ...(saved.snapshot.metrics as ShiAreaAnalysis),
          parcels: saved.snapshot.metrics.parcels ?? [],
        });
      }
      await refreshFolders(savedCounty || source);
    } catch (e) {
      setAreaError(formatShiVaultError(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }

  function loadSavedFrame(frame: ShiSavedFrame) {
    const localId = frame.id;
    const countyFromSnap = frame.snapshot?.metrics?.countySource || "";
    const existing = frames.find(
      (f) => f.savedId === frame.id || f.localId === frame.id,
    );
    if (existing) {
      setActiveFrameId(existing.localId);
      if (countyFromSnap && countyFromSnap !== source) {
        setSource(countyFromSnap);
        void refreshFolders(countyFromSnap);
      }
    } else {
      if (frames.length >= SHI_CAPS.maxFramesOnMap) {
        setAreaError(`Map frame limit (${SHI_CAPS.maxFramesOnMap}).`);
        return;
      }
      const local: ShiLocalFrame = {
        localId,
        savedId: frame.id,
        folderId: frame.folderId,
        countySource: countyFromSnap || source,
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
      if (local.countySource && local.countySource !== source) {
        setSource(local.countySource);
        void refreshFolders(local.countySource);
      }
    }
    if (frame.snapshot?.metrics) {
      setAnalysis({
        ...(frame.snapshot.metrics as ShiAreaAnalysis),
        parcels: frame.snapshot.metrics.parcels ?? [],
      });
    }
    mapRef.current?.fitBoundary(frame.boundary);
  }

  function clearOpenFrameParams() {
    const params = new URLSearchParams(searchParams.toString());
    if (
      !params.has("openFrame") &&
      !params.has("folderId") &&
      !params.has("handoff") &&
      !params.has("t")
    ) {
      return;
    }
    params.delete("openFrame");
    params.delete("folderId");
    params.delete("handoff");
    params.delete("t");
    const q = params.toString();
    const base = pathname?.includes("/intelligence")
      ? "/portal/intelligence"
      : "/portal/intelligence";
    router.replace(q ? `${base}?${q}` : base, { scroll: false });
  }

  // Prospects → Research hand-off via ?propId=&source= (& optional focus=discover)
  useEffect(() => {
    const propId = searchParams.get("propId")?.trim() || "";
    const src = searchParams.get("source")?.trim() || "";
    const countyFips = searchParams.get("countyFips")?.trim() || "";
    const focus = searchParams.get("focus")?.trim() || "";
    if (!propId) return;
    const key = `${src}:${propId}:${focus}`;
    if (openedPropRef.current === key) return;
    openedPropRef.current = key;
    void openProperty({
      propId,
      source: src || undefined,
      countyFips: countyFips || undefined,
    }).finally(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("propId");
      params.delete("source");
      params.delete("countyFips");
      params.delete("focus");
      // Keep section= out of research URL
      params.delete("section");
      const q = params.toString();
      router.replace(
        q ? `/portal/intelligence?${q}` : "/portal/intelligence",
        { scroll: false },
      );
      if (focus === "discover") {
        window.setTimeout(() => {
          document
            .getElementById("archie-discover")
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 120);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Study Vault / Corridors → Research hand-off: sessionStorage + ?openFrame= / ?handoff=
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const applyFrame = (frame: ShiSavedFrame) => {
      if (cancelled) return;
      // Sticky only while that memory is still on the map.
      if (
        openedFrameRef.current === frame.id &&
        frames.some(
          (f) => f.savedId === frame.id || f.localId === frame.id,
        )
      ) {
        setReopening(false);
        return;
      }
      openedFrameRef.current = frame.id;
      onRestoreResearchMode?.(
        researchModeFromSaved(frame.snapshot?.metrics?.researchMode),
      );
      const fromMetrics = frame.snapshot?.metrics?.countySource;
      if (fromMetrics) {
        setSource(fromMetrics);
        void refreshFolders(fromMetrics);
      }
      timer = window.setTimeout(() => {
        if (!cancelled) {
          loadSavedFrame(frame);
          setReopening(false);
        }
      }, 120);
    };

    const queued = consumeOpenSavedFrame();
    if (queued?.boundary) {
      setReopening(true);
      applyFrame(queued);
      clearOpenFrameParams();
      // Drop Corridors handoff query noise after consume.
      const params = new URLSearchParams(searchParams.toString());
      if (params.has("handoff") || params.has("t")) {
        params.delete("handoff");
        params.delete("t");
        const q = params.toString();
        router.replace(q ? `/portal/intelligence?${q}` : "/portal/intelligence", {
          scroll: false,
        });
      }
      return () => {
        cancelled = true;
        if (timer) window.clearTimeout(timer);
      };
    }

    const openFrame = searchParams.get("openFrame")?.trim() || "";
    if (!openFrame) return;

    setReopening(true);
    void (async () => {
      try {
        const frame = await shiGetFrame(openFrame);
        if (cancelled || !frame?.boundary) {
          if (!cancelled) setReopening(false);
          return;
        }
        applyFrame(frame);
      } catch (e) {
        if (!cancelled) {
          setReopening(false);
          setAreaError(
            e instanceof Error ? e.message : "Could not reopen saved frame",
          );
        }
      } finally {
        if (!cancelled) clearOpenFrameParams();
      }
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectedFresh =
    selected &&
    freshness.find(
      (c) =>
        c.countyFips === selected.countyFips ||
        c.countyName === selected.countyName,
    );

  const activeFrame = frames.find((f) => f.localId === activeFrameId) ?? null;

  const launchFips =
    selected?.countyFips ||
    AVAILABLE_COUNTIES.find((c) => c.source === source)?.fips ||
    "";

  const ensureAccessStations = useCallback(async () => {
    if (!launchFips || !isLaunchCorridorFips(launchFips)) return;
    if (accessStations.length > 0) return;
    try {
      const body = await shiCorridorsTraffic(launchFips);
      setAccessSegments(body.segments ?? []);
      setAccessStations(body.stations ?? []);
    } catch {
      /* Ask still works with empty stations */
    }
  }, [launchFips, accessStations.length]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    const tab = searchParams.get("accessTab");
    if (mode === "access") {
      void ensureAccessStations();
      if (tab === "sites" || tab === "compare" || tab === "ask") {
        setAccessDeskTab(tab);
      }
    }
  }, [searchParams, ensureAccessStations]);

  /* P2 — load planning stations for Archie spatial brief when a launch-county parcel is open */
  useEffect(() => {
    if (!selected) return;
    if (!launchFips || !isLaunchCorridorFips(launchFips)) return;
    void ensureAccessStations();
  }, [selected?.propId, launchFips, ensureAccessStations, selected]);

  const propertyCompare = useMemo(() => {
    if (comparePicks.length < 2) return null;
    return comparePropertySites(
      comparePicks.map((pick) => ({
        pick,
        intel: compareIntelById[pick.propId] ?? null,
        position: comparePositionById[pick.propId] ?? null,
      })),
      accessStations,
      researchMode,
    );
  }, [comparePicks, compareIntelById, comparePositionById, accessStations, researchMode]);

  const runAsk = useCallback(
    (q: string) => {
      void ensureAccessStations();
      const pick: CorridorParcelPick | null =
        selected &&
        selected.centroidLat != null &&
        selected.centroidLng != null
          ? {
              propId: selected.propId,
              source: selected.source,
              countyFips: selected.countyFips ?? undefined,
              situsAddress: selected.situsAddress,
              ownerName: selected.ownerName,
              legalAcreage: selected.legalAcreage,
              marketValue: selected.marketValue,
              lat: selected.centroidLat,
              lng: selected.centroidLng,
              geojson: null,
            }
          : null;
      const answer = answerCorridorAsk(q, {
        countyName:
          selected?.countyName ||
          AVAILABLE_COUNTIES.find((c) => c.source === source)?.name ||
          "County",
        stations: accessStations,
        watchAreas: [],
        selectedParcel: pick,
        selectedStation: null,
        parcelIntel: accessIntel,
        rankedSites,
        hasAnalysisBoundary: Boolean(activeFrame?.boundary),
        compareCount: comparePicks.length,
        flood: floodFact,
        utilities: utilitiesFact,
        environment: environmentDesk,
      });
      setAskAnswer(answer);
      if (answer.hint === "run_strongest") setAccessDeskTab("sites");
      if (answer.hint === "open_compare") setAccessDeskTab("compare");
    },
    [
      ensureAccessStations,
      selected,
      source,
      accessStations,
      accessIntel,
      rankedSites,
      activeFrame?.boundary,
      comparePicks.length,
      floodFact,
      utilitiesFact,
      environmentDesk,
    ],
  );

  const findStrongestSites = useCallback(async () => {
    if (!activeFrame?.boundary) {
      setStrongestNote("Select or draw a market frame first.");
      return;
    }
    if (!launchFips || !isLaunchCorridorFips(launchFips)) {
      setStrongestNote("Strongest Sites works in the launch 7 counties.");
      return;
    }
    setStrongestLoading(true);
    setStrongestNote(`Reviewing this study area for ${RESEARCH_MODES[researchMode].displayName}…`);
    try {
      const body = await shiCorridorsStrongestSites({
        countyFips: launchFips,
        boundary: activeFrame.boundary,
        limit: 24,
        lens: "mode",
      });
      const sites = body.sites.length
        ? await shiAttachPositionToRankedSites(body.sites, launchFips)
        : body.sites;
      const review = modeReviewFromRankedFacts(researchMode, sites, {
        parcelCount: body.parcelCount,
        totalAcres: activeFrame.analysis?.totalAcres ?? null,
        medianAcres: activeFrame.analysis?.medianAcres ?? null,
      });
      const ordered = review.items
        .map((item) => sites.find((s) => s.propId === item.propId))
        .filter((s): s is RankedSite => Boolean(s));
      setRankedSites(ordered);
      setModeReview(review);
      if (researchMode === "multifamily" && activeFrame?.boundary) {
        try {
          const mf = await shiMultifamilyReview({
            countyFips: launchFips,
            boundary: activeFrame.boundary,
          });
          setMfReview(mf.review);
          setStrongestNote(
            `${mf.review.parcelsReviewed.toLocaleString("en-US")} parcels reviewed. ${mf.review.closerStudyCount.toLocaleString("en-US")} have enough land and evidence for closer study.`,
          );
        } catch {
          setMfReview(null);
          setStrongestNote(
            ordered.length
              ? review.excludedWhy ||
                  review.tieNote ||
                  `${review.reviewLabel}: ${ordered.length} of ${body.parcelCount.toLocaleString("en-US")} parcels have enough evidence for this question.`
              : review.excludedWhy || "Not enough evidence to review sites in this outline.",
          );
        }
      } else {
        setMfReview(null);
        setStrongestNote(
          ordered.length
            ? review.excludedWhy ||
                review.tieNote ||
                `${review.reviewLabel}: ${ordered.length} of ${body.parcelCount.toLocaleString("en-US")} parcels have enough evidence for this question.`
            : review.excludedWhy || "Not enough evidence to review sites in this outline.",
        );
      }
      setAccessDeskTab("sites");
      void ensureAccessStations();
    } catch (e) {
      setRankedSites([]);
      setModeReview(null);
      setStrongestNote(
        e instanceof Error
          ? e.message
          : "Could not review sites for this area.",
      );
    } finally {
      setStrongestLoading(false);
    }
  }, [activeFrame?.boundary, activeFrame?.analysis, launchFips, ensureAccessStations, researchMode]);

  const onToggleCompareFromSite = useCallback(
    (site: RankedSite) => {
      const pick: CorridorParcelPick = {
        propId: site.propId,
        source: site.source,
        lat: site.lat,
        lng: site.lng,
        situsAddress: site.situsAddress,
        ownerName: site.ownerName,
        legalAcreage: site.legalAcreage,
        marketValue: site.marketValue,
      };
      setComparePicks((prev) => {
        const next = toggleCompareSite(prev, pick);
        const added =
          next.some((p) => p.propId === pick.propId) &&
          !prev.some((p) => p.propId === pick.propId);
        const removed =
          prev.some((p) => p.propId === pick.propId) &&
          !next.some((p) => p.propId === pick.propId);
        if (removed) {
          setCompareIntelById((map) => {
            const { [pick.propId]: _drop, ...rest } = map;
            return rest;
          });
          setComparePositionById((map) => {
            const { [pick.propId]: _drop, ...rest } = map;
            return rest;
          });
        }
        if (added) {
          if (site.intel) {
            setCompareIntelById((map) => ({
              ...map,
              [pick.propId]: site.intel ?? null,
            }));
          }
          if (site.position) {
            setComparePositionById((map) => ({
              ...map,
              [pick.propId]: site.position ?? null,
            }));
          } else if (launchFips) {
            void shiCorridorsParcelLocation({
              propId: pick.propId,
              source: pick.source,
              countyFips: launchFips,
              lat: pick.lat,
              lng: pick.lng,
            })
              .then((body) => {
                setCompareIntelById((map) => ({
                  ...map,
                  [pick.propId]: body.intel ?? null,
                }));
                setComparePositionById((map) => ({
                  ...map,
                  [pick.propId]: body.position ?? null,
                }));
              })
              .catch(() => {
                /* Soft-fail — acres still compare. */
              });
          }
        }
        return next;
      });
    },
    [launchFips],
  );

  useEffect(() => {
    if (rankedSites.length === 0) return;
    const review = modeReviewFromRankedFacts(researchMode, rankedSites, {
      parcelCount: analysis?.parcelCount,
      totalAcres: analysis?.totalAcres ?? null,
      medianAcres: analysis?.medianAcres ?? null,
    });
    const ordered = review.items
      .map((item) => rankedSites.find((s) => s.propId === item.propId))
      .filter((s): s is RankedSite => Boolean(s));
    setModeReview(review);
    if (researchMode !== "multifamily") setMfReview(null);
    if (ordered.length && ordered.map((s) => s.propId).join() !== rankedSites.map((s) => s.propId).join()) {
      setRankedSites(ordered);
    }
  }, [researchMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const onModeChip = useCallback(
    (chip: ResearchModeChip) => {
      if (chip.action === "site_review") {
        setAccessDeskTab("sites");
        void findStrongestSites();
        return;
      }
      if (chip.action === "compare") {
        setAccessDeskTab("compare");
        return;
      }
      if (chip.action === "similar") {
        document.getElementById("archie-discover")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
      if (chip.action === "owner") {
        document.getElementById("archie-owner-matches")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
      if (chip.ask) runAsk(chip.ask);
    },
    [findStrongestSites, runAsk],
  );

  const sheetCtx = workspaceContext({
    hasProperty: Boolean(selected),
    hasFrame: Boolean(activeFrame?.boundary),
    hasAnalysis: Boolean(analysis || mfReview || modeReview),
    askOpen: accessDeskTab === "ask" && Boolean(askAnswer),
  });

  const researchHeader = (
          <div className="min-w-0">
            <p className="truncate font-serif text-base font-bold text-ink">
              {sheetCtx === "property"
                ? "Property review"
                : sheetCtx === "analysis"
                  ? RESEARCH_MODES[researchMode].reviewLabel
                  : sheetCtx === "frame"
                    ? "Area study"
                    : RESEARCH_MODES[researchMode].displayName}
            </p>
            <p className="truncate text-[11px] text-[var(--muted)]">
              {sheetCtx === "idle"
                ? WORKSPACE_COPY.idleTitle
                : sheetCtx === "property"
                  ? selected?.situsAddress ||
                    selected?.legalDescription ||
                    `CAD #${selected?.propId}`
                  : sheetCtx === "analysis"
                    ? strongestNote ||
                      (analysis
                        ? `${analysis.parcelCount.toLocaleString("en-US")} parcels in this area`
                        : "")
                    : sheetCtx === "frame"
                      ? activeFrame?.name ?? "Drawn area"
                      : "Ask Archie"}
            </p>
          </div>
  );

  return (
    <div
      data-research-workspace={RESEARCH_WORKSPACE_VERSION}
      data-workspace-layout={layout}
      data-map-expanded={expandedMap ? "true" : "false"}
    >
      <div data-workspace-stage>
      <div data-map-pane>
      <ShiWorkspaceBar
        mode={researchMode}
        searchOpen={searchOpen}
        expandedMap={expandedMap}
        onToggleExpandedMap={() => setExpandedMap((v) => !v)}
        onExit={() => {
          setExpandedMap(false);
          onChangeResearchMode?.();
        }}
        onSearch={() => {
          setSearchOpen((v) => !v);
          setSheetSnap("expanded");
        }}
        onMenu={() => setWorkspaceMenu((v) => !v)}
      />
      {workspaceMenu ? (
        <div
          data-workspace-menu-panel
          className="pointer-events-auto absolute top-[3.65rem] right-2 z-40 w-56 space-y-1 rounded-xl story-glass p-2"
        >
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-ink hover:bg-white/5"
            onClick={() => {
              setWorkspaceMenu(false);
              setExpandedMap(false);
              onChangeResearchMode?.();
            }}
          >
            Change research mode
          </button>
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-ink hover:bg-white/5"
            onClick={() => {
              setWorkspaceMenu(false);
              onOpenVault?.();
            }}
          >
            Study Vault
          </button>
          <button
            type="button"
            className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-ink hover:bg-white/5"
            onClick={() => {
              setWorkspaceMenu(false);
              onOpenFarms?.();
            }}
          >
            Farms
          </button>
        </div>
      ) : null}
      {searchOpen ? (
        <section
          data-workspace-search
          className="pointer-events-auto absolute top-[4.75rem] left-2 z-40 w-[min(100%-1rem,22rem)] max-h-[min(70%,28rem)] overflow-y-auto story-glass rounded-xl p-3"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Search className="h-4 w-4 text-gold" />
            Search
          </h3>
          <form onSubmit={runSearch} className="mt-3 shrink-0 space-y-2">
            <label className="block text-[11px] font-semibold text-[var(--muted)]">
              County
              <select
                value={source}
                onChange={(e) => onCountyChange(e.target.value)}
                className="field-input mt-1 h-auto py-2"
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
                className="field-input mt-1 h-auto py-2"
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
                className="field-input mt-1 h-auto py-2"
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

          <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto">
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
      ) : null}

        <ShiResearchMap
          ref={mapRef}
          selected={selected}
          related={matches}
          initialView={savedMapView}
          onViewChange={persistMapView}
          discoverPins={discoverPins}
          lookPins={worthALook ?? EMPTY_WORTH}
          frames={frames}
          activeFrameId={activeFrameId}
          canDrawFrames={Boolean(source)}
          onFramesChange={onFramesChange}
          onActiveFrameIdChange={setActiveFrameId}
          onCreateFrame={createFrame}
          onSelectParcel={openFromMap}
          accessTrafficOn={accessTrafficOn}
          accessTrafficLoading={accessTrafficLoading}
          accessSegments={accessSegments}
          accessStations={accessStations}
          onAccessTrafficToggle={() => {
            const next = !accessTrafficOn;
            setAccessTrafficOn(next);
            if (!next) return;
            const fips =
              selected?.countyFips ||
              AVAILABLE_COUNTIES.find((c) => c.source === source)?.fips ||
              "";
            if (!fips || !isLaunchCorridorFips(fips)) {
              setAreaError(
                "Traffic overlay works in the launch 7 counties — pick a launch county parcel first.",
              );
              setAccessTrafficOn(false);
              return;
            }
            if (accessSegments.length > 0) return;
            setAccessTrafficLoading(true);
            void shiCorridorsTraffic(fips)
              .then((body) => {
                setAccessSegments(body.segments ?? []);
                setAccessStations(body.stations ?? []);
              })
              .catch(() => {
                setAccessSegments([]);
                setAccessStations([]);
                setAreaError("Could not load traffic overlay for this county.");
                setAccessTrafficOn(false);
              })
              .finally(() => {
                setAccessTrafficLoading(false);
              });
          }}
          className="absolute inset-0 h-full w-full min-h-0"
        />

      {activeFrame?.boundary && !analysis ? (
        <div
          data-workspace-frame-toast
          className="pointer-events-auto absolute top-[4.75rem] left-2 z-20 max-w-[18rem] rounded-xl story-glass px-3 py-2"
        >
          <p className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
            {WORKSPACE_COPY.frameReady}
          </p>
          <p className="mt-0.5 text-[12px] text-ink">{activeFrame.name}</p>
          <button
            type="button"
            onClick={() => void runAreaAnalyze()}
            disabled={analyzing}
            className="mt-2 inline-flex h-8 items-center rounded-lg bg-navy px-3 text-[11px] font-bold text-gold disabled:opacity-50"
          >
            {analyzing ? "Analyzing…" : WORKSPACE_COPY.analyzeCta}
          </button>
        </div>
      ) : null}

      </div>
      <ShiResearchPanelHost
        layout={layout}
        snap={sheetSnap}
        onSnap={setSheetSnap}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        drawerWidthPx={drawerW}
        context={sheetCtx}
        header={researchHeader}
      >
          {loadingProperty ? (
            <div className="mt-8 flex justify-center text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !selected ? (
            <div data-workspace-idle className="space-y-3">
              {researchMode === "multifamily" ? (
                <div data-multifamily-landing>
                  <p className="text-sm text-[var(--muted)]">
                    {WORKSPACE_COPY.idleBody}
                  </p>
                </div>
              ) : (
              <p className="text-sm text-[var(--muted)]">
                {WORKSPACE_COPY.idleBody}
              </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-gold/40 px-3 py-1.5 font-mono text-[10px] font-bold text-gold uppercase"
                  onClick={() => {
                    setSearchOpen(true);
                    setSheetSnap("expanded");
                  }}
                >
                  Search
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-gold/40 px-3 py-1.5 font-mono text-[10px] font-bold text-gold uppercase"
                  onClick={() => onOpenVault?.()}
                >
                  Open study
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-1 space-y-4">
              <div data-property-identity>
                <p className="text-sm font-semibold text-ink">
                  {selected.ownerName || "Owner not listed"}
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                  {[
                    acres(selected.legalAcreage),
                    selected.countyName,
                    selected.propertyCategory,
                  ]
                    .filter((part) => part && part !== "—")
                    .join(" · ")}
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
                  {selected.absentAt ? (
                    <Chip
                      stale
                      label="Missing from latest full pull"
                    />
                  ) : null}
                </div>
                {selected.absentAt ? (
                  <p className="mt-2 text-[10px] leading-relaxed text-[var(--muted)]">
                    Archie marked this parcel absent on a full-county CAD pull
                    (not a deed or sale). Cleared automatically when seen again.
                  </p>
                ) : null}
              </div>

              <ShiArchieIntelligencePanel
                property={selected}
                exactOwnerCount={exactCount}
                possibleOwnerCount={possibleCount}
                matches={matches}
                accessIntel={accessIntel}
                stations={accessStations}
                parcelNeighbors={parcelNeighbors}
                onFocusOwnership={() => {
                  ownerPortfolioRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
                }}
                onFocusNearby={() => {
                  ownerPortfolioRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
                }}
                onAskAccess={() => {
                  setAccessDeskTab("ask");
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("mode", "access");
                  params.set("accessTab", "ask");
                  const q = params.toString();
                  router.replace(
                    q ? `${pathname}?${q}` : `${pathname}?mode=access`,
                    { scroll: false },
                  );
                }}
              />

              {researchMode === "multifamily" ? (
                <ShiMultifamilyRead read={mfRead} />
              ) : null}

              {selected.countyFips &&
              isLaunchCorridorFips(selected.countyFips) ? (
                <ShiParcelPositionCard
                  profile={positionProfile}
                  context={positionContext}
                  neighbors={parcelNeighbors}
                  propId={selected.propId}
                />
              ) : null}

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
                  label="Abstract / subdiv"
                  value={selected.abstractSubdivisionCode ?? "—"}
                  mono
                />
                <Fact
                  label="Tract / lot"
                  value={selected.tractOrLot ?? "—"}
                  mono
                />
                <Fact
                  label="City / ZIP"
                  value={
                    [selected.situsCity, selected.situsZip]
                      .filter(Boolean)
                      .join(" ") || "—"
                  }
                />
                <Fact
                  label="First seen"
                  value={
                    selected.firstSeenAt
                      ? selected.firstSeenAt.slice(0, 10)
                      : "—"
                  }
                  mono
                />
                <Fact
                  label="Last seen"
                  value={
                    selected.lastSeenAt
                      ? selected.lastSeenAt.slice(0, 10)
                      : "—"
                  }
                  mono
                />
              </dl>

              <div ref={ownerPortfolioRef} id="archie-owner-matches">
                <h4 className="flex items-center gap-2 text-xs font-bold text-ink">
                  <Users className="h-3.5 w-3.5 text-gold" />
                  Owner portfolio
                </h4>
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  {exactCount} exact · {possibleCount} possible related
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
                  Properties associated with this owner in this county. Exact =
                  same owner id. Possible = normalized name only — not confirmed
                  the same person. {matchNote}
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

              {selected.ownershipChurn ? (
                <div className="story-well border-gold/35 bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] p-3">
                  <p className="font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
                    Ownership Stability Index
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
                    Familiar 300–850 scale for how quiet CAD owner fields look
                    across Archie&apos;s pulls. Not a credit score. Not a
                    prediction the owner will sell. Not deed history.
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-serif text-3xl font-bold text-ink">
                        {selected.ownershipChurn.index ?? "—"}
                      </p>
                      <p className="text-xs font-semibold text-ink">
                        {selected.ownershipChurn.bandLabel}
                      </p>
                    </div>
                    <p className="text-right font-mono text-[10px] text-[var(--muted)]">
                      {selected.ownershipChurn.ownerChangeCount} owner-field
                      <br />
                      change
                      {selected.ownershipChurn.ownerChangeCount === 1
                        ? ""
                        : "s"}{" "}
                      observed
                    </p>
                  </div>
                  <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[10px] text-[var(--muted)]">
                    {selected.ownershipChurn.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <ShiFloodEvidencePanel flood={floodFact} />
              <ShiUtilitiesEvidencePanel utilities={utilitiesFact} />
              <ShiEnvironmentEvidencePanel environment={environmentDesk} />
              <ShiDeedsEvidencePanel deeds={deedsFact} />
              {selected.countyFips &&
              isLaunchCorridorFips(selected.countyFips) ? (
                <ShiResearchAccessPanel
                  intel={accessIntel}
                  loading={accessLoading}
                  stations={accessStations}
                  lat={selected.centroidLat}
                  lng={selected.centroidLng}
                />
              ) : null}

              <ShiCadEvidencePanel
                property={selected}
                frameAnalysis={analysis}
              />

              <div>
                <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                  Observed CAD history
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
                  Values, county pull observations, and owner-field changes
                  Archie saw between loads — not deed or sale dates.
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

              <ShiDiscoverPanel
                key={`${selected.source}:${selected.propId}`}
                property={selected}
                onOpenProperty={(opts) => void openProperty(opts)}
                onDiscoverPinsChange={setDiscoverPins}
                onPortfolioRelated={setMatches}
                onOpenFarms={onOpenFarms}
              />

              <div className="space-y-2 border-t border-hairline pt-3">
                <p className="font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
                  Private workspace
                </p>
                <p className="text-[10px] leading-relaxed text-[var(--muted)]">
                  Save this public property into your Prospects pipeline. Notes
                  and status stay private — Archie never writes county records.
                </p>
                <button
                  type="button"
                  disabled={savingProspect}
                  onClick={() => {
                    setSavingProspect(true);
                    setProspectMsg("");
                    void shiAddProspect({
                      source: selected.source,
                      propId: selected.propId,
                      countyFips: selected.countyFips,
                      countyName: selected.countyName,
                      label:
                        selected.situsAddress ||
                        selected.legalDescription ||
                        `Property ${selected.propId}`,
                      ownerName: selected.ownerName,
                      situsAddress: selected.situsAddress,
                      situsCity: selected.situsCity,
                      legalAcreage: selected.legalAcreage,
                      marketValue: selected.marketValue,
                      centroidLat: selected.centroidLat,
                      centroidLng: selected.centroidLng,
                    })
                      .then((res) => {
                        setProspectMsg(
                          res.created
                            ? "Saved to Prospects."
                            : "Already in Prospects — opened existing.",
                        );
                      })
                      .catch((e) =>
                        setProspectMsg(
                          e instanceof Error
                            ? e.message
                            : "Could not save prospect",
                        ),
                      )
                      .finally(() => setSavingProspect(false));
                  }}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gold text-sm font-bold text-navy disabled:opacity-60"
                >
                  {savingProspect ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Save Prospect
                </button>
                {prospectMsg ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-ink">{prospectMsg}</p>
                    <button
                      type="button"
                      onClick={() =>
                        router.replace("/portal/intelligence?section=prospects", {
                          scroll: false,
                        })
                      }
                      className="text-[11px] font-semibold text-gold underline-offset-2 hover:underline"
                    >
                      Open Prospects
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )}

      <ShiCountyChangeFeed
        source={source}
        onOpenProperty={(opts) => void openProperty(opts)}
      />

      {launchFips && isLaunchCorridorFips(launchFips) ? (
        <ShiResearchAccessDesk
          tab={accessDeskTab}
          onTabChange={setAccessDeskTab}
          askAnswer={askAnswer}
          onAsk={runAsk}
          hasActiveFrame={Boolean(activeFrame?.boundary)}
          strongestLoading={strongestLoading}
          strongestNote={strongestNote}
          rankedSites={rankedSites}
          onFindStrongest={() => void findStrongestSites()}
          onToggleCompareSite={onToggleCompareFromSite}
          comparePropIds={new Set(comparePicks.map((p) => p.propId))}
          compare={propertyCompare}
          onClearCompare={() => {
            setComparePicks([]);
            setCompareIntelById({});
            setComparePositionById({});
          }}
          researchMode={researchMode}
          modeReview={modeReview}
          mfReview={mfReview}
          onChip={onModeChip}
        />
      ) : null}

      {reopening ? (
        <div className="flex items-center gap-2 story-well px-3 py-2 text-xs font-semibold text-navy">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Opening Map Memory from Study Vault…
        </div>
      ) : null}

      <ShiMarketFramesPanel
        countySource={source}
        countyName={countyName}
        frames={frames}
        activeFrameId={activeFrameId}
        onSelectFrame={(id) => {
          setActiveFrameId(id);
          const f = frames.find((x) => x.localId === id);
          setAnalysis(f?.analysis ?? null);
          setWorthALook(null);
          setLookCandidates([]);
          setAreaError("");
          if (f?.boundary) mapRef.current?.fitBoundary(f.boundary);
        }}
        analysis={analysis}
        analyzing={analyzing}
        analyzeError={areaError}
        onAnalyze={() => void runAreaAnalyze()}
        worthALook={worthALook}
        worthLoading={worthLoading}
        lookObjective={lookObjective}
        onLookObjective={(next) => {
          setLookObjective(next);
          if (lookCandidates.length > 0) {
            setWorthALook(
              pickFromCandidates(lookCandidates, { objective: next }),
            );
          }
        }}
        onOpenProperty={(opts) => {
          void openProperty({
            propId: opts.propId,
            source: opts.source,
            nearLat: opts.lat ?? undefined,
            nearLng: opts.lng ?? undefined,
          });
        }}
        folders={folders}
        onCreateFolder={createFolder}
        onSaveActive={saveActiveFrame}
        onSaveAsFarm={saveActiveAsFarm}
        saving={saving}
        onOpenVault={() => onOpenVault?.()}
        onOpenFarms={() => onOpenFarms?.()}
      />
      </ShiResearchPanelHost>
      </div>
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
