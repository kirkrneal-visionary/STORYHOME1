"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CountyStoryCamera } from "@/components/county-stories/CountyStoryCamera";
import { CountyStoryPanel, type CountyStoryPanelView } from "@/components/county-stories/CountyStoryPanel";
import {
  countyStoryCapacityCopy,
  countyStoryCapacityMark,
  countyStoryComposerMessage,
  countyStoryCountdown,
  countyStoryCountyName,
  countyStoryEligibleWhen,
} from "@/lib/county-stories/composer-copy";
import { SERVICE_COUNTIES } from "@/lib/markets";
import {
  createListingId,
  nextComposerStep,
  previousComposerStep,
  propertyChoices,
  publishAttemptKey,
  replaceListingCommand,
  showCreateStory,
  showReplaceStory,
  type CountyStoryComposerMode,
  type CountyStoryComposerStatus,
  type CountyStoryComposerStep,
  type CountyStoryPropertyChoice,
} from "@/lib/county-stories/composer-flow";
import {
  COUNTY_STORY_MEDIA_MAX_DURATION_MS,
  isCountyStoryDeclaredVideoType,
} from "@/lib/county-stories/media";
import {
  clearCountyStoryDraft,
  draftHasProgress,
  draftResume,
  readCountyStoryDraft,
  viewToCountyStoryDraft,
  writeCountyStoryDraft,
  type CountyStoryDraft,
} from "@/lib/county-stories/composer-draft";
import type { CountyStoryType } from "@/lib/county-stories/publish";

type Cue = { index: number; startMs: number; endMs: number; text: string };

const emptyView = (screen: CountyStoryComposerStep): CountyStoryPanelView => ({
  screen,
  mode: "create",
  hasSlot: false,
  countyFips: null,
  countyName: null,
  capacityLine: null,
  capacityNote: null,
  capacityFull: false,
  storyType: null,
  propertyChoice: null,
  listings: [],
  selectedListingId: null,
  currentListingLabel: null,
  slotNumber: null,
  replacementAvailable: false,
  playing: false,
  countdown: null,
  eligibleWhen: null,
  cueTexts: [],
  accessBasis: null,
  accessDescription: "",
  rulesChecked: false,
  videoUrl: null,
  processingNote: null,
  error: null,
  busy: false,
  recording: false,
  recordClock: null,
  showRetry: false,
  reviewReady: false,
  countyMarks: {},
  showingPauseReasons: false,
  removed: false,
  removalReason: null,
  pauseRemovals: [],
  resumeOffer: null,
  resumeLead: null,
  discardConfirm: false,
  draftNotice: null,
});

function declaredVideoType(file: File): string | null {
  const base = file.type.split(";")[0]?.trim() ?? "";
  if (isCountyStoryDeclaredVideoType(base)) return base;
  const name = file.name.toLowerCase();
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".webm")) return "video/webm";
  if (name.endsWith(".mov")) return "video/quicktime";
  return null;
}

function readDurationSeconds(file: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unread"));
    };
    video.src = url;
  });
}

function readRemoval(value: unknown): CountyStoryComposerStatus["removal"] {
  if (!value || typeof value !== "object") return null;
  const reason = (value as { reason?: unknown }).reason;
  return { reason: typeof reason === "string" && reason.trim() ? reason : null };
}

function readPauseRemovals(value: unknown): CountyStoryComposerStatus["pauseRemovals"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const date = (item as { date?: unknown }).date;
    const reason = (item as { reason?: unknown }).reason;
    if (typeof date !== "string" || !date.trim()) return [];
    if (typeof reason !== "string" || !reason.trim()) return [];
    return [{ date, reason }];
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function CountyStoryComposer({ ownerId = null }: { ownerId?: string | null }) {
  const [view, setView] = useState<CountyStoryPanelView>(emptyView("loading"));
  const [status, setStatus] = useState<CountyStoryComposerStatus | null>(null);
  const [cues, setCues] = useState<Cue[]>([]);
  const [revision, setRevision] = useState(0);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraHandoffRef = useRef(false);
  const mode: CountyStoryComposerMode = view.mode;

  const dropCameraHandoff = useCallback(() => {
    if (!cameraHandoffRef.current) return;
    cameraHandoffRef.current = false;
    setCameraOpen(false);
  }, []);

  const applyStatus = useCallback((next: CountyStoryComposerStatus, clock: Date) => {
    setStatus(next);
    const slot = next.slot;
    const resume = draftResume({
      draft: ownerId ? readCountyStoryDraft(ownerId) : null,
      suspended: next.suspended,
      hasSlot: !!slot,
      slotId: slot?.id ?? null,
      replacementAvailable: showReplaceStory(next),
    });
    setView((current) => ({
      ...current,
      screen: next.suspended || current.screen === "loading" ? (next.suspended ? "suspended" : "owned") : current.screen === "success" ? "success" : "owned",
      mode: slot ? "replace" : "create",
      hasSlot: !!slot,
      countyFips: slot?.countyFips ?? current.countyFips,
      countyName: slot ? countyStoryCountyName(slot.countyFips) : current.countyName,
      storyType: slot?.storyType ?? null,
      currentListingLabel: slot?.listingLabel ?? null,
      selectedListingId: null,
      slotNumber: slot?.slotNumber ?? null,
      replacementAvailable: showReplaceStory(next),
      playing: slot?.playing === true,
      countdown: next.eligibleAt ? countyStoryCountdown(next.eligibleAt, clock) : null,
      eligibleWhen: countyStoryEligibleWhen(next.eligibleAt),
      propertyChoice: null,
      showingPauseReasons: false,
      removed: next.removal !== null,
      removalReason: next.removal?.reason ?? null,
      pauseRemovals: next.pauseRemovals,
      resumeOffer: resume.kind === "none" ? null : resume.kind === "continue" ? "continue" : "blocked",
      resumeLead: resume.kind === "none" ? null : resume.lead,
      discardConfirm: false,
      draftNotice: null,
      rulesChecked: false,
      error: null,
      busy: false,
    }));
  }, [ownerId]);

  const loadStatus = useCallback(async () => {
    const response = await fetch("/api/county-stories/composer");
    const body = await readJson(response);
    if (response.status === 403) {
      setView((current) => ({ ...current, screen: "loading", error: null }));
      setStatus(null);
      return "denied" as const;
    }
    if (!response.ok || body.ok !== true) {
      setView((current) => ({
        ...current,
        screen: "loading",
        error: "County Stories could not be loaded. Try again.",
        showRetry: true,
      }));
      return "error" as const;
    }
    const next: CountyStoryComposerStatus = {
      ok: true,
      storyDay: String(body.storyDay ?? ""),
      suspended: body.suspended === true,
      eligibleAt: typeof body.eligibleAt === "string" ? body.eligibleAt : null,
      slot: (body.slot as CountyStoryComposerStatus["slot"]) ?? null,
      removal: readRemoval(body.removal),
      pauseRemovals: readPauseRemovals(body.pauseRemovals),
    };
    applyStatus(next, new Date());
    return "ok" as const;
  }, [applyStatus]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await loadStatus();
      if (cancelled) return;
      if (result === "denied") setView(emptyView("loading"));
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStatus]);

  useEffect(() => {
    if (view.screen !== "suspended") return;
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, [view.screen]);

  useEffect(() => {
    if (!ownerId) return;
    if (
      view.screen === "loading" ||
      view.screen === "owned" ||
      view.screen === "suspended" ||
      view.screen === "success"
    ) {
      return;
    }
    const draft = viewToCountyStoryDraft({
      mode: view.mode,
      slotId: view.mode === "replace" ? (status?.slot?.id ?? null) : null,
      screen: view.screen,
      countyFips: view.countyFips,
      storyType: view.storyType,
      propertyChoice: view.propertyChoice,
      selectedListingId: view.selectedListingId,
      mediaId,
      cueTexts: view.cueTexts,
      accessBasis: view.accessBasis,
      accessDescription: view.accessDescription,
    });
    if (!draftHasProgress(draft)) return;
    writeCountyStoryDraft(ownerId, draft);
  }, [mediaId, ownerId, status?.slot?.id, view]);

  useEffect(() => {
    if (!status?.eligibleAt || view.screen !== "suspended") return;
    setView((current) => ({
      ...current,
      countdown: countyStoryCountdown(status.eligibleAt as string, now),
    }));
  }, [now, status?.eligibleAt, view.screen]);

  const refreshCapacity = useCallback(async (countyFips: string) => {
    const response = await fetch(`/api/county-stories/capacity?county=${encodeURIComponent(countyFips)}`);
    const body = await readJson(response);
    const accepted = Number(body.accepted ?? 0);
    const max = Number(body.max ?? 30);
    const copy = countyStoryCapacityCopy(accepted, max);
    setView((current) => ({
      ...current,
      capacityLine: copy.line,
      capacityNote: copy.note,
      capacityFull: copy.full,
    }));
    return copy;
  }, []);

  useEffect(() => {
    if (!view.countyFips) return;
    if (view.screen !== "rules" && view.screen !== "type") return;
    void refreshCapacity(view.countyFips);
  }, [refreshCapacity, view.countyFips, view.screen]);

  useEffect(() => {
    if (view.screen !== "county") return;
    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        SERVICE_COUNTIES.map(async (county) => {
          try {
            const response = await fetch(`/api/county-stories/capacity?county=${encodeURIComponent(county.fips)}`);
            const body = await readJson(response);
            return [county.fips, countyStoryCapacityMark(Number(body.accepted ?? 0), Number(body.max ?? 30))] as const;
          } catch {
            return [county.fips, ""] as const;
          }
        }),
      );
      if (cancelled) return;
      setView((current) => ({ ...current, countyMarks: Object.fromEntries(entries) }));
    })();
    return () => {
      cancelled = true;
    };
  }, [view.screen]);

  useEffect(() => {
    if (view.screen !== "property" || !view.countyFips) return;
    const slot = status?.slot?.id;
    const query = slot ? `&slot=${encodeURIComponent(slot)}` : "";
    void fetch(`/api/county-stories/listings?county=${encodeURIComponent(view.countyFips)}${query}`)
      .then((response) => response.json())
      .then((body: { listings?: { id: string; label: string }[] }) => {
        setView((current) => ({ ...current, listings: body.listings ?? [] }));
      })
      .catch(() => {
        setView((current) => ({
          ...current,
          error: "Properties could not be loaded. You can continue without one, or try again.",
        }));
      });
  }, [status?.slot?.id, view.countyFips, view.screen]);

  const beginUpload = useCallback(async (file: File) => {
    const declared = declaredVideoType(file);
    if (!declared) {
      dropCameraHandoff();
      setView((current) => ({ ...current, error: countyStoryComposerMessage("INVALID_MEDIA_TYPE") }));
      return;
    }
    if (file.size <= 0) {
      dropCameraHandoff();
      setView((current) => ({ ...current, error: countyStoryComposerMessage("INVALID_MEDIA") }));
      return;
    }
    setView((current) => ({
      ...current,
      busy: true,
      error: null,
      screen: "processing",
      processingNote: null,
      reviewReady: false,
      showRetry: false,
    }));
    try {
      const seconds = await readDurationSeconds(file);
      if (Number.isFinite(seconds) && seconds * 1000 > COUNTY_STORY_MEDIA_MAX_DURATION_MS) {
        dropCameraHandoff();
        setView((current) => ({
          ...current,
          busy: false,
          screen: "capture",
          error: countyStoryComposerMessage("VIDEO_TOO_LONG"),
        }));
        return;
      }
    } catch {
      dropCameraHandoff();
      setView((current) => ({
        ...current,
        busy: false,
        screen: "capture",
        error: "This video could not be read. Try recording again or choose another video.",
      }));
      return;
    }
    const purpose = mode === "replace" ? "replacement" : "original";
    let staged: Response;
    try {
      staged = await fetch("/api/county-stories/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          contentType: declared,
          byteSize: file.size,
          uploadKey: crypto.randomUUID(),
        }),
      });
    } catch {
      dropCameraHandoff();
      setView((current) => ({
        ...current,
        busy: false,
        screen: "capture",
        error: "The upload did not finish. You can try again.",
        showRetry: false,
      }));
      return;
    }
    const stageBody = await readJson(staged);
    if (!staged.ok || typeof stageBody.uploadUrl !== "string" || typeof stageBody.id !== "string") {
      dropCameraHandoff();
      setView((current) => ({
        ...current,
        busy: false,
        screen: "capture",
        error: countyStoryComposerMessage(String(stageBody.code ?? "")),
      }));
      return;
    }
    const upload = await fetch(stageBody.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": declared, "x-upsert": "true" },
      body: file,
    });
    if (!upload.ok) {
      dropCameraHandoff();
      setView((current) => ({
        ...current,
        busy: false,
        screen: "capture",
        error: "The upload did not finish. You can try again.",
      }));
      return;
    }
    await fetch(`/api/county-stories/media/${stageBody.id}/validate`, { method: "POST" });
    setMediaId(stageBody.id);
    setView((current) => ({
      ...current,
      busy: false,
      screen: "processing",
      processingNote: null,
      reviewReady: false,
      videoUrl: null,
      showRetry: false,
    }));
  }, [dropCameraHandoff, mode]);

  useEffect(() => {
    if (view.screen !== "processing" || !mediaId) return;
    let stopped = false;
    const poll = async () => {
      const response = await fetch(`/api/county-stories/media/${mediaId}/preparation`);
      const body = await readJson(response);
      if (stopped || !response.ok) return;
      const phase = String(body.phase ?? "preparing");
      const nextCues = Array.isArray(body.cues) ? (body.cues as Cue[]) : [];
      if (phase === "failed") {
        if (cameraHandoffRef.current) {
          cameraHandoffRef.current = false;
          setCameraOpen(false);
        }
        setView((current) => ({
          ...current,
          processingNote: null,
          reviewReady: false,
          showRetry: true,
          error: null,
        }));
        return;
      }
      if (phase === "ready") {
        setCues(nextCues);
        setRevision(Number(body.captionRevision ?? 0));
        const playback = await fetch(`/api/county-stories/media/${mediaId}`);
        const playbackBody = await readJson(playback);
        const handoff = cameraHandoffRef.current;
        if (handoff) {
          cameraHandoffRef.current = false;
          setCameraOpen(false);
        }
        setView((current) => ({
          ...current,
          processingNote: null,
          reviewReady: true,
          showRetry: false,
          screen: handoff ? "review" : current.screen,
          videoUrl: typeof playbackBody.url === "string" ? playbackBody.url : current.videoUrl,
          cueTexts: nextCues.map((cue) => cue.text),
        }));
        return;
      }
      setView((current) => ({
        ...current,
        processingNote: null,
        reviewReady: false,
        showRetry: false,
      }));
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 3000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [mediaId, view.screen]);

  const publish = useCallback(async () => {
    if (!view.rulesChecked) {
      setView((current) => ({ ...current, error: countyStoryComposerMessage("RULES_REQUIRED") }));
      return;
    }
    if (!mediaId || !view.storyType || !view.countyFips || !status) return;
    if (view.mode === "create") {
      const listing = createListingId(view.propertyChoice ?? "none", view.selectedListingId);
      if (!listing.ok) {
        setView((current) => ({ ...current, error: listing.message }));
        return;
      }
      const copy = await refreshCapacity(view.countyFips);
      if (copy.full) {
        setView((current) => ({ ...current, error: countyStoryComposerMessage("COUNTY_FULL") }));
        return;
      }
      const scope = publishAttemptKey({
        mode: "create",
        storyDay: status.storyDay,
        slotId: null,
        mediaId,
        storyType: view.storyType,
        listingAction: null,
        listingId: listing.listingId,
      });
      const idempotencyKey = sessionStorage.getItem(scope) ?? crypto.randomUUID();
      sessionStorage.setItem(scope, idempotencyKey);
      setView((current) => ({ ...current, busy: true, error: null }));
      let response: Response;
      try {
        response = await fetch("/api/county-stories/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaId,
            countyFips: view.countyFips,
            storyType: view.storyType,
            listingId: listing.listingId,
            idempotencyKey,
            rulesAcknowledged: true,
          }),
        });
      } catch {
        setView((current) => ({
          ...current,
          busy: false,
          error: "We did not get a confirmation. You can try again.",
        }));
        return;
      }
      const body = await readJson(response);
      if (body.ok === true && body.code === "PUBLISHED") {
        if (ownerId) clearCountyStoryDraft(ownerId);
        setView((current) => ({
          ...current,
          busy: false,
          screen: "success",
          mode: "create",
          hasSlot: true,
          countyName: countyStoryCountyName(String(body.county_fips ?? current.countyFips)),
          slotNumber: Number(body.slot_number ?? current.slotNumber),
          error: null,
        }));
        return;
      }
      const code = String(body.code ?? "");
      if (code === "ALREADY_POSTED" || code === "POSTING_SUSPENDED") {
        await loadStatus();
      }
      setView((current) => ({
        ...current,
        busy: false,
        error: countyStoryComposerMessage(code, typeof body.eligible_at === "string" ? body.eligible_at : null),
      }));
      return;
    }

    const command = replaceListingCommand(view.propertyChoice ?? "keep", view.selectedListingId);
    if (!command.ok || !status.slot) {
      setView((current) => ({ ...current, error: command.ok ? "Replace Story is not available." : command.message }));
      return;
    }
    const scope = publishAttemptKey({
      mode: "replace",
      storyDay: status.storyDay,
      slotId: status.slot.id,
      mediaId,
      storyType: view.storyType,
      listingAction: command.action,
      listingId: command.listingId,
    });
    const idempotencyKey = sessionStorage.getItem(scope) ?? crypto.randomUUID();
    sessionStorage.setItem(scope, idempotencyKey);
    setView((current) => ({ ...current, busy: true, error: null }));
    let response: Response;
    try {
      response = await fetch("/api/county-stories/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: status.slot.id,
          mediaId,
          storyType: view.storyType,
          listingAction: command.action,
          listingId: command.listingId,
          idempotencyKey,
          rulesAcknowledged: true,
        }),
      });
    } catch {
      setView((current) => ({
        ...current,
        busy: false,
        error: "We did not get a confirmation. You can try again.",
      }));
      return;
    }
    const body = await readJson(response);
    if (body.ok === true && body.code === "REPLACED") {
      if (ownerId) clearCountyStoryDraft(ownerId);
      setView((current) => ({
        ...current,
        busy: false,
        screen: "success",
        mode: "replace",
        hasSlot: true,
        replacementAvailable: false,
        countyName: countyStoryCountyName(String(body.county_fips ?? current.countyFips)),
        slotNumber: Number(body.slot_number ?? current.slotNumber),
        error: null,
      }));
      return;
    }
    const code = String(body.code ?? "");
    if (code === "REPLACEMENT_ALREADY_USED" || code === "POSTING_SUSPENDED") await loadStatus();
    setView((current) => ({
      ...current,
      busy: false,
      error: countyStoryComposerMessage(code, typeof body.eligible_at === "string" ? body.eligible_at : null),
    }));
  }, [loadStatus, mediaId, ownerId, refreshCapacity, status, view.countyFips, view.mode, view.propertyChoice, view.rulesChecked, view.selectedListingId, view.storyType]);

  const confirmCaptions = useCallback(async () => {
    if (!mediaId || cues.length === 0) {
      setView((current) => ({ ...current, error: countyStoryComposerMessage("CAPTIONS_REQUIRED") }));
      return;
    }
    const edited = cues.map((cue, index) => ({ ...cue, text: view.cueTexts[index] ?? cue.text, index }));
    setView((current) => ({ ...current, busy: true, error: null }));
    const dirty = edited.some((cue, index) => cue.text.trim() !== cues[index]?.text.trim());
    let nextRevision = revision;
    if (dirty) {
      const saved = await fetch(`/api/county-stories/media/${mediaId}/captions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cues: edited.map((cue) => ({
            index: cue.index,
            start_ms: cue.startMs,
            end_ms: cue.endMs,
            text: cue.text.trim(),
          })),
          expectedRevision: revision,
          source: "edited",
        }),
      });
      const savedBody = await readJson(saved);
      if (savedBody.code === "CAPTION_REVISION_CONFLICT") {
        const fresh = await fetch(`/api/county-stories/media/${mediaId}/preparation`);
        const freshBody = await readJson(fresh);
        const freshCues = Array.isArray(freshBody.cues) ? (freshBody.cues as Cue[]) : [];
        setCues(freshCues);
        setRevision(Number(freshBody.captionRevision ?? revision));
        setView((current) => ({
          ...current,
          busy: false,
          cueTexts: freshCues.map((cue) => cue.text),
          error: countyStoryComposerMessage("CAPTION_REVISION_CONFLICT"),
        }));
        return;
      }
      if (!saved.ok) {
        setView((current) => ({
          ...current,
          busy: false,
          error: countyStoryComposerMessage(String(savedBody.code ?? "")),
        }));
        return;
      }
      nextRevision = Number(savedBody.revision ?? revision + 1);
      setRevision(nextRevision);
      setCues(edited);
    }
    const confirmed = await fetch(`/api/county-stories/media/${mediaId}/captions/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedRevision: nextRevision }),
    });
    const confirmedBody = await readJson(confirmed);
    if (confirmedBody.code === "CAPTION_REVISION_CONFLICT") {
      const fresh = await fetch(`/api/county-stories/media/${mediaId}/preparation`);
      const freshBody = await readJson(fresh);
      const freshCues = Array.isArray(freshBody.cues) ? (freshBody.cues as Cue[]) : [];
      setCues(freshCues);
      setRevision(Number(freshBody.captionRevision ?? nextRevision));
      setView((current) => ({
        ...current,
        busy: false,
        cueTexts: freshCues.map((cue) => cue.text),
        error: countyStoryComposerMessage("CAPTION_REVISION_CONFLICT"),
      }));
      return;
    }
    if (!confirmed.ok) {
      setView((current) => ({
        ...current,
        busy: false,
        error: countyStoryComposerMessage(String(confirmedBody.code ?? "CAPTIONS_REQUIRED")),
      }));
      return;
    }
    setView((current) => ({ ...current, busy: false, screen: "access", error: null }));
  }, [cues, mediaId, revision, view.cueTexts]);

  const saveAccess = useCallback(async () => {
    if (!mediaId || !view.accessBasis) {
      setView((current) => ({ ...current, error: "Choose how visual information is covered." }));
      return;
    }
    if (view.accessBasis === "supplied_description" && !view.accessDescription.trim()) {
      setView((current) => ({ ...current, error: "Add a short description, or choose the spoken option." }));
      return;
    }
    setView((current) => ({ ...current, busy: true, error: null }));
    const response = await fetch(`/api/county-stories/media/${mediaId}/accessibility`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        basis: view.accessBasis,
        description: view.accessBasis === "supplied_description" ? view.accessDescription.trim() : null,
        storyType: view.storyType,
        countyFips: view.countyFips,
        listingId: view.selectedListingId,
      }),
    });
    const body = await readJson(response);
    if (!response.ok) {
      setView((current) => ({
        ...current,
        busy: false,
        error: countyStoryComposerMessage(String(body.code ?? "")),
      }));
      return;
    }
    setView((current) => ({ ...current, busy: false, screen: "rules", rulesChecked: false, error: null }));
  }, [mediaId, view.accessBasis, view.accessDescription, view.countyFips, view.selectedListingId, view.storyType]);

  const onContinue = useCallback(async () => {
    if (view.screen === "processing") {
      if (!view.reviewReady) {
        setView((current) => ({ ...current, error: countyStoryComposerMessage("PLAYBACK_NOT_READY") }));
        return;
      }
      setView((current) => ({ ...current, screen: "review", error: null }));
      return;
    }
    if (view.screen === "captions") {
      await confirmCaptions();
      return;
    }
    if (view.screen === "access") {
      await saveAccess();
      return;
    }
    if (view.screen === "rules") {
      await publish();
      return;
    }
    if (view.screen === "county" && !view.countyFips) {
      setView((current) => ({ ...current, error: "Choose a County." }));
      return;
    }
    if (view.screen === "type" && !view.storyType) {
      setView((current) => ({ ...current, error: "Choose a Story type." }));
      return;
    }
    if (view.screen === "property") {
      const choices = propertyChoices({
        mode: view.mode,
        hasCurrentListing: !!view.currentListingLabel,
      });
      if (!view.propertyChoice || !choices.includes(view.propertyChoice)) {
        setView((current) => ({ ...current, error: "Choose what to do with the property." }));
        return;
      }
      if (view.mode === "replace") {
        const command = replaceListingCommand(view.propertyChoice, view.selectedListingId);
        if (!command.ok) {
          setView((current) => ({ ...current, error: command.message }));
          return;
        }
      } else {
        const listing = createListingId(view.propertyChoice, view.selectedListingId);
        if (!listing.ok) {
          setView((current) => ({ ...current, error: listing.message }));
          return;
        }
      }
    }
    const next = nextComposerStep(view.mode, view.screen);
    if (!next) return;
    setView((current) => ({ ...current, screen: next, error: null, rulesChecked: next === "rules" ? false : current.rulesChecked }));
  }, [confirmCaptions, publish, saveAccess, view]);

  const onResume = useCallback(async () => {
    if (!ownerId || !status) return;
    const draft = readCountyStoryDraft(ownerId);
    const resume = draftResume({
      draft,
      suspended: status.suspended,
      hasSlot: !!status.slot,
      slotId: status.slot?.id ?? null,
      replacementAvailable: showReplaceStory(status),
    });
    if (resume.kind !== "continue") return;
    const saved = resume.draft;
    setMediaId(saved.mediaId);
    setView((current) => ({
      ...current,
      screen: saved.screen === "owned" || saved.screen === "loading" || saved.screen === "success" ? "county" : saved.screen,
      mode: saved.mode,
      countyFips: saved.countyFips ?? current.countyFips,
      countyName: saved.countyFips ? countyStoryCountyName(saved.countyFips) : current.countyName,
      storyType: saved.storyType,
      propertyChoice: saved.propertyChoice,
      selectedListingId: saved.selectedListingId,
      cueTexts: saved.cueTexts,
      accessBasis: saved.accessBasis,
      accessDescription: saved.accessDescription,
      rulesChecked: false,
      resumeOffer: null,
      discardConfirm: false,
      draftNotice: null,
      error: null,
      busy: false,
    }));
    if (!saved.mediaId) return;
    const response = await fetch(`/api/county-stories/media/${saved.mediaId}/preparation`);
    if (!response.ok) {
      setMediaId(null);
      setView((current) => ({
        ...current,
        screen: "capture",
        reviewReady: false,
        videoUrl: null,
        draftNotice: "This video is no longer available. Your other choices are still here. Record or upload again.",
      }));
      return;
    }
    const body = await readJson(response);
    if (String(body.phase ?? "") === "failed") {
      setView((current) => ({
        ...current,
        screen: "capture",
        reviewReady: false,
        showRetry: false,
        draftNotice: "This video could not be prepared. Your other choices are still here. Record or upload again.",
      }));
      return;
    }
    if (String(body.phase ?? "") === "ready") {
      const nextCues = Array.isArray(body.cues) ? (body.cues as Cue[]) : [];
      setCues(nextCues);
      setRevision(Number(body.captionRevision ?? 0));
      const playback = await fetch(`/api/county-stories/media/${saved.mediaId}`);
      const playbackBody = await readJson(playback);
      setView((current) => ({
        ...current,
        reviewReady: true,
        videoUrl: typeof playbackBody.url === "string" ? playbackBody.url : current.videoUrl,
        cueTexts: nextCues.length ? nextCues.map((cue) => cue.text) : current.cueTexts,
      }));
    }
  }, [ownerId, status]);

  const onConfirmDiscard = useCallback(async () => {
    if (!ownerId) return;
    const draft = readCountyStoryDraft(ownerId);
    setView((current) => ({ ...current, busy: true, error: null }));
    let publishedLeftAlone = false;
    if (draft?.mediaId) {
      let response: Response;
      try {
        response = await fetch(`/api/county-stories/media/${draft.mediaId}`, { method: "DELETE" });
      } catch {
        setView((current) => ({
          ...current,
          busy: false,
          error: "The draft could not be discarded. Nothing else was changed.",
        }));
        return;
      }
      if (response.status === 409) {
        publishedLeftAlone = true;
      } else if (!response.ok && response.status !== 404) {
        setView((current) => ({
          ...current,
          busy: false,
          error: "The draft could not be discarded. Nothing else was changed.",
        }));
        return;
      }
    }
    clearCountyStoryDraft(ownerId);
    setMediaId(null);
    setCues([]);
    setView((current) => ({
      ...current,
      screen: status?.suspended ? "suspended" : "owned",
      mode: status?.slot ? "replace" : "create",
      hasSlot: !!status?.slot,
      countyFips: status?.slot?.countyFips ?? null,
      countyName: status?.slot ? countyStoryCountyName(status.slot.countyFips) : null,
      storyType: status?.slot?.storyType ?? null,
      propertyChoice: null,
      selectedListingId: null,
      currentListingLabel: status?.slot?.listingLabel ?? null,
      cueTexts: [],
      accessBasis: null,
      accessDescription: "",
      rulesChecked: false,
      videoUrl: null,
      reviewReady: false,
      resumeOffer: null,
      resumeLead: null,
      discardConfirm: false,
      draftNotice: publishedLeftAlone ? "Your published Story was not changed." : null,
      busy: false,
      error: null,
    }));
  }, [ownerId, status]);

  const denied = !status && view.screen === "loading" && !view.error && !view.showRetry;
  const visible = useMemo(() => status || view.error || view.showRetry, [status, view.error, view.showRetry]);
  if (denied || !visible) return null;
  if (!status && view.screen === "loading" && !view.error) return null;

  return (
    <>
    {cameraOpen ? (
      <CountyStoryCamera
        replacement={view.mode === "replace"}
        onClose={() => {
          cameraHandoffRef.current = false;
          setCameraOpen(false);
        }}
        onUse={(file) => {
          cameraHandoffRef.current = true;
          void beginUpload(file);
        }}
        onUpload={(file) => {
          cameraHandoffRef.current = true;
          void beginUpload(file);
        }}
      />
    ) : null}
    <CountyStoryPanel
      view={view}
      actions={{
        onCreate: () => {
          if (!status || !showCreateStory(status)) return;
          setView((current) => ({ ...current, screen: "county", mode: "create", error: null, rulesChecked: false }));
        },
        onReplace: () => {
          if (!status || !showReplaceStory(status) || !status.slot) return;
          setView((current) => ({
            ...current,
            screen: "type",
            mode: "replace",
            storyType: status.slot?.storyType ?? null,
            error: null,
            rulesChecked: false,
          }));
        },
        onCounty: (fips) => {
          setView((current) => {
            const countyChanged = Boolean(current.countyFips && current.countyFips !== fips);
            const hadProperty = Boolean(
              current.selectedListingId || (current.propertyChoice && current.propertyChoice !== "none"),
            );
            return {
              ...current,
              countyFips: fips,
              countyName: countyStoryCountyName(fips),
              selectedListingId: countyChanged && hadProperty ? null : current.selectedListingId,
              propertyChoice: countyChanged && hadProperty ? "none" : current.propertyChoice,
              draftNotice:
                countyChanged && hadProperty
                  ? "That property is for the previous County. Choose a property again for this County."
                  : null,
              error: null,
            };
          });
          void refreshCapacity(fips);
        },
        onType: (type) => setView((current) => ({ ...current, storyType: type, error: null })),
        onPropertyChoice: (choice: CountyStoryPropertyChoice) =>
          setView((current) => ({
            ...current,
            propertyChoice: choice,
            selectedListingId: choice === "add" || choice === "change" ? current.selectedListingId : null,
            error: null,
          })),
        onListing: (id) => setView((current) => ({ ...current, selectedListingId: id, error: null })),
        onCue: (index, text) =>
          setView((current) => {
            const cueTexts = current.cueTexts.slice();
            cueTexts[index] = text;
            return { ...current, cueTexts };
          }),
        onAccessBasis: (basis) => setView((current) => ({ ...current, accessBasis: basis, error: null })),
        onAccessDescription: (value) => setView((current) => ({ ...current, accessDescription: value })),
        onRules: (checked) => setView((current) => ({ ...current, rulesChecked: checked, error: null })),
        onRecord: () => setCameraOpen(true),
        onUpload: (file) => void beginUpload(file),
        onContinue: () => void onContinue(),
        onBack: () => {
          const previous = previousComposerStep(view.mode, view.screen);
          if (!previous) return;
          if (previous === "owned") {
            const saved = ownerId ? readCountyStoryDraft(ownerId) : null;
            const resume = draftResume({
              draft: saved,
              suspended: status?.suspended === true,
              hasSlot: !!status?.slot,
              slotId: status?.slot?.id ?? null,
              replacementAvailable: status ? showReplaceStory(status) : false,
            });
            setView((current) => ({
              ...current,
              screen: "owned",
              rulesChecked: false,
              resumeOffer: resume.kind === "continue" ? "continue" : resume.kind === "blocked" ? "blocked" : null,
              resumeLead: resume.kind === "none" ? null : resume.lead,
              discardConfirm: false,
              error: null,
              showRetry: false,
            }));
            return;
          }
          setView((current) => ({
            ...current,
            screen: previous,
            rulesChecked: false,
            error: null,
            showRetry: false,
          }));
        },
        onSaveExit: () => {
          if (!ownerId) return;
          const draft = viewToCountyStoryDraft({
            mode: view.mode,
            slotId: view.mode === "replace" ? (status?.slot?.id ?? null) : null,
            screen: view.screen,
            countyFips: view.countyFips,
            storyType: view.storyType,
            propertyChoice: view.propertyChoice,
            selectedListingId: view.selectedListingId,
            mediaId,
            cueTexts: view.cueTexts,
            accessBasis: view.accessBasis,
            accessDescription: view.accessDescription,
          });
          writeCountyStoryDraft(ownerId, draft);
          const saved = readCountyStoryDraft(ownerId);
          const resume = draftResume({
            draft: saved,
            suspended: false,
            hasSlot: !!status?.slot,
            slotId: status?.slot?.id ?? null,
            replacementAvailable: status ? showReplaceStory(status) : view.mode === "replace",
          });
          setView((current) => ({
            ...current,
            screen: "owned",
            rulesChecked: false,
            resumeOffer: resume.kind === "continue" ? "continue" : resume.kind === "blocked" ? "blocked" : null,
            resumeLead: resume.kind === "none" ? "You have an unfinished Story." : resume.lead,
            discardConfirm: false,
            error: null,
            busy: false,
          }));
        },
        onResume: () => void onResume(),
        onAskDiscard: () => setView((current) => ({ ...current, discardConfirm: true, error: null })),
        onCancelDiscard: () => setView((current) => ({ ...current, discardConfirm: false })),
        onConfirmDiscard: () => void onConfirmDiscard(),
        onShowPauseReasons: () => setView((current) => ({ ...current, showingPauseReasons: true, error: null })),
        onClosePauseReasons: () => setView((current) => ({ ...current, showingPauseReasons: false, error: null })),
        onRetry: () => {
          if (!status) {
            void loadStatus();
            return;
          }
          setMediaId(null);
          setView((current) => ({
            ...current,
            screen: "capture",
            error: null,
            showRetry: false,
            processingNote: null,
            reviewReady: false,
            videoUrl: null,
          }));
        },
      }}
    />
    </>
  );
}
