/**
 * Corridors presentation + print map pack helpers.
 * Investor-room mode: big labels, clean chrome — not a forecast guarantee.
 */

import { CORRIDORS_HONESTY, formatAadt, type TrafficStation } from "@/lib/shi/corridors";
import type { GrowthWatchArea } from "@/lib/shi/growth-watch";
import {
  TRAFFIC_MEMORY_HONESTY,
  formatTrafficDelta,
  type TrafficMemoryDiff,
  whenShort,
} from "@/lib/shi/traffic-memory";

export const PRESENTATION_HONESTY =
  "Presentation mode enlarges labels for the room — same TxDOT planning counts, not live congestion.";

export type MapPackInput = {
  countyName: string;
  countyFips: string;
  stationCount: number;
  segmentCount: number;
  yearsCovered: number[];
  stations: TrafficStation[];
  watchAreas: GrowthWatchArea[];
  selectedWatch: GrowthWatchArea | null;
  memory: TrafficMemoryDiff | null;
  projectsNote?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Top stations by latest AADT for the print pack. */
export function topStationsForPack(
  stations: TrafficStation[],
  limit = 12,
): TrafficStation[] {
  return [...stations]
    .filter((s) => s.latestAadt != null)
    .sort((a, b) => (b.latestAadt ?? 0) - (a.latestAadt ?? 0))
    .slice(0, limit);
}

export function buildMapPackHtml(input: MapPackInput): string {
  const top = topStationsForPack(input.stations);
  const watches =
    input.watchAreas.length > 0
      ? input.watchAreas
          .map(
            (w) =>
              `<li><strong>${escapeHtml(w.title)}</strong> · ${escapeHtml(w.strength)}${
                w.peakAadt != null ? ` · peak ${escapeHtml(formatAadt(w.peakAadt))}/day` : ""
              }<br/><span class="muted">${escapeHtml(
                w.reasons.map((r) => r.label).join(" · ") || "Evidence watch",
              )}</span></li>`,
          )
          .join("")
      : "<li class=\"muted\">No growth watch areas for this county.</li>";

  const stationRows = top
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.onRoad || s.stationId)}</td><td class="mono">${escapeHtml(
          s.stationId,
        )}</td><td class="num">${escapeHtml(formatAadt(s.latestAadt))}</td><td>${escapeHtml(
          s.latestYear != null ? String(s.latestYear) : "—",
        )}</td><td>${escapeHtml(s.trendLabel ?? "—")}</td></tr>`,
    )
    .join("");

  const mem = input.memory;
  let memoryBlock = `<p class="muted">${escapeHtml(TRAFFIC_MEMORY_HONESTY)}</p>`;
  if (mem) {
    memoryBlock += `<p>${escapeHtml(mem.note)}</p>`;
    if (mem.aadtChanged.length) {
      memoryBlock += "<ul>";
      for (const c of mem.aadtChanged.slice(0, 8)) {
        memoryBlock += `<li>${escapeHtml(c.onRoad || c.stationId)}: ${escapeHtml(
          formatAadt(c.previousAadt),
        )} → ${escapeHtml(formatAadt(c.currentAadt))} (${escapeHtml(
          formatTrafficDelta(c.delta),
        )})</li>`;
      }
      memoryBlock += "</ul>";
    }
    if (mem.previousAt) {
      memoryBlock += `<p class="mono">Last look · ${escapeHtml(whenShort(mem.previousAt))}</p>`;
    }
  }

  const selected = input.selectedWatch
    ? `<div class="banner"><p class="mono">Selected watch</p><h2>${escapeHtml(
        input.selectedWatch.title,
      )}</h2><p>${escapeHtml(
        input.selectedWatch.reasons.map((r) => `${r.label}: ${r.detail}`).join(" · "),
      )}</p></div>`
    : "";

  const years =
    input.yearsCovered.length > 0
      ? input.yearsCovered.slice(0, 10).join(" · ")
      : "—";

  return `<!doctype html><html><head><meta charset="utf-8"/><title>Corridors map pack — ${escapeHtml(
    input.countyName,
  )}</title>
<style>
  body{font-family:Georgia,"Times New Roman",serif;padding:28px 36px;color:#10294c;line-height:1.45;max-width:820px;margin:0 auto}
  h1{font-size:26px;margin:4px 0 8px}
  h2{font-size:18px;margin:0 0 6px}
  .mono{font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9a7b0a}
  .muted{color:#5a6578;font-size:12px}
  .banner{border:1px solid #d4c4a8;background:#f7f4ec;padding:12px 14px;margin:14px 0}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
  th,td{border-bottom:1px solid #e2ddd2;padding:6px 4px;text-align:left}
  th{font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#5a6578}
  td.num{font-variant-numeric:tabular-nums;text-align:right}
  td.mono{font-family:ui-monospace,Menlo,monospace;font-size:11px}
  ul{padding-left:1.1em;margin:6px 0}
  li{margin:4px 0}
  @media print{body{padding:12px}}
</style></head><body>
<p class="mono">Archie's Intelligence · Corridors</p>
<h1>${escapeHtml(input.countyName)} — corridor map pack</h1>
<div class="banner">${escapeHtml(CORRIDORS_HONESTY)}</div>
<p><strong>${input.stationCount}</strong> stations · <strong>${input.segmentCount}</strong> corridor segments · years ${escapeHtml(years)}</p>
${selected}
<h2>Growth watch areas</h2>
<ul>${watches}</ul>
<h2>Highest published AADT stations</h2>
<table><thead><tr><th>Road</th><th>Station</th><th>AADT</th><th>Year</th><th>Trend</th></tr></thead>
<tbody>${stationRows || `<tr><td colspan="5" class="muted">No stations loaded.</td></tr>`}</tbody></table>
<h2>Since we last looked</h2>
${memoryBlock}
${
  input.projectsNote
    ? `<p class="muted">${escapeHtml(input.projectsNote)}</p>`
    : ""
}
<p class="mono" style="margin-top:24px">County FIPS ${escapeHtml(input.countyFips)} · Planning counts only</p>
</body></html>`;
}

export function openMapPackPrint(input: MapPackInput): void {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank", "noopener,noreferrer,width=820,height=960");
  if (!w) return;
  w.document.write(buildMapPackHtml(input));
  w.document.close();
  w.focus();
  w.print();
}
