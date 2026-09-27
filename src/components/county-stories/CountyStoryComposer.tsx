"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CountyStoryPanel, type CountyStoryPanelView } from "@/components/county-stories/CountyStoryPanel";
import {
  countyStoryCapacityCopy,
  countyStoryComposerMessage,
  countyStoryCountdown,
  countyStoryCountyName,
  countyStoryEligibleWhen,
} from "@/lib/county-stories/composer-copy";
import {
  COUNTY_STORY_MAX_RECORD_SEC,
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

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function CountyStoryComposer() {
  const [view, setView] = useState<CountyStoryPanelView>(emptyView("loading"));
  const [status, setStatus] = useState<CountyStoryComposerStatus | null>(null);
  const [cues, setCues] = useState<Cue[]>([]);
  const [revision, setRevision] = useState(0);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const mode: CountyStoryComposerMode = view.mode;

  const applyStatus = useCallback((next: CountyStoryComposerStatus, clock: Date) => {
    setStatus(next);
    const slot = next.slot;
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
      error: null,
      busy: false,
    }));
  }, []);

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
    if (view.screen !== "county" && view.screen !== "rules" && view.screen !== "type") return;
    void refreshCapacity(view.countyFips);
  }, [refreshCapacity, view.countyFips, view.screen]);

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

  const stopRecording = useCallback(() => {
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    recordTimerRef.current = null;
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => () => stopRecording(), [stopRecording]);

  const beginUpload = useCallback(async (file: File) => {
    const declared = declaredVideoType(file);
    if (!declared) {
      setView((current) => ({ ...current, error: countyStoryComposerMessage("INVALID_MEDIA_TYPE") }));
      return;
    }
    if (file.size <= 0) {
      setView((current) => ({ ...current, error: countyStoryComposerMessage("INVALID_MEDIA") }));
      return;
    }
    try {
      const seconds = await readDurationSeconds(file);
      if (Number.isFinite(seconds) && seconds * 1000 > COUNTY_STORY_MEDIA_MAX_DURATION_MS) {
        setView((current) => ({ ...current, error: countyStoryComposerMessage("VIDEO_TOO_LONG") }));
        return;
      }
    } catch {
      setView((current) => ({
        ...current,
        error: "This video could not be read. Try recording again or choose another video.",
      }));
      return;
    }
    setView((current) => ({ ...current, busy: true, error: null, screen: "processing", processingNote: "Preparing your video.", showRetry: false }));
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
      processingNote: "Preparing your video.",
      videoUrl: null,
      showRetry: false,
    }));
  }, [mode]);

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
        setView((current) => ({
          ...current,
          processingNote: "We could not prepare this video. You can try again.",
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
        setView((current) => ({
          ...current,
          processingNote: "Your video is ready to review.",
          showRetry: false,
          videoUrl: typeof playbackBody.url === "string" ? playbackBody.url : current.videoUrl,
          cueTexts: nextCues.map((cue) => cue.text),
        }));
        return;
      }
      setView((current) => ({
        ...current,
        processingNote: "Preparing your video.",
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

  const onRecord = useCallback(async () => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      stopRecording();
      setView((current) => ({ ...current, recording: false, recordClock: null }));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setView((current) => ({
        ...current,
        error: "Recording is not available here. Upload a video instead.",
      }));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const preferred = MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : MediaRecorder.isTypeSupported("video/mp4")
          ? "video/mp4"
          : "";
      const recorder = preferred ? new MediaRecorder(stream, { mimeType: preferred }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || preferred || "video/webm" });
        const file = new File([blob], "county-story-recording", { type: blob.type });
        void beginUpload(file);
      };
      recorder.start(1000);
      const started = Date.now();
      setView((current) => ({ ...current, recording: true, recordClock: "0:30", error: null }));
      recordTimerRef.current = window.setInterval(() => {
        const left = Math.max(0, COUNTY_STORY_MAX_RECORD_SEC - Math.floor((Date.now() - started) / 1000));
        setView((current) => ({ ...current, recordClock: `0:${String(left).padStart(2, "0")}` }));
        if (left <= 0) stopRecording();
      }, 250);
    } catch {
      setView((current) => ({
        ...current,
        error: "Recording is not available here. Upload a video instead.",
      }));
    }
  }, [beginUpload, stopRecording]);

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
  }, [loadStatus, mediaId, refreshCapacity, status, view.countyFips, view.mode, view.propertyChoice, view.rulesChecked, view.selectedListingId, view.storyType]);

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
      if (view.processingNote !== "Your video is ready to review.") {
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

  const denied = !status && view.screen === "loading" && !view.error && !view.showRetry;
  const visible = useMemo(() => status || view.error || view.showRetry, [status, view.error, view.showRetry]);
  if (denied || !visible) return null;
  if (!status && view.screen === "loading" && !view.error) return null;

  return (
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
          setView((current) => ({
            ...current,
            countyFips: fips,
            countyName: countyStoryCountyName(fips),
            error: null,
          }));
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
        onRecord: () => void onRecord(),
        onUpload: (file) => void beginUpload(file),
        onContinue: () => void onContinue(),
        onBack: () => {
          const previous = previousComposerStep(view.mode, view.screen);
          if (!previous) return;
          setView((current) => ({ ...current, screen: previous, error: null, showRetry: false }));
        },
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
            videoUrl: null,
          }));
        },
      }}
    />
  );
}
