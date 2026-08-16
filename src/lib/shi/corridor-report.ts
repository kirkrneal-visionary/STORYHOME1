/**
 * Corridors V.2 — Development Intelligence Report (print product).
 * Evidence + interpretation + limitations — never guaranteed futures.
 */

import type { CorridorAnalysisResult } from "@/lib/shi/corridor-analysis";
import type { CorridorCompareResult } from "@/lib/shi/corridor-compare";
import { CORRIDOR_COMPARE_HONESTY } from "@/lib/shi/corridor-compare";
import { evidenceLegendHtml } from "@/lib/shi/evidence-tier";

export const CORRIDOR_REPORT_VERSION = "corridors-report-v1.1.0" as const;

export const CORRIDOR_REPORT_HONESTY =
  "This Development Intelligence Report organizes available evidence for professional discussion. It is not a guarantee of appreciation, zoning outcomes, development approval, or investment return.";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type ReportInput = {
  studyName: string;
  primary: CorridorAnalysisResult;
  compare?: CorridorCompareResult | null;
  secondary?: CorridorAnalysisResult | null;
};

export function buildDevelopmentIntelligenceReportHtml(
  input: ReportInput,
): string {
  const a = input.primary;
  const facts = a.observed
    .map(
      (f) =>
        `<tr><td>${escapeHtml(f.label)}</td><td><strong>${escapeHtml(f.value)}</strong></td><td class="muted">${escapeHtml(f.detail || "")}</td></tr>`,
    )
    .join("");
  const signals = a.signals
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.label)}</td><td class="mono">${escapeHtml(s.level)}</td><td class="muted">${escapeHtml(s.detail)}</td></tr>`,
    )
    .join("");
  const limits = a.limitations
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join("");
  const stations = a.evidence.stations
    .slice(0, 16)
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.onRoad || s.stationId)}</td><td class="mono">${escapeHtml(s.stationId)}</td><td class="num">${s.latestAadt != null ? s.latestAadt.toLocaleString("en-US") : "—"}</td><td>${escapeHtml(s.trendLabel || "—")}</td></tr>`,
    )
    .join("");

  let compareBlock = "";
  if (input.compare && input.secondary) {
    const rows = input.compare.rows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.left)}</td><td>${escapeHtml(r.right)}</td></tr>`,
      )
      .join("");
    compareBlock = `
<h2>Comparison</h2>
<p class="muted">${escapeHtml(CORRIDOR_COMPARE_HONESTY)}</p>
<p><strong>${escapeHtml(input.compare.leftLabel)}</strong> vs <strong>${escapeHtml(input.compare.rightLabel)}</strong></p>
<p>${escapeHtml(input.compare.summary)}</p>
<table><thead><tr><th>Measure</th><th>A</th><th>B</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${escapeHtml(input.studyName)} — Development Intelligence Report</title>
<style>
  body{font-family:Georgia,"Times New Roman",serif;padding:28px 36px;color:#10294c;line-height:1.45;max-width:860px;margin:0 auto}
  h1{font-size:26px;margin:4px 0 8px}
  h2{font-size:17px;margin:22px 0 8px;border-top:1px solid #e2ddd2;padding-top:14px}
  .mono{font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#9a7b0a}
  .muted{color:#5a6578;font-size:12px}
  .banner{border:1px solid #d4c4a8;background:#f7f4ec;padding:12px 14px;margin:14px 0}
  .interpret{border-left:3px solid #f5b71e;padding:10px 14px;margin:12px 0;background:#fbf8f0}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
  th,td{border-bottom:1px solid #e2ddd2;padding:6px 4px;text-align:left;vertical-align:top}
  th{font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#5a6578}
  td.num{font-variant-numeric:tabular-nums;text-align:right}
  ul{padding-left:1.1em}
  li{margin:4px 0;font-size:12px;color:#5a6578}
  @media print{body{padding:12px}}
</style></head><body>
<p class="mono">Archie's Intelligence · Corridors · ${escapeHtml(CORRIDOR_REPORT_VERSION)}</p>
<h1>${escapeHtml(input.studyName)}</h1>
<p class="muted">${escapeHtml(a.countyName)} · Analyzed ${escapeHtml(when(a.analyzedAt))} · Signal model ${escapeHtml(a.modelVersion)}</p>
<div class="banner">${escapeHtml(CORRIDOR_REPORT_HONESTY)}</div>

<h2>Executive summary</h2>
<div class="interpret"><p>${escapeHtml(a.interpretation)}</p></div>
<p><strong>Confidence:</strong> ${escapeHtml(a.confidence.label)} — ${escapeHtml(a.confidence.detail)}</p>
${
  "validation" in a.confidence && a.confidence.validation
    ? `<p class="muted">${escapeHtml(a.confidence.validation.headline)}${
        a.confidence.publishedAccuracy
          ? ` · Measured hit rate ${Math.round(a.confidence.publishedAccuracy.rate * 100)}% (n=${a.confidence.publishedAccuracy.n})`
          : " · No hard-coded accuracy percent"
      }</p>`
    : ""
}
<p class="muted">${escapeHtml(a.statusLine)}</p>

<h2>Observed facts</h2>
<table><thead><tr><th>Fact</th><th>Value</th><th>Note</th></tr></thead><tbody>${facts}</tbody></table>

<h2>Derived signals</h2>
<table><thead><tr><th>Signal</th><th>Level</th><th>Why</th></tr></thead><tbody>${signals}</tbody></table>

<h2>Traffic evidence (sample)</h2>
<table><thead><tr><th>Road</th><th>Station</th><th>AADT</th><th>Trend</th></tr></thead>
<tbody>${stations || `<tr><td colspan="4" class="muted">No stations inside outline.</td></tr>`}</tbody></table>
<p class="muted">Traffic years: ${escapeHtml(a.freshness.trafficYears.join(" · ") || "—")}</p>

<h2>Property evidence</h2>
<p>${a.evidence.parcelCount.toLocaleString("en-US")} parcels in outline · ${escapeHtml(a.freshness.parcelNote)}</p>

${compareBlock}

<h2>Sources & freshness</h2>
<ul>
${
  a.sources?.length
    ? a.sources
        .filter((s) => s.status !== "planned")
        .map(
          (s) =>
            `<li>${escapeHtml(s.label)} · <span class="mono">${escapeHtml(s.status)}</span> — ${escapeHtml(s.note)}</li>`,
        )
        .join("") +
      (a.sources.some((s) => s.status === "planned")
        ? `<li class="muted">Planned (not used): ${escapeHtml(
            a.sources
              .filter((s) => s.status === "planned")
              .map((s) => s.label)
              .join(" · "),
          )}</li>`
        : "")
    : `<li>County CAD / parcel file — ${escapeHtml(a.freshness.parcelNote)}</li>
<li>TxDOT published AADT (planning averages, not live congestion)</li>`
}
<li>Signal model ${escapeHtml(a.modelVersion)} · Report ${escapeHtml(CORRIDOR_REPORT_VERSION)}</li>
</ul>

${evidenceLegendHtml()}

<h2>Limitations</h2>
<ul>${limits}<li>${escapeHtml(CORRIDOR_REPORT_HONESTY)}</li></ul>

<p class="mono" style="margin-top:28px">County FIPS ${escapeHtml(a.countyFips)} · Private professional report · Does not modify public records</p>
</body></html>`;
}

export function openDevelopmentIntelligenceReport(input: ReportInput): void {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank", "noopener,noreferrer,width=860,height=980");
  if (!w) return;
  w.document.write(buildDevelopmentIntelligenceReportHtml(input));
  w.document.close();
  w.focus();
  w.print();
}
