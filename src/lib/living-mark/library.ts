"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";
import { updateMyProfile } from "@/lib/supabase/profile";
import {
  clearDemoLivingMark,
  fileToDataUrl,
  posterFromVideoFile,
  readDemoLivingMark,
  writeDemoLivingMark,
} from "@/lib/living-mark/demo-store";
import type { LivingMarkRecord } from "@/lib/living-mark/types";
import {
  LIVING_MARK_MAX_IMAGE_BYTES,
  LIVING_MARK_MAX_VIDEO_BYTES,
} from "@/lib/living-mark/types";

const BUCKET = "living-marks";

export async function loadLivingMark(
  userId: string,
  profileStillUrl?: string | null,
  profileVideoUrl?: string | null,
): Promise<LivingMarkRecord> {
  const demo = readDemoLivingMark(userId);
  return {
    stillUrl: demo.stillUrl || profileStillUrl || null,
    videoUrl: demo.videoUrl || profileVideoUrl || null,
    updatedAt: demo.updatedAt,
  };
}

async function uploadToBucket(
  userId: string,
  file: File,
  kind: "still" | "video",
): Promise<string> {
  const s = getBrowserSupabase();
  if (!s) throw new Error("no supabase");
  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    (kind === "video" ? "mp4" : "jpg");
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await s.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = s.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Library upload for Living Mark — image (temporary still) or video (welcome).
 * Demo mode (no Supabase): localStorage data URLs so preview track works.
 */
export async function uploadLivingMarkFromLibrary(
  userId: string,
  file: File,
): Promise<LivingMarkRecord> {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) {
    throw new Error("Choose a photo or video from your library.");
  }
  if (isImage && file.size > LIVING_MARK_MAX_IMAGE_BYTES) {
    throw new Error("Photo is too large (max 6 MB).");
  }
  if (isVideo && file.size > LIVING_MARK_MAX_VIDEO_BYTES) {
    throw new Error("Video is too large for now (max 12 MB). Keep ~30s.");
  }

  const supabase = getBrowserSupabase();

  if (!supabase) {
    if (isImage) {
      const stillUrl = await fileToDataUrl(file);
      return writeDemoLivingMark(userId, { stillUrl });
    }
    const [videoUrl, stillUrl] = await Promise.all([
      fileToDataUrl(file),
      posterFromVideoFile(file).catch(() => null),
    ]);
    return writeDemoLivingMark(userId, {
      videoUrl,
      stillUrl: stillUrl || undefined,
    });
  }

  if (isImage) {
    const stillUrl = await uploadToBucket(userId, file, "still");
    await updateMyProfile(userId, { photoUrl: stillUrl });
    writeDemoLivingMark(userId, { stillUrl });
    return {
      stillUrl,
      videoUrl: readDemoLivingMark(userId).videoUrl,
      updatedAt: new Date().toISOString(),
    };
  }

  const videoUrl = await uploadToBucket(userId, file, "video");
  let stillUrl: string | null = null;
  try {
    const posterData = await posterFromVideoFile(file);
    const blob = await (await fetch(posterData)).blob();
    const posterFile = new File([blob], "poster.jpg", { type: "image/jpeg" });
    stillUrl = await uploadToBucket(userId, posterFile, "still");
  } catch {
    stillUrl = null;
  }

  await updateMyProfile(userId, {
    livingMarkVideoUrl: videoUrl,
    ...(stillUrl ? { photoUrl: stillUrl } : {}),
  });

  writeDemoLivingMark(userId, { videoUrl, stillUrl });
  return { stillUrl, videoUrl, updatedAt: new Date().toISOString() };
}

export async function clearLivingMarkLibrary(userId: string): Promise<void> {
  clearDemoLivingMark(userId);
  const supabase = getBrowserSupabase();
  if (!supabase) return;
  await updateMyProfile(userId, {
    photoUrl: null,
    livingMarkVideoUrl: null,
  });
}
