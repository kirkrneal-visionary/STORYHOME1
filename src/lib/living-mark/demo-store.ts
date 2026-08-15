"use client";

import type { LivingMarkRecord } from "@/lib/living-mark/types";
import { LIVING_MARK_DEMO_KEY } from "@/lib/living-mark/types";

function emptyMark(): LivingMarkRecord {
  return { stillUrl: null, videoUrl: null, updatedAt: new Date(0).toISOString() };
}

export function readDemoLivingMark(userId: string): LivingMarkRecord {
  if (typeof window === "undefined") return emptyMark();
  try {
    const raw = window.localStorage.getItem(`${LIVING_MARK_DEMO_KEY}:${userId}`);
    if (!raw) return emptyMark();
    const parsed = JSON.parse(raw) as LivingMarkRecord;
    return {
      stillUrl: parsed.stillUrl ?? null,
      videoUrl: parsed.videoUrl ?? null,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyMark();
  }
}

export function writeDemoLivingMark(
  userId: string,
  patch: Partial<LivingMarkRecord>,
): LivingMarkRecord {
  const prev = readDemoLivingMark(userId);
  const next: LivingMarkRecord = {
    stillUrl: patch.stillUrl !== undefined ? patch.stillUrl : prev.stillUrl,
    videoUrl: patch.videoUrl !== undefined ? patch.videoUrl : prev.videoUrl,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    `${LIVING_MARK_DEMO_KEY}:${userId}`,
    JSON.stringify(next),
  );
  return next;
}

export function clearDemoLivingMark(userId: string): void {
  window.localStorage.removeItem(`${LIVING_MARK_DEMO_KEY}:${userId}`);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** Grab a still frame from a video File for the Living Mark poster. */
export function posterFromVideoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const fail = (err: unknown) => {
      URL.revokeObjectURL(url);
      reject(err instanceof Error ? err : new Error("poster failed"));
    };

    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.4, (video.duration || 1) * 0.08);
      } catch (e) {
        fail(e);
      }
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = video.videoWidth || 480;
        const h = video.videoHeight || 480;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas");
        ctx.drawImage(video, 0, 0, w, h);
        const data = canvas.toDataURL("image/jpeg", 0.88);
        URL.revokeObjectURL(url);
        resolve(data);
      } catch (e) {
        fail(e);
      }
    };

    video.onerror = () => fail(new Error("video load failed"));
  });
}
