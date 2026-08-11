"use client";

import { useState } from "react";
import { FolderPlus, Loader2, PlaySquare, Save } from "lucide-react";
import { SHI_CAPS } from "@/lib/shi/caps";
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
  onCreateFolder: (name: string) => Promise<ShiStudyFolder | void>;
  onSaveActive: (name: string, folderId: string) => Promise<void>;
  saving: boolean;
  onOpenVault: () => void;
};

/**
 * Wide Market Frames strip under the 3-split research row.
 * Left: frame tiles + actions · Right: market data (fills the void).
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
  saving,
  onOpenVault,
}: Props) {
  const [frameName, setFrameName] = useState("");
  const [folderId, setFolderId] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = frames.find((f) => f.localId === activeFrameId) ?? null;

  return (
    <div className="rounded-2xl border border-hairline bg-[var(--surface)] p-4">
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

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
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
                      title={f.name}
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
              disabled={analyzing || !active || !countySource}
              className="inline-flex h-9 min-w-[9rem] flex-1 items-center justify-center gap-2 rounded-xl bg-navy text-xs font-bold text-gold disabled:opacity-50"
            >
              {analyzing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Analyze active
            </button>
            <button
              type="button"
              onClick={() => setShowSave((v) => !v)}
              disabled={!active || !analysis || !countySource}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-navy px-3 text-xs font-bold text-navy disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Save to Vault
            </button>
          </div>

          {analyzeError ? (
            <p className="text-xs font-semibold text-red-700">{analyzeError}</p>
          ) : null}

          {showSave && active && analysis ? (
            <form
              className="space-y-2 rounded-xl border border-hairline bg-[var(--background)] p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const name = frameName.trim() || active.name;
                setBusy(true);
                void (async () => {
                  try {
                    let id = folderId;
                    if (!id && newFolder.trim()) {
                      const created = await onCreateFolder(newFolder.trim());
                      id = created?.id ?? "";
                    }
                    if (!id) throw new Error("Pick or create a folder");
                    await onSaveActive(name, id);
                    setFrameName("");
                    setNewFolder("");
                    setShowSave(false);
                    onOpenVault();
                  } catch {
                    /* parent surfaces areaError */
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                Save capture → Study Vault
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
                {folders
                  .filter((f) => f.countySource === countySource)
                  .map((f) => (
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
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-navy text-xs font-bold text-gold disabled:opacity-50"
              >
                {saving || busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save + open Vault
              </button>
            </form>
          ) : null}
        </div>

        {/* Right: market data fills the void */}
        <div className="min-h-[140px] rounded-xl border border-hairline bg-[var(--background)] p-3">
          {!analysis ? (
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
              <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 xl:grid-cols-6">
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
              {analysis.parcels.length > 0 ? (
                <ul className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-hairline">
                  {analysis.parcels.slice(0, 60).map((p) => (
                    <li
                      key={`${p.source}:${p.propId}`}
                      className="flex items-start justify-between gap-2 px-2.5 py-1.5 text-[11px]"
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
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--muted)]">
                  No valued parcels inside this frame.
                </p>
              )}
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
