/**
 * Corridors 2.0-E — property location intelligence report (print).
 * RE location intel tone — not an engineering dump.
 */

import type { TrafficStation } from "@/lib/shi/corridors";
import {
  CORRIDOR_STATUS_LABEL,
  TRAFFIC_INTENSITY_LABEL,
  corridorStatusFromHistory,
  trafficIntensityClass,
  vehiclesPerDayCaption,
} from "@/lib/shi/corridor-language";
import {
  formatApproxFrontageFt,
  type ParcelLocationIntel,
} from "@/lib/shi/corridor-frontage";
import {
  associateParcelTraffic,
  formatAcres,
  type CorridorParcelPick,
} from "@/lib/shi/corridor-parcel-traffic";
import {
  exposureBandLabel,
  scoreCommercialExposure,
} from "@/lib/shi/corridor-exposure";
import {
  comparePropertySites,
  type PropertyCompareSite,
} from "@/lib/shi/corridor-property-compare";
import { CORRIDOR_REPORT_HONESTY } from "@/lib/shi/corridor-report";

export const PROPERTY_REPORT_VERSION = "corridor-property-report-v1" as const;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type PropertyReportInput = {
  countyName: string;
  pick: CorridorParcelPick;
  stations: TrafficStation[];
  intel?: ParcelLocationIntel | null;
  compareSites?: PropertyCompareSite[];
};

export function buildPropertyLocationReportHtml(
  input: PropertyReportInput,
): string {
  const { pick, stations, intel, countyName } = input;
  const assoc = associateParcelTraffic(pick, stations);
  const station = assoc.kind === "estimated" ? assoc.station : null;
  const status = station
    ? corridorStatusFromHistory(station.history)
    : null;
  const commercial = scoreCommercialExposure({
    pick,
    stations,
    intel,
    legalAcreage: pick.legalAcreage,
  });
  const title =
    pick.situsAddress?.trim() || `CAD #${pick.propId} · ${countyName}`;
  const vehicles =
    station?.latestAadt != null
      ? Math.round(station.latestAadt).toLocaleString("en-US")
      : "—";
  const intensity =
    station?.latestAadt != null
      ? TRAFFIC_INTENSITY_LABEL[trafficIntensityClass(station.latestAadt)]
      : "—";
  const frontage = formatApproxFrontageFt(intel?.totalApproxFrontageFt ?? 0);
  const intersection = intel?.cornerLikely
    ? "Corner likely (approx)"
    : intel?.dualRoad
      ? "Dual-road (approx)"
      : "Not indicated from mapped roads";

  let compareBlock = "";
  if (input.compareSites && input.compareSites.length >= 2) {
    const cmp = comparePropertySites(input.compareSites, stations);
    const head = cmp.columns
      .map((c) => `<th>${escapeHtml(c.label)}</th>`)
      .join("");
    const body = cmp.rows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.label)}</td>${r.values
            .map((v) => `<td><strong>${escapeHtml(v)}</strong></td>`)
            .join("")}</tr>`,
      )
      .join("");
    compareBlock = `
<h2>Property compare</h2>
<p class="muted">${escapeHtml(cmp.honesty)}</p>
<p>${escapeHtml(cmp.summary)}</p>
<table>
<thead><tr><th>Measure</th>${head}</tr></thead>
<tbody>${body}</tbody>
</table>`;
  }

  const why = commercial.factors
    .map(
      (f) =>
        `<tr><td>${escapeHtml(f.label)}</td><td class="mono">${f.points}/${f.maxPoints}</td><td class="muted">${escapeHtml(f.detail)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Location intel · ${escapeHtml(title)}</title>
<style>
  body{font-family:Georgia,"Times New Roman",serif;color:#1a1f24;max-width:760px;margin:32px auto;padding:0 20px;line-height:1.45}
  h1{font-size:1.6rem;margin:0 0 6px}
  h2{font-size:1.1rem;margin:28px 0 8px;border-bottom:1px solid #d6d0c4;padding-bottom:4px}
  .mono{font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#8a7340}
  .muted{color:#5c6570;font-size:.92rem}
  .hero{font-size:2rem;font-weight:700;margin:4px 0}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:.92rem}
  td,th{text-align:left;padding:6px 8px 6px 0;border-top:1px solid #e5e0d6;vertical-align:top}
  th{font-family:ui-monospace,Menlo,monospace;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#5c6570}
  .banner{background:#f7f2e8;border:1px solid #e0d6c2;padding:10px 12px;margin:16px 0;font-size:.9rem}
  ul{padding-left:1.2rem}
  @media print{body{margin:12px}}
</style></head><body>
<p class="mono">Corridors · Location intelligence · ${escapeHtml(PROPERTY_REPORT_VERSION)}</p>
<h1>${escapeHtml(title)}</h1>
<p class="muted">${escapeHtml(countyName)} · CAD #${escapeHtml(pick.propId)} · ${escapeHtml(formatAcres(pick.legalAcreage))}</p>

<div class="banner">${escapeHtml(CORRIDOR_REPORT_HONESTY)}</div>

<h2>At a glance</h2>
<p class="hero">${escapeHtml(vehicles)}</p>
<p class="mono">Vehicles / day</p>
<p class="muted">${escapeHtml(
    station
      ? vehiclesPerDayCaption(station.latestYear)
      : "No nearby published count within range.",
  )}</p>
<table>
<tr><td>Intensity</td><td><strong>${escapeHtml(intensity)}</strong></td></tr>
<tr><td>Corridor status</td><td><strong>${escapeHtml(
    status ? CORRIDOR_STATUS_LABEL[status.status] : "—",
  )}</strong></td></tr>
<tr><td>Approx. frontage</td><td><strong>${escapeHtml(frontage)}</strong></td></tr>
<tr><td>Intersection</td><td><strong>${escapeHtml(intersection)}</strong></td></tr>
<tr><td>Commercial exposure</td><td><strong>${commercial.score}/${commercial.maxScore}</strong> · ${escapeHtml(
    exposureBandLabel(commercial.band),
  )}</td></tr>
</table>

<h2>What the numbers mean for this land</h2>
<p>${escapeHtml(
    assoc.kind === "estimated"
      ? assoc.detail
      : "Published traffic near this parcel is limited — use as directional context only.",
  )}</p>
${
  status
    ? `<p class="muted">${escapeHtml(status.why)}</p>`
    : ""
}
<p class="muted">Frontage is approximate from mapped roads — not a survey. Commercial exposure is a transparent factor sum, not an AI score.</p>

<h2>WHY? · commercial exposure factors</h2>
<table>
<thead><tr><th>Factor</th><th>Points</th><th>Detail</th></tr></thead>
<tbody>${why}</tbody>
</table>

${compareBlock}

<h2>Limitations</h2>
<ul>
<li>${escapeHtml(CORRIDOR_REPORT_HONESTY)}</li>
<li>Not zoning advice, sale prediction, or investment return.</li>
<li>TxDOT AADT is a planning average — not live congestion.</li>
</ul>
<p class="mono" style="margin-top:28px">Private professional report · Does not modify public records</p>
</body></html>`;
}

export function openPropertyLocationReport(input: PropertyReportInput): void {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank", "noopener,noreferrer,width=860,height=980");
  if (!w) return;
  w.document.write(buildPropertyLocationReportHtml(input));
  w.document.close();
  w.focus();
  w.print();
}
