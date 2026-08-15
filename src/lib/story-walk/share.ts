/**
 * STORY-WALK SW-8 — Share Story Walk film (native file share when possible).
 */

import {
  agentWorldAbsoluteUrl,
  agentWorldShareCard,
} from "@/lib/living-mark/share";

export type ShareStoryWalkResult =
  | {
      ok: true;
      method: "native-file" | "native-link" | "clipboard";
    }
  | { ok: false; reason: "cancelled" | "unavailable" };

function storyWalkShareText(agentName: string): string {
  return `Watch my Story Walk on Story Home — ${agentName}. Living Mark welcome + homes.`;
}

/** True when this browser can attach a video file to the share sheet. */
export function canShareStoryWalkFile(file: File): boolean {
  try {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      return false;
    }
    if (typeof navigator.canShare !== "function") return false;
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * Prefer sharing the WebM file; fall back to Agent World link (native or clipboard).
 * Never throws into UX.
 */
export async function shareStoryWalkFilm(opts: {
  agentId: string;
  agentName: string;
  marketCity?: string | null;
  roleLabel?: string | null;
  blob: Blob;
  filename: string;
}): Promise<ShareStoryWalkResult> {
  const file = new File([opts.blob], opts.filename, {
    type: opts.blob.type || "video/webm",
  });

  try {
    if (canShareStoryWalkFile(file)) {
      try {
        await navigator.share({
          files: [file],
          title: `${opts.agentName} · Story Walk`,
          text: storyWalkShareText(opts.agentName),
        });
        return { ok: true, method: "native-file" };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return { ok: false, reason: "cancelled" };
        }
        /* fall through to link share */
      }
    }

    const url = agentWorldAbsoluteUrl(opts.agentId);
    const card = agentWorldShareCard({
      agentName: opts.agentName,
      marketCity: opts.marketCity,
      roleLabel: opts.roleLabel,
      url,
    });
    const text = `${storyWalkShareText(opts.agentName)} ${card.url}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `${opts.agentName} · Story Walk`,
          text,
          url: card.url,
        });
        return { ok: true, method: "native-link" };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return { ok: false, reason: "cancelled" };
        }
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { ok: true, method: "clipboard" };
    }

    return { ok: false, reason: "unavailable" };
  } catch {
    try {
      const url = agentWorldAbsoluteUrl(opts.agentId);
      await navigator.clipboard.writeText(
        `${storyWalkShareText(opts.agentName)} ${url}`,
      );
      return { ok: true, method: "clipboard" };
    } catch {
      return { ok: false, reason: "unavailable" };
    }
  }
}
