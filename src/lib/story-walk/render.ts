/**
 * STORY-WALK SW-7/SW-8 — Canvas compositor.
 * Feels like a walkthrough; is a renderer (not OS screen-grab).
 * Master: 1920×1080 WebM (shareable marketing quality for social).
 */

import type {
  StoryWalkComposeInput,
  StoryWalkProgress,
} from "@/lib/story-walk/types";
import {
  STORY_WALK_FPS,
  STORY_WALK_HEIGHT,
  STORY_WALK_IMAGES_PER_LISTING,
  STORY_WALK_WIDTH,
} from "@/lib/story-walk/types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Preflight — call before starting a long compose so UX can fail fast. */
export function storyWalkRecordSupport(): {
  ok: boolean;
  mime: string;
  reason?: string;
} {
  if (typeof window === "undefined") {
    return { ok: false, mime: "", reason: "Export needs a browser window." };
  }
  if (typeof MediaRecorder === "undefined") {
    return {
      ok: false,
      mime: "",
      reason: "This browser can’t record Story Walk yet. Try Chrome or Edge.",
    };
  }
  if (typeof HTMLCanvasElement === "undefined") {
    return { ok: false, mime: "", reason: "Canvas unavailable." };
  }
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";
  if (!mime) {
    return {
      ok: false,
      mime: "",
      reason: "WebM recording isn’t supported here. Try Chrome or Edge on desktop.",
    };
  }
  return { ok: true, mime };
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  w: number,
  h: number,
  zoom = 1,
  panX = 0.5,
  panY = 0.5,
) {
  const iw =
    "videoWidth" in img && (img as HTMLVideoElement).videoWidth
      ? (img as HTMLVideoElement).videoWidth
      : (img as HTMLImageElement).naturalWidth || w;
  const ih =
    "videoHeight" in img && (img as HTMLVideoElement).videoHeight
      ? (img as HTMLVideoElement).videoHeight
      : (img as HTMLImageElement).naturalHeight || h;
  const scale = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (w - dw) * panX;
  const dy = (h - dh) * panY;
  ctx.drawImage(img as CanvasImageSource, dx, dy, dw, dh);
}

function fillAtmosphere(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#0f1f1c");
  g.addColorStop(0.55, "#1a3a34");
  g.addColorStop(1, "#123f38");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawTitleCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  title: string,
  subtitle: string,
) {
  fillAtmosphere(ctx, w, h);
  ctx.fillStyle = "rgba(245,183,30,0.9)";
  ctx.font = "600 28px ui-monospace, monospace";
  ctx.fillText("STORY WALK", w * 0.08, h * 0.42);
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "700 72px Georgia, serif";
  ctx.fillText(title.slice(0, 42), w * 0.08, h * 0.52);
  ctx.fillStyle = "rgba(244,241,234,0.72)";
  ctx.font = "400 32px system-ui, sans-serif";
  ctx.fillText(subtitle.slice(0, 60), w * 0.08, h * 0.6);
}

function drawListingChrome(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  price: string,
  line: string,
) {
  const boxH = 140;
  ctx.fillStyle = "rgba(12, 28, 24, 0.55)";
  ctx.fillRect(0, h - boxH, w, boxH);
  ctx.fillStyle = "#f5b71e";
  ctx.font = "700 48px Georgia, serif";
  ctx.fillText(price, 48, h - 70);
  ctx.fillStyle = "#f4f1ea";
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillText(line.slice(0, 70), 48, h - 28);
}

async function playVideoOntoCanvas(
  ctx: CanvasRenderingContext2D,
  videoUrl: string,
  w: number,
  h: number,
  maxSeconds: number,
  onFrame: () => void,
): Promise<void> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.src = videoUrl;
  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("video load failed"));
  });
  const duration = Math.min(video.duration || maxSeconds, maxSeconds);
  try {
    await video.play();
  } catch {
    /* continue with currentTime scrub */
  }
  const started = performance.now();
  while ((performance.now() - started) / 1000 < duration) {
    const t = (performance.now() - started) / 1000;
    if (video.readyState >= 2) {
      try {
        video.currentTime = Math.min(t, duration - 0.05);
      } catch {
        /* ignore seek errors */
      }
    }
    fillAtmosphere(ctx, w, h);
    drawCover(ctx, video, w, h, 1.02, 0.5, 0.45);
    onFrame();
    await sleep(1000 / STORY_WALK_FPS);
  }
  video.pause();
}

/**
 * Render a Story Walk marketing film and return a WebM blob (1080p).
 */
export async function renderStoryWalkFilm(
  input: StoryWalkComposeInput,
  onProgress?: (p: StoryWalkProgress) => void,
): Promise<Blob> {
  const w = STORY_WALK_WIDTH;
  const h = STORY_WALK_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  const report = (partial: StoryWalkProgress) => onProgress?.(partial);
  report({ phase: "prepare", progress: 0.02, message: "Preparing Story Walk…" });

  const support = storyWalkRecordSupport();
  if (!support.ok) throw new Error(support.reason || "Recording unavailable");
  const mime = support.mime;

  const stream = canvas.captureStream(STORY_WALK_FPS);
  const chunks: BlobPart[] = [];
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 8_000_000,
    });
  } catch {
    recorder = new MediaRecorder(stream, { mimeType: mime });
  }
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.start(250);

  const tick = () => {
    /* MediaRecorder pulls from captureStream */
  };

  try {
  // 1) Opening title
  report({ phase: "render", progress: 0.08, message: "Opening title…" });
  for (let i = 0; i < STORY_WALK_FPS * 2; i++) {
    drawTitleCard(
      ctx,
      w,
      h,
      input.agentName,
      `${input.marketCity} · Living Mark + homes`,
    );
    tick();
    await sleep(1000 / STORY_WALK_FPS);
  }

  // 2) Living Mark presence
  report({ phase: "render", progress: 0.18, message: "Living Mark welcome…" });
  if (input.livingMarkVideoUrl) {
    try {
      await playVideoOntoCanvas(
        ctx,
        input.livingMarkVideoUrl,
        w,
        h,
        8,
        tick,
      );
    } catch {
      /* fall through to still */
    }
  }
  if (input.livingMarkStillUrl) {
    const still = await loadImage(input.livingMarkStillUrl);
    if (still) {
      for (let i = 0; i < STORY_WALK_FPS * 3; i++) {
        const z = 1 + (i / (STORY_WALK_FPS * 3)) * 0.08;
        fillAtmosphere(ctx, w, h);
        drawCover(ctx, still, w, h, z, 0.5, 0.4);
        ctx.fillStyle = "rgba(12,28,24,0.35)";
        ctx.fillRect(0, h - 120, w, 120);
        ctx.fillStyle = "#f5b71e";
        ctx.font = "600 22px ui-monospace, monospace";
        ctx.fillText("LIVING MARK", 48, h - 70);
        ctx.fillStyle = "#f4f1ea";
        ctx.font = "700 40px Georgia, serif";
        ctx.fillText(input.agentName, 48, h - 28);
        tick();
        await sleep(1000 / STORY_WALK_FPS);
      }
    }
  } else if (!input.livingMarkVideoUrl) {
    for (let i = 0; i < STORY_WALK_FPS * 2; i++) {
      drawTitleCard(ctx, w, h, input.agentName, "Add a Living Mark in Settings");
      tick();
      await sleep(1000 / STORY_WALK_FPS);
    }
  }

  // 3) Listing walks
  const listings = input.listings.slice(0, 5);
  for (let li = 0; li < listings.length; li++) {
    const listing = listings[li]!;
    const photos = listing.photos
      .filter(Boolean)
      .slice(0, STORY_WALK_IMAGES_PER_LISTING);
    report({
      phase: "render",
      progress: 0.25 + (li / Math.max(listings.length, 1)) * 0.55,
      message: `Walking ${listing.title}…`,
    });

    if (photos.length === 0) {
      for (let i = 0; i < STORY_WALK_FPS * 2; i++) {
        fillAtmosphere(ctx, w, h);
        drawListingChrome(ctx, w, h, listing.priceLabel, listing.title);
        tick();
        await sleep(1000 / STORY_WALK_FPS);
      }
      continue;
    }

    for (let pi = 0; pi < photos.length; pi++) {
      const img = await loadImage(photos[pi]!);
      if (!img) continue;
      const frames = Math.round(STORY_WALK_FPS * 2.4);
      for (let f = 0; f < frames; f++) {
        const t = f / frames;
        const z = 1.02 + t * 0.1;
        fillAtmosphere(ctx, w, h);
        drawCover(ctx, img, w, h, z, 0.45 + t * 0.1, 0.45);
        drawListingChrome(
          ctx,
          w,
          h,
          listing.priceLabel,
          `${listing.title} · ${listing.subtitle}`,
        );
        tick();
        await sleep(1000 / STORY_WALK_FPS);
      }
    }
  }

  // 4) End card
  report({ phase: "render", progress: 0.9, message: "Closing card…" });
  for (let i = 0; i < STORY_WALK_FPS * 2.5; i++) {
    drawTitleCard(
      ctx,
      w,
      h,
      "Story Home",
      `${input.agentName} · Agent World`,
    );
    tick();
    await sleep(1000 / STORY_WALK_FPS);
  }

  report({ phase: "encode", progress: 0.96, message: "Encoding download…" });
  try {
    recorder.requestData();
  } catch {
    /* older browsers */
  }
  if (recorder.state !== "inactive") recorder.stop();
  await stopped;

  const blob = new Blob(chunks, {
    type: mime.includes("webm") ? "video/webm" : mime,
  });
  if (blob.size < 256) {
    throw new Error("Story Walk encode produced an empty file. Try again.");
  }
  report({ phase: "done", progress: 1, message: "Story Walk ready" });
  return blob;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    if (recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
    }
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
