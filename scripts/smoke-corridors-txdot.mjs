/**
 * Live TxDOT smoke for Corridors Wave 1 (no Supabase).
 * Run: node scripts/smoke-corridors-txdot.mjs
 */
import assert from "node:assert/strict";

const STATIONS_URL =
  "https://services.arcgis.com/KTcxiTD9dsQw4r7Z/arcgis/rest/services/TxDOT_AADT_Annuals_(Public_View)/FeatureServer/0/query";

const qs = new URLSearchParams({
  f: "json",
  where: "CNTY_NM='Polk'",
  outFields:
    "TRFC_STATN_ID,ON_ROAD,AADT_RPT_YEAR,AADT_RPT_QTY,AADT_RPT_HIST_01_QTY,AADT_RPT_HIST_05_QTY,LATITUDE,LONGITUDE",
  returnGeometry: "false",
  resultRecordCount: "25",
  orderByFields: "AADT_RPT_QTY DESC",
});

const res = await fetch(`${STATIONS_URL}?${qs}`);
assert.equal(res.ok, true, `HTTP ${res.status}`);
const body = await res.json();
assert.ok(!body.error, body.error?.message || "TxDOT error");
const feats = body.features || [];
assert.ok(feats.length >= 5, `expected stations, got ${feats.length}`);
const top = feats[0].attributes;
assert.ok(top.TRFC_STATN_ID);
assert.ok(top.AADT_RPT_YEAR >= 2020);
assert.ok(
  top.AADT_RPT_QTY != null || top.AADT_RPT_HIST_01_QTY != null,
  "need at least one AADT year",
);
console.log(
  "smoke-corridors-txdot: ok",
  feats.length,
  "stations · top",
  top.ON_ROAD,
  top.AADT_RPT_QTY,
  top.AADT_RPT_YEAR,
);
