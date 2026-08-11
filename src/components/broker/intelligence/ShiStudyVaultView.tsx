"use client";

import { useEffect, useState } from "react";
import {
  FolderPlus,
  Loader2,
  Pencil,
  Trash2,
  MapPinned,
} from "lucide-react";
import {
  queueOpenSavedFrame,
  shiCreateFolder,
  shiDeleteFolder,
  shiDeleteFrame,
  shiListFolders,
  shiListFrames,
  shiRenameFolder,
  shiRenameFrame,
  shiThumbnailUrl,
} from "@/lib/shi/client";
import { AVAILABLE_COUNTIES } from "@/lib/supabase/parcels";
import type { ShiSavedFrame, ShiStudyFolder } from "@/lib/shi/types";
import { SHI_CAPS } from "@/lib/shi/caps";
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
  onOpenInResearch: () => void;
};

/**
 * Study Vault — private county folders + saved Market Frames.
 * Owner-only APIs; rename/delete; reopen onto Research cockpit.
 */
export function ShiStudyVaultView({ onOpenInResearch }: Props) {
  const [countySource, setCountySource] = useState("");
  const [folders, setFolders] = useState<ShiStudyFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<ShiStudyFolder | null>(null);
  const [frames, setFrames] = useState<ShiSavedFrame[]>([]);
  const [framesLoading, setFramesLoading] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  async function refreshFolders(source?: string) {
    setLoading(true);
    setError("");
    try {
      setFolders(await shiListFolders(source || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load vault");
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshFolders(countySource);
  }, [countySource]);

  async function loadFolder(folder: ShiStudyFolder) {
    setActiveFolder(folder);
    setFramesLoading(true);
    setError("");
    try {
      const list = await shiListFrames(folder.id);
      setFrames(list);
      const next: Record<string, string> = {};
      await Promise.all(
        list.map(async (f) => {
          const path = f.snapshot?.thumbnailPath;
          if (!path) return;
          try {
            const url = await shiThumbnailUrl(path);
            if (url) next[f.id] = url;
          } catch {
            /* optional */
          }
        }),
      );
      setThumbs(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load frames");
      setFrames([]);
    } finally {
      setFramesLoading(false);
    }
  }

  async function createFolder() {
    if (!folderName.trim() || !countySource) return;
    setBusy(true);
    setError("");
    try {
      const folder = await shiCreateFolder({
        name: folderName.trim(),
        countySource,
      });
      setFolderName("");
      await refreshFolders(countySource);
      await loadFolder(folder);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create folder");
    } finally {
      setBusy(false);
    }
  }

  async function renameFolder(folder: ShiStudyFolder) {
    const name = window.prompt("Rename folder", folder.name);
    if (!name?.trim()) return;
    setBusy(true);
    try {
      const updated = await shiRenameFolder({
        folderId: folder.id,
        name: name.trim(),
      });
      await refreshFolders(countySource);
      if (activeFolder?.id === folder.id) setActiveFolder(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeFolder(folder: ShiStudyFolder) {
    if (
      !window.confirm(
        `Delete folder “${folder.name}” and all saved frames inside? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await shiDeleteFolder(folder.id);
      if (activeFolder?.id === folder.id) {
        setActiveFolder(null);
        setFrames([]);
      }
      await refreshFolders(countySource);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function renameFrame(frame: ShiSavedFrame) {
    const name = window.prompt("Rename frame", frame.name);
    if (!name?.trim()) return;
    setBusy(true);
    try {
      await shiRenameFrame({ frameId: frame.id, name: name.trim() });
      if (activeFolder) await loadFolder(activeFolder);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeFrame(frame: ShiSavedFrame) {
    if (!window.confirm(`Delete saved frame “${frame.name}”?`)) return;
    setBusy(true);
    try {
      await shiDeleteFrame(frame.id);
      if (activeFolder) await loadFolder(activeFolder);
      await refreshFolders(countySource);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  function openInResearch(frame: ShiSavedFrame) {
    queueOpenSavedFrame(frame);
    onOpenInResearch();
  }

  const countyName =
    AVAILABLE_COUNTIES.find((c) => c.source === countySource)?.name ??
    "All counties";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-bold text-ink">Study Vault</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Private folders by county · thumbnails · reopen onto Research.
            Limit {SHI_CAPS.maxFoldersPerAgent} folders ·{" "}
            {SHI_CAPS.maxFramesPerFolder} frames each.
          </p>
        </div>
        <label className="block text-[11px] font-semibold text-[var(--muted)]">
          Filter county
          <select
            value={countySource}
            onChange={(e) => {
              setCountySource(e.target.value);
              setActiveFolder(null);
              setFrames([]);
            }}
            className="mt-1 block min-w-[12rem] rounded-lg border border-hairline bg-[var(--surface)] px-2.5 py-2 text-sm text-ink"
          >
            <option value="">All counties</option>
            {AVAILABLE_COUNTIES.map((c) => (
              <option key={c.source} value={c.source}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="text-xs font-semibold text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-4">
          <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
            Folders · {countyName}
          </p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void createFolder();
            }}
          >
            <input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="New folder"
              disabled={!countySource || busy}
              className="min-w-0 flex-1 rounded-lg border border-hairline bg-[var(--background)] px-2.5 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={!countySource || busy || !folderName.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-navy px-2.5 text-xs font-bold text-gold disabled:opacity-50"
              title={!countySource ? "Pick a county to create a folder" : "Add"}
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Add
            </button>
          </form>
          {!countySource ? (
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              Pick a county to create a new folder. You can still browse all
              saved folders below.
            </p>
          ) : null}

          {loading ? (
            <div className="mt-6 flex justify-center text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : folders.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--muted)]">
              No study folders yet. Save a Market Frame from Research, or create
              one here.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {folders.map((f) => (
                <li key={f.id}>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-2 py-2",
                      activeFolder?.id === f.id
                        ? "border-gold bg-gold/10"
                        : "border-hairline",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void loadFolder(f)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-navy">
                        <span className="font-mono text-[11px] font-extrabold text-gold">
                          {f.acronym}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-ink">
                          {f.name}
                        </span>
                        <span className="block truncate text-[11px] text-[var(--muted)]">
                          {f.countyName} · {f.frameCount} frames
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void renameFolder(f)}
                      className="rounded-lg p-1.5 text-navy hover:bg-navy/10"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeFolder(f)}
                      className="rounded-lg p-1.5 text-red-700 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-4">
          {!activeFolder ? (
            <p className="py-16 text-center text-sm text-[var(--muted)]">
              Open a folder to browse saved Market Frames.
            </p>
          ) : framesLoading ? (
            <div className="flex justify-center py-16 text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : frames.length === 0 ? (
            <p className="py-16 text-center text-sm text-[var(--muted)]">
              Empty folder. Analyze a frame in Research, then Save to Vault.
            </p>
          ) : (
            <>
              <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                {activeFolder.name} · {frames.length} frames
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {frames.map((f) => {
                  const metrics = f.snapshot?.metrics;
                  const capped = Boolean(metrics?.capped);
                  return (
                    <li
                      key={f.id}
                      className="overflow-hidden rounded-2xl border border-hairline bg-[var(--background)]"
                    >
                      <div
                        className="relative aspect-[16/10] bg-navy/10"
                        style={{ background: f.color }}
                      >
                        {thumbs[f.id] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbs[f.id]}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-mono text-2xl font-extrabold text-white/90">
                              {f.acronym}
                            </span>
                          </div>
                        )}
                        {capped ? (
                          <span className="absolute top-2 right-2 rounded bg-gold px-1.5 py-0.5 font-mono text-[9px] font-bold text-navy uppercase">
                            Capped
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-2 p-3">
                        <div>
                          <p className="truncate text-sm font-bold text-ink">
                            {f.name}
                          </p>
                          <p className="text-[11px] text-[var(--muted)]">
                            {metrics
                              ? `${metrics.parcelCount} parcels · ${money(metrics.estimatedTotalMarketValue)}`
                              : "No snapshot metrics"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => openInResearch(f)}
                            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-navy px-2 py-1.5 text-[11px] font-bold text-gold"
                          >
                            <MapPinned className="h-3.5 w-3.5" />
                            Open in Research
                          </button>
                          <button
                            type="button"
                            onClick={() => void renameFrame(f)}
                            className="rounded-lg border border-hairline px-2 py-1.5 text-navy hover:bg-navy/5"
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeFrame(f)}
                            className="rounded-lg border border-hairline px-2 py-1.5 text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
