/**
 * Import Mux-generated WebVTT into the Story Home cue model.
 * Story Home remains caption authority.
 */
import type { CountyStoryCaptionCue } from "@/lib/county-stories/captions";

function parseTimestamp(value: string): number | null {
  const match = value.trim().match(/^(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})$/);
  if (!match) return null;
  const hours = match[1] ? Number(match[1]) : 0;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = Number(match[4]);
  if ([hours, minutes, seconds, millis].some((n) => !Number.isFinite(n))) {
    return null;
  }
  return hours * 3_600_000 + minutes * 60_000 + seconds * 1000 + millis;
}

export function parseMuxWebVttCues(vtt: string): CountyStoryCaptionCue[] {
  const lines = vtt.replace(/^\uFEFF/, "").split(/\r?\n/);
  const cues: CountyStoryCaptionCue[] = [];
  let i = 0;
  if (lines[0]?.startsWith("WEBVTT")) i = 1;
  while (i < lines.length) {
    while (i < lines.length && !lines[i].trim()) i += 1;
    if (i >= lines.length) break;
    if (lines[i].startsWith("NOTE") || lines[i].startsWith("STYLE")) {
      while (i < lines.length && lines[i].trim()) i += 1;
      continue;
    }
    if (!lines[i].includes("-->")) {
      i += 1;
      if (i < lines.length && !lines[i].includes("-->")) continue;
    }
    const timing = lines[i];
    const arrow = timing.indexOf("-->");
    if (arrow < 0) {
      i += 1;
      continue;
    }
    const start = parseTimestamp(timing.slice(0, arrow));
    const endPart = timing.slice(arrow + 3).trim().split(/\s+/)[0] ?? "";
    const end = parseTimestamp(endPart);
    i += 1;
    const text: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      text.push(lines[i].trim());
      i += 1;
    }
    const body = text.join(" ").trim();
    if (start == null || end == null || !body) continue;
    cues.push({
      index: cues.length,
      start_ms: start,
      end_ms: end,
      text: body.slice(0, 200),
    });
  }
  return cues;
}
