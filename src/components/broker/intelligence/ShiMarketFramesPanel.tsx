"use client";

import { useEffect, useState } from "react";
import { FolderPlus, Loader2, PlaySquare, Save } from "lucide-react";
import { useStorySoundOptional } from "@/components/sound/SoundProvider";
import { SHI_CAPS } from "@/lib/shi/caps";
import { formatShiVaultError } from "@/lib/shi/vault-errors";
import type { WorthALookItem } from "@/lib/shi/parcel-position-area";
import {
  POSITION_OBJECTIVES,
  POSITION_OBJECTIVE_LABEL,
  POSITION_OBJECTIVE_NOTE,
  type PositionObjective,
} from "@/lib/shi/parcel-position-objective";
import { PARCEL_POSITION_COPY } from "@/lib/shi/parcel-position";
import type {
  ShiAreaAnalysis,
  ShiLocalFrame,
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

type Props = {
  countySource: string;
  countyName: string;
  frames: ShiLocalFrame[];
  activeFrameId: string | null;
  onSelectFrame: (id: string) => void;
  analysis: ShiAreaAnalysis | null;
  analyzing: boolean;
  analyzeError: string;
  onAnalyze: () => void;
  folders: ShiStudyFolder[];
  onCreateFolder: (
    name: string,
    countySource?: string,
  ) => Promise<ShiStudyFolder | void>;
  onSaveActive: (name: string, folderId: string) => Promise<void>;
  /** SHI-4 — persist analyzed frame as a watched territory. */
  onSaveAsFarm?: (name: string) => Promise<void>;
  saving: boolean;
  onOpenVault: () => void;
  onOpenFarms?: () => void;
  worthALook?: WorthALookItem[] | null;
  worthLoading?: boolean;
  lookObjective?: PositionObjective;
  onLookObjective?: (objective: PositionObjective) => void;
  onOpenProperty?: (opts: {
    propId: string;
    source?: string;
    lat?: number | null;
    lng?: number | null;
  }) => void;
};

/**
 * Market Frames — lives in the Research card (drawer or sheet).
 * Always one column so tablet/desktop cards stay readable.
 */
export function ShiMarketFramesPanel({
  countySource,
  countyName,
  frames,
  activeFrameId,
  onSelectFrame,
  analysis,
  analyzing,
  analyzeError,
  onAnalyze,
  folders,
  onCreateFolder,
  onSaveActive,
  onSaveAsFarm,
  saving,
  onOpenVault,
  onOpenFarms,
  worthALook = null,
  worthLoading = false,
  lookObjective = "road_position",
  onLookObjective,
  onOpenProperty,
}: Props) {
  const [frameName, setFrameName] = useState("");
  const [folderId, setFolderId] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [showFarm, setShowFarm] = useState(false);
  const [farmName, setFarmName] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const sound = useStorySoundOptional();
  const active = frames.find((f) => f.localId === activeFrameId) ?? null;
  const frameCounty = active?.countySource || countySource;
  const countyFolders = folders.filter((f) => f.countySource === frameCounty);

  // Drop stale folder selection when county / active frame changes.
  useEffect(() => {
    setFolderId("");
    setNewFolder("");
    setSaveError("");
  }, [frameCounty, activeFrameId]);

  return (
    <div className="story-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            <PlaySquare className="h-4 w-4 text-gold" />
            Market Frames
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            Box · Freehand · Radius on the map
            {countySource ? ` · ${countyName}` : " · pick a county first"}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenVault}
          className="rounded-lg border border-hairline px-2.5 py-1 text-[11px] font-bold text-navy hover:bg-navy/5"
        >
          Study Vault →
        </button>
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-4">
        {/* Left: frames + actions */}
        <div className="space-y-3">
          <div>
            <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
              On map ({frames.length}/{SHI_CAPS.maxFramesOnMap})
            </p>
            {frames.length === 0 ? (
              <p className="mt-1.5 text-xs text-[var(--muted)]">
                Draw a frame on the map to analyze.
              </p>
            ) : (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {frames.map((f) => (
                  <li key={f.localId}>
                    <button
                      type="button"
                      onClick={() => onSelectFrame(f.localId)}
                      className={cn(
                        "flex h-12 w-12 flex-col items-center justify-center rounded-xl border-2 text-center shadow-sm",
                        f.localId === activeFrameId
                          ? "border-gold"
                          : "border-transparent",
                      )}
                      style={{ background: f.color }}
                      title={`${f.name} · ${f.countySource || "no county"}`}
                    >
                      <span className="font-mono text-[11px] font-extrabold text-white">
                        {f.acronym}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAnalyze}
              disabled={analyzing || !active || !frameCounty}
              className="inline-flex h-9 min-w-[9rem] flex-1 items-center justify-center gap-2 rounded-xl bg-navy text-xs font-bold text-gold disabled:opacity-50"
            >
              {analyzing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Analyze active
            </button>
            <button
              type="button"
              onClick={() => {
                setSaveError("");
                setShowFarm(false);
                setShowSave((v) => !v);
              }}
              disabled={!active || !analysis || !frameCounty}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-navy px-3 text-xs font-bold text-navy disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Save to Vault
            </button>
            {onSaveAsFarm ? (
              <button
                type="button"
                onClick={() => {
                  setSaveError("");
                  setShowSave(false);
                  setFarmName(active?.name || "");
                  setShowFarm((v) => !v);
                }}
                disabled={!active || !analysis || !frameCounty}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-gold px-3 text-xs font-bold text-gold disabled:opacity-50"
              >
                Save as Farm
              </button>
            ) : null}
          </div>

          {active && active.countySource && active.countySource !== countySource ? (
            <p className="text-[11px] font-semibold text-navy">
              This frame is locked to its draw county. Analyze/Save will use
              that county (not the search dropdown).
            </p>
          ) : null}

          {analyzeError ? (
            <p className="text-xs font-semibold text-red-700">{analyzeError}</p>
          ) : null}
          {saveError ? (
            <p className="text-xs font-semibold text-red-700">{saveError}</p>
          ) : null}

          {showFarm && active && analysis && onSaveAsFarm ? (
            <form
              className="space-y-2 rounded-xl border border-gold/40 bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const name = farmName.trim() || active.name;
                setBusy(true);
                setSaveError("");
                void (async () => {
                  try {
                    await onSaveAsFarm(name);
                    sound?.play("success", "study");
                    setShowFarm(false);
                    setFarmName("");
                    onOpenFarms?.();
                  } catch (err) {
                    setSaveError(
                      err instanceof Error
                        ? err.message
                        : "Could not save farm",
                    );
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              <p className="font-mono text-[10px] font-bold text-gold uppercase">
                Save as Farm — watch this territory
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                Archie keeps the boundary and compares live county records to
                your review baseline. This is not a Study Vault snapshot.
              </p>
              <input
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder={active.name}
                className="w-full rounded-lg border border-hairline bg-[var(--surface)] px-2.5 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy || saving}
                className="story-press inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold text-xs font-bold text-navy disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Create farm
              </button>
            </form>
          ) : null}

          {showSave && active && analysis ? (
            <form
              className="space-y-2 story-well p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const name = frameName.trim() || active.name;
                setBusy(true);
                setSaveError("");
                void (async () => {
                  try {
                    let id = folderId;
                    if (id) {
                      const folderOk = countyFolders.some((f) => f.id === id);
                      if (!folderOk) {
                        throw new Error(
                          "Pick a folder in this frame’s county (or create a new one)",
                        );
                      }
                    } else if (newFolder.trim()) {
                      const created = await onCreateFolder(
                        newFolder.trim(),
                        frameCounty,
                      );
                      id = created?.id ?? "";
                    }
                    if (!id) throw new Error("Pick or create a folder");
                    await onSaveActive(name, id);
                    sound?.play("success", "study");
                    setFrameName("");
                    setNewFolder("");
                    setFolderId("");
                    setShowSave(false);
                    onOpenVault();
                  } catch (err) {
                    setSaveError(formatShiVaultError(err));
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                Save Map Memory → Study Vault
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                We snap your drawn frame at a readable distance — that image
                becomes the file in Study Vault.
              </p>
              <input
                value={frameName}
                onChange={(e) => setFrameName(e.target.value)}
                placeholder={active.name}
                className="w-full rounded-lg border border-hairline bg-[var(--surface)] px-2.5 py-2 text-sm"
              />
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-[var(--surface)] px-2.5 py-2 text-sm"
              >
                <option value="">Select folder…</option>
                {countyFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.acronym} — {f.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  placeholder="Or new folder name"
                  className="min-w-0 flex-1 rounded-lg border border-hairline bg-[var(--surface)] px-2.5 py-2 text-sm"
                />
                <span className="inline-flex items-center text-[10px] text-[var(--muted)]">
                  <FolderPlus className="mr-1 h-3.5 w-3.5" />
                  new
                </span>
              </div>
              <button
                type="submit"
                disabled={saving || busy || (!folderId && !newFolder.trim())}
                className="story-press inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy text-xs font-bold text-gold disabled:opacity-50"
              >
                {saving || busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saving || busy ? "Capturing Map Memory…" : "Save + open Vault"}
              </button>
            </form>
          ) : null}
        </div>

        {/* Right: market data fills the void */}
        <div className="min-h-[140px] story-well p-3">
          {analyzing ? (
            <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 px-4 text-center text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin text-navy" />
              <p className="text-sm font-semibold text-ink">Analyzing frame…</p>
              <p className="max-w-sm text-xs">
                Pulling parcel values inside your drawn market frame.
              </p>
            </div>
          ) : !analysis ? (
            <div className="flex h-full min-h-[140px] flex-col items-center justify-center px-4 text-center">
              <p className="text-sm font-semibold text-ink">Market data</p>
              <p className="mt-1 max-w-sm text-xs text-[var(--muted)]">
                Draw a Box, Freehand, or Radius · select the frame · hit Analyze.
                Parcel counts, area value, and the parcel list land here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {analysis.capped ? (
                <p className="rounded-lg bg-gold/20 px-2.5 py-1.5 text-[11px] font-bold text-navy">
                  Analysis capped — draw a smaller frame for a complete estimate.
                </p>
              ) : null}
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <Stat label="Parcels" value={String(analysis.parcelCount)} />
                <Stat
                  label="Est. area value"
                  value={money(analysis.estimatedTotalMarketValue)}
                />
                <Stat
                  label="Valued"
                  value={String(analysis.valuedParcelCount)}
                />
                <Stat
                  label="Median market"
                  value={money(analysis.medianMarketValue)}
                />
                <Stat
                  label="Acres"
                  value={analysis.totalAcres.toLocaleString("en-US", {
                    maximumFractionDigits: 1,
                  })}
                />
                <Stat
                  label="Real / Pers"
                  value={`${analysis.realCount}/${analysis.personalCount}`}
                />
              </dl>
              <p className="text-[10px] text-[var(--muted)]">{analysis.note}</p>
              {worthLoading ? (
                <p className="flex items-center gap-2 text-[11px] font-semibold text-navy">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Checking road position…
                </p>
              ) : null}
              {worthALook && (worthALook.length > 0 || onLookObjective) ? (
                <div
                  className="rounded-xl border border-gold/40 bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] p-3"
                  data-worth-a-look="p4"
                  data-look-objective="p5"
                >
                  <p className="font-mono text-[10px] font-bold text-gold uppercase">
                    {PARCEL_POSITION_COPY.worthALook}
                  </p>
                  {/* P4: not a score */}
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                    {POSITION_OBJECTIVE_NOTE[lookObjective]}
                  </p>
                  {onLookObjective ? (
                    <div
                      className="mt-2 flex flex-wrap gap-1.5"
                      data-look-objective-chips="p5"
                    >
                      <span className="self-center text-[10px] font-semibold text-[var(--muted)]">
                        Looking for
                      </span>
                      {POSITION_OBJECTIVES.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => onLookObjective(id)}
                          className={cn(
                            "min-h-11 rounded-lg border px-2.5 py-1 text-[11px] font-bold",
                            lookObjective === id
                              ? "border-gold bg-gold/20 text-navy"
                              : "border-hairline text-[var(--muted)] hover:border-gold/50",
                          )}
                        >
                          {POSITION_OBJECTIVE_LABEL[id]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {worthALook.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {worthALook.map((item) => (
                        <li key={`${item.source}:${item.propId}`}>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenProperty?.({
                                propId: item.propId,
                                source: item.source,
                                lat: item.lat,
                                lng: item.lng,
                              })
                            }
                            className="flex min-h-11 w-full flex-col justify-center rounded-lg border border-hairline bg-[var(--surface)] px-2.5 py-2 text-left hover:border-gold/60"
                          >
                            <p className="truncate text-[11px] font-semibold text-ink">
                              {item.situs || `Parcel ${item.propId}`}
                            </p>
                            <p className="truncate text-[10px] text-[var(--muted)]">
                              {item.headline}
                              {item.reasons.length
                                ? ` · ${item.reasons.map((r) => r.label).join(" · ")}`
                                : ""}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] text-[var(--muted)]">
                      Nothing in this draw matches that yet.
                    </p>
                  )}
                </div>
              ) : null}
              {analysis.parcels.length > 0 ? (
                <ul className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-hairline">
                  {analysis.parcels.slice(0, 60).map((p) => (
                    <li key={`${p.source}:${p.propId}`}>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenProperty?.({
                            propId: p.propId,
                            source: p.source,
                            lat: p.centroidLat,
                            lng: p.centroidLng,
                          })
                        }
                        className="flex w-full items-start justify-between gap-2 px-2.5 py-1.5 text-left text-[11px] hover:bg-[var(--surface)]"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">
                            {p.situsAddress || `Parcel ${p.propId}`}
                          </p>
                          <p className="truncate text-[var(--muted)]">
                            {p.ownerName || "—"} · {p.propId}
                          </p>
                        </div>
                        <span className="shrink-0 font-bold text-navy">
                          {money(p.marketValue)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {analysis.parcels.length > 60 ? (
                <p className="text-[10px] font-semibold text-[var(--muted)]">
                  Showing 60 of {analysis.parcels.length} parcels in this
                  analysis.
                </p>
              ) : null}
              {analysis.parcels.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">
                  No valued parcels inside this frame.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface)] px-2 py-1.5">
      <dt className="font-mono text-[9px] font-bold tracking-wider text-[var(--muted)] uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-xs font-semibold text-ink">{value}</dd>
    </div>
  );
}
