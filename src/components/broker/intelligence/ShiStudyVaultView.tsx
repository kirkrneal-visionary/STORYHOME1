"use client";

import { useEffect, useState } from "react";
import {
  FolderPlus,
  Loader2,
  Pencil,
  Trash2,
  MapPinned,
  X,
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
import { formatShiVaultError } from "@/lib/shi/vault-errors";
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
  onOpenInResearch: (frame: ShiSavedFrame) => void;
};

type VaultDialog =
  | { kind: "rename-folder"; folder: ShiStudyFolder; name: string }
  | { kind: "delete-folder"; folder: ShiStudyFolder }
  | { kind: "rename-frame"; frame: ShiSavedFrame; name: string }
  | { kind: "delete-frame"; frame: ShiSavedFrame };

/**
 * Study Vault — Map Memory album of saved market frames.
 * Snap-first cards (not acronym tiles). Owner-only APIs.
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
  const [dialog, setDialog] = useState<VaultDialog | null>(null);
  const [dialogError, setDialogError] = useState("");

  async function refreshFolders(source?: string) {
    setLoading(true);
    setError("");
    try {
      setFolders(await shiListFolders(source || undefined));
    } catch (e) {
      setError(formatShiVaultError(e));
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
      setError(formatShiVaultError(e));
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
      setError(formatShiVaultError(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDialog() {
    if (!dialog) return;
    setBusy(true);
    setDialogError("");
    setError("");
    try {
      if (dialog.kind === "rename-folder") {
        const name = dialog.name.trim();
        if (name.length < 2) {
          setDialogError("Folder name is required");
          return;
        }
        const updated = await shiRenameFolder({
          folderId: dialog.folder.id,
          name,
        });
        await refreshFolders(countySource);
        if (activeFolder?.id === dialog.folder.id) setActiveFolder(updated);
      } else if (dialog.kind === "delete-folder") {
        await shiDeleteFolder(dialog.folder.id);
        if (activeFolder?.id === dialog.folder.id) {
          setActiveFolder(null);
          setFrames([]);
        }
        await refreshFolders(countySource);
      } else if (dialog.kind === "rename-frame") {
        const name = dialog.name.trim();
        if (name.length < 2) {
          setDialogError("Frame name is required");
          return;
        }
        await shiRenameFrame({ frameId: dialog.frame.id, name });
        if (activeFolder) await loadFolder(activeFolder);
      } else if (dialog.kind === "delete-frame") {
        await shiDeleteFrame(dialog.frame.id);
        if (activeFolder) await loadFolder(activeFolder);
        await refreshFolders(countySource);
      }
      setDialog(null);
      setDialogError("");
    } catch (e) {
      setDialogError(formatShiVaultError(e));
    } finally {
      setBusy(false);
    }
  }

  function openInResearch(frame: ShiSavedFrame) {
    queueOpenSavedFrame(frame);
    onOpenInResearch(frame);
  }

  const countyName =
    AVAILABLE_COUNTIES.find((c) => c.source === countySource)?.name ??
    "All counties";

  const dialogTitle =
    dialog?.kind === "rename-folder"
      ? "Rename folder"
      : dialog?.kind === "delete-folder"
        ? "Delete folder"
        : dialog?.kind === "rename-frame"
          ? "Rename Map Memory"
          : dialog?.kind === "delete-frame"
            ? "Delete Map Memory"
            : "";

  const dialogBody =
    dialog?.kind === "delete-folder"
      ? `Delete folder “${dialog.folder.name}” and all saved frames inside? This cannot be undone.`
      : dialog?.kind === "delete-frame"
        ? `Delete saved frame “${dialog.frame.name}”? This cannot be undone.`
        : null;

  const isRename =
    dialog?.kind === "rename-folder" || dialog?.kind === "rename-frame";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-bold text-ink">Study Vault</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Your Map Memory album — each file is a snap of the market you drew.
            Limit {SHI_CAPS.maxFoldersPerAgent} folders ·{" "}
            {SHI_CAPS.maxFramesPerFolder} memories each.
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
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="story-surface p-4">
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
                      onClick={() => {
                        setDialogError("");
                        setDialog({
                          kind: "rename-folder",
                          folder: f,
                          name: f.name,
                        });
                      }}
                      className="rounded-lg p-1.5 text-navy hover:bg-navy/10"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDialogError("");
                        setDialog({ kind: "delete-folder", folder: f });
                      }}
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

        <section className="story-surface p-4">
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
                {activeFolder.name} · {frames.length} map memories
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {frames.map((f) => {
                  const metrics = f.snapshot?.metrics;
                  const capped = Boolean(metrics?.capped);
                  const hasSnap = Boolean(thumbs[f.id]);
                  return (
                    <li
                      key={f.id}
                      className="group overflow-hidden story-well transition-shadow"
                    >
                      <button
                        type="button"
                        onClick={() => openInResearch(f)}
                        className="relative block aspect-[16/10] w-full overflow-hidden bg-navy text-left"
                        title={`Open ${f.name} in Research`}
                      >
                        {hasSnap ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbs[f.id]}
                            alt={`Map Memory: ${f.name}`}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div
                            className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                            style={{ background: f.color }}
                          >
                            <span className="font-mono text-[10px] font-bold tracking-wider text-white/70 uppercase">
                              Map Memory pending
                            </span>
                            <span className="font-mono text-lg font-extrabold text-white/90">
                              {f.acronym}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/90 via-navy/45 to-transparent px-3 pt-10 pb-2.5">
                          <p className="truncate text-sm font-bold text-white">
                            {f.name}
                          </p>
                          <p className="truncate text-[11px] text-white/80">
                            {metrics
                              ? `${metrics.parcelCount} parcels · ${money(metrics.estimatedTotalMarketValue)}`
                              : "Open to re-analyze"}
                          </p>
                        </div>
                        {capped ? (
                          <span className="absolute top-2 right-2 rounded bg-gold px-1.5 py-0.5 font-mono text-[9px] font-bold text-navy uppercase">
                            Capped
                          </span>
                        ) : null}
                        <span className="absolute top-2 left-2 rounded bg-navy/70 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide text-gold uppercase backdrop-blur-sm">
                          Map Memory
                        </span>
                      </button>
                      <div className="flex flex-wrap gap-1.5 p-2.5">
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
                          onClick={() => {
                            setDialogError("");
                            setDialog({
                              kind: "rename-frame",
                              frame: f,
                              name: f.name,
                            });
                          }}
                          className="rounded-lg border border-hairline px-2 py-1.5 text-navy hover:bg-navy/5"
                          title="Rename"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDialogError("");
                            setDialog({ kind: "delete-frame", frame: f });
                          }}
                          className="rounded-lg border border-hairline px-2 py-1.5 text-red-700 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>

      {dialog ? (
        <div className="fixed inset-0 z-[1200] flex items-end justify-center story-scrim p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shi-vault-dialog-title"
            className="w-full max-w-md story-sheet p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h3
                id="shi-vault-dialog-title"
                className="font-serif text-xl font-bold text-ink"
              >
                {dialogTitle}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setDialog(null);
                  setDialogError("");
                }}
                disabled={busy}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {dialogBody ? (
              <p className="mt-3 text-sm text-[var(--muted)]">{dialogBody}</p>
            ) : null}

            {dialogError ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                {dialogError}
              </p>
            ) : null}

            {isRename ? (
              <label className="mt-4 block text-[11px] font-semibold text-[var(--muted)]">
                Name
                <input
                  autoFocus
                  value={
                    dialog.kind === "rename-folder" ||
                    dialog.kind === "rename-frame"
                      ? dialog.name
                      : ""
                  }
                  onChange={(e) => {
                    const name = e.target.value;
                    setDialog((prev) =>
                      prev &&
                      (prev.kind === "rename-folder" ||
                        prev.kind === "rename-frame")
                        ? { ...prev, name }
                        : prev,
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void confirmDialog();
                    }
                  }}
                  className="mt-1 block w-full rounded-lg border border-hairline bg-[var(--background)] px-3 py-2 text-sm text-ink"
                />
              </label>
            ) : null}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDialog(null);
                  setDialogError("");
                }}
                disabled={busy}
                className="h-11 flex-1 rounded-lg border border-hairline text-sm font-semibold text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDialog()}
                disabled={busy}
                className={cn(
                  "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-bold",
                  dialog.kind.startsWith("delete")
                    ? "bg-red-700 text-white"
                    : "bg-navy text-gold",
                )}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {dialog.kind.startsWith("delete") ? "Delete" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
