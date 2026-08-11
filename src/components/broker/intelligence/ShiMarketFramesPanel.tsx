"use client";

import { useState } from "react";
import { FolderPlus, Loader2, PlaySquare, Save } from "lucide-react";
import { SHI_CAPS } from "@/lib/shi/caps";
import type {
  ShiAreaAnalysis,
  ShiLocalFrame,
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
  foldersLoading: boolean;
  onCreateFolder: (name: string) => Promise<void>;
  onOpenFolder: (folder: ShiStudyFolder) => Promise<void>;
  openFolder: ShiStudyFolder | null;
  savedFrames: ShiSavedFrame[];
  onSaveActive: (name: string, folderId: string) => Promise<void>;
  onLoadSaved: (frame: ShiSavedFrame) => void;
  saving: boolean;
};

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
  foldersLoading,
  onCreateFolder,
  onOpenFolder,
  openFolder,
  savedFrames,
  onSaveActive,
  onLoadSaved,
  saving,
}: Props) {
  const [folderName, setFolderName] = useState("");
  const [frameName, setFrameName] = useState("");
  const [busy, setBusy] = useState(false);
  const active = frames.find((f) => f.localId === activeFrameId) ?? null;

  return (
    <div className="space-y-4 rounded-2xl border border-hairline bg-[var(--surface)] p-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
          <PlaySquare className="h-4 w-4 text-gold" />
          Market Frames
        </h3>
        <p className="mt-1 text-[11px] text-[var(--muted)]">
          Draw many boxes on the map · analyze on demand · save to county
          folders. {countySource ? countyName : "Pick a county first."}
        </p>
      </div>

      {/* Session frames */}
      <div>
        <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
          On map ({frames.length}/{SHI_CAPS.maxFramesOnMap})
        </p>
        {frames.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Use <strong>Box</strong>, <strong>Freehand</strong>, or{" "}
            <strong>Radius</strong> on the map to add a frame.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {frames.map((f) => (
              <li key={f.localId}>
                <button
                  type="button"
                  onClick={() => onSelectFrame(f.localId)}
                  className={cn(
                    "flex h-14 w-14 flex-col items-center justify-center rounded-xl border-2 text-center shadow-sm",
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

      <button
        type="button"
        onClick={onAnalyze}
        disabled={analyzing || !active || !countySource}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-navy text-sm font-bold text-gold disabled:opacity-50"
      >
        {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Analyze active frame
      </button>
      {analyzeError ? (
        <p className="text-xs font-semibold text-red-700">{analyzeError}</p>
      ) : null}

      {analysis ? (
        <div className="space-y-2">
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <Stat label="Parcels" value={String(analysis.parcelCount)} />
            <Stat
              label="Est. area value"
              value={money(analysis.estimatedTotalMarketValue)}
            />
            <Stat label="Valued parcels" value={String(analysis.valuedParcelCount)} />
            <Stat
              label="Median market"
              value={money(analysis.medianMarketValue)}
            />
            <Stat
              label="Total acres"
              value={analysis.totalAcres.toLocaleString("en-US", {
                maximumFractionDigits: 1,
              })}
            />
            <Stat
              label="Real / Personal"
              value={`${analysis.realCount}/${analysis.personalCount}`}
            />
          </dl>
          <p className="text-[10px] text-[var(--muted)]">{analysis.note}</p>
          {analysis.parcels.length > 0 ? (
            <ul className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-hairline">
              {analysis.parcels.slice(0, 40).map((p) => (
                <li
                  key={`${p.source}:${p.propId}`}
                  className="flex items-start justify-between gap-2 px-2 py-1.5 text-[11px]"
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
          ) : null}
        </div>
      ) : null}

      {/* Folders */}
      <div className="border-t border-hairline pt-3">
        <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
          Study folders · {countyName || "county"}
        </p>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!folderName.trim() || !countySource) return;
            setBusy(true);
            void onCreateFolder(folderName.trim())
              .then(() => setFolderName(""))
              .finally(() => setBusy(false));
          }}
        >
          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="New folder name"
            disabled={!countySource}
            className="min-w-0 flex-1 rounded-lg border border-hairline bg-[var(--background)] px-2.5 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !countySource}
            className="inline-flex items-center gap-1 rounded-lg bg-navy/10 px-2.5 text-xs font-bold text-navy disabled:opacity-50"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Add
          </button>
        </form>

        {foldersLoading ? (
          <p className="mt-2 text-xs text-[var(--muted)]">Loading folders…</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {folders.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => void onOpenFolder(f)}
                  className={cn(
                    "flex h-16 w-16 flex-col items-center justify-center rounded-xl border bg-navy text-center shadow-sm",
                    openFolder?.id === f.id
                      ? "border-gold ring-2 ring-gold/40"
                      : "border-navy",
                  )}
                  title={f.name}
                >
                  <span className="font-mono text-sm font-extrabold text-gold">
                    {f.acronym}
                  </span>
                  <span className="mt-0.5 max-w-[3.5rem] truncate px-1 text-[9px] text-white/80">
                    {f.frameCount} frames
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Save active */}
      {active && analysis && openFolder ? (
        <form
          className="space-y-2 border-t border-hairline pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const name = frameName.trim() || active.name;
            setBusy(true);
            void onSaveActive(name, openFolder.id)
              .then(() => setFrameName(""))
              .finally(() => setBusy(false));
          }}
        >
          <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
            Save capture → {openFolder.acronym}
          </p>
          <input
            value={frameName}
            onChange={(e) => setFrameName(e.target.value)}
            placeholder={active.name}
            className="w-full rounded-lg border border-hairline bg-[var(--background)] px-2.5 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving || busy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-navy text-sm font-bold text-navy disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save frame + data + map image
          </button>
        </form>
      ) : null}

      {/* Saved in open folder */}
      {openFolder && savedFrames.length > 0 ? (
        <div>
          <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
            In {openFolder.name}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {savedFrames.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => onLoadSaved(f)}
                  className="flex h-16 w-16 flex-col items-center justify-center rounded-xl border border-hairline text-center shadow-sm"
                  style={{ background: f.color }}
                  title={`${f.name} · reopen`}
                >
                  <span className="font-mono text-[11px] font-extrabold text-white">
                    {f.acronym}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--background)] px-2.5 py-2">
      <dt className="font-mono text-[9px] font-bold tracking-wider text-[var(--muted)] uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-xs font-semibold text-ink">{value}</dd>
    </div>
  );
}
