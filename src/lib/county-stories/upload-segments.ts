import { tusUpload } from "@/lib/county-stories/resumable-upload";

export type UploadableSegment = {
  file: File;
  durationMs: number;
  facing: "user" | "environment" | "upload";
};

export type SegmentUploadResult =
  | { ok: true; mediaId: string; resumable: boolean }
  | { ok: false; error: string; code?: string };

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Uploads each clip to the private bucket. A dropped connection can resume
 * while this page stays open. Closing the browser stops the upload.
 * Local copies are not deleted here.
 */
export async function uploadCountyStorySegments(opts: {
  purpose: "original" | "replacement";
  segments: UploadableSegment[];
  onProgress?: (percent: number) => void;
}): Promise<SegmentUploadResult> {
  const first = opts.segments[0];
  if (!first) return { ok: false, error: "Record or upload a video first." };
  const declared = first.file.type.split(";")[0]?.trim() || "video/webm";
  const totalBytes = opts.segments.reduce((sum, segment) => sum + segment.file.size, 0);
  const staged = await fetch("/api/county-stories/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      purpose: opts.purpose,
      contentType: declared,
      byteSize: totalBytes,
      uploadKey: crypto.randomUUID(),
    }),
  });
  const stageBody = await readJson(staged);
  if (!staged.ok || typeof stageBody.id !== "string") {
    return { ok: false, error: String(stageBody.error ?? "The upload did not finish."), code: String(stageBody.code ?? "") };
  }
  let sent = 0;
  let resumable = true;
  for (let position = 0; position < opts.segments.length; position += 1) {
    const segment = opts.segments[position];
    const opened = await fetch(`/api/county-stories/media/${stageBody.id}/segments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        position,
        contentType: segment.file.type.split(";")[0]?.trim() || declared,
        byteSize: segment.file.size,
        durationMs: segment.durationMs,
        facing: segment.facing,
      }),
    });
    const openedBody = await readJson(opened);
    if (!opened.ok || typeof openedBody.token !== "string" || typeof openedBody.segmentId !== "string") {
      return { ok: false, error: "Story preparation is not available yet." };
    }
    let uploaded = false;
    if (typeof openedBody.tusEndpoint === "string" && typeof openedBody.objectName === "string") {
      const tus = await tusUpload({
        endpoint: openedBody.tusEndpoint,
        token: openedBody.token,
        bucket: String(openedBody.bucket ?? "county-story-media"),
        objectName: openedBody.objectName,
        file: segment.file,
        contentType: segment.file.type || declared,
        onProgress: (progress) => {
          const percent = Math.round(((sent + progress.uploaded) / Math.max(totalBytes, 1)) * 100);
          opts.onProgress?.(percent);
        },
      });
      uploaded = tus.ok;
      if (!tus.ok) resumable = false;
    }
    if (!uploaded && typeof openedBody.uploadUrl === "string") {
      resumable = false;
      const put = await fetch(openedBody.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": segment.file.type || declared, "x-upsert": "true" },
        body: segment.file,
      });
      if (!put.ok) return { ok: false, error: "The upload did not finish. Your clips are still on this phone." };
    } else if (!uploaded) {
      return { ok: false, error: "The upload did not finish. Your clips are still on this phone." };
    }
    const stored = await fetch(`/api/county-stories/media/${stageBody.id}/segments/${openedBody.segmentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ byteSize: segment.file.size }),
    });
    if (!stored.ok) return { ok: false, error: "The upload did not finish. Your clips are still on this phone." };
    sent += segment.file.size;
    opts.onProgress?.(Math.round((sent / Math.max(totalBytes, 1)) * 100));
  }
  return { ok: true, mediaId: stageBody.id, resumable };
}
