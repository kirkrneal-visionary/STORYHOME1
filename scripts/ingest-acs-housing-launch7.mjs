/**
 * Ingest ACS 5-year housing context for the launch 7 counties.
 *
 * Official Census table-based Summary File (no API key).
 * Streams nationwide .dat files and keeps only launch-7 tracts.
 * Tract polygons come from Census TIGERweb (public).
 *
 * Run: node scripts/ingest-acs-housing-launch7.mjs
 */
import { createWriteStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { tmpdir } from "node:os";

const COUNTIES = [
  { fips: "48373", county3: "373", name: "Polk" },
  { fips: "48005", county3: "005", name: "Angelina" },
  { fips: "48455", county3: "455", name: "Trinity" },
  { fips: "48457", county3: "457", name: "Tyler" },
  { fips: "48407", county3: "407", name: "San Jacinto" },
  { fips: "48291", county3: "291", name: "Liberty" },
  { fips: "48471", county3: "471", name: "Walker" },
];

const PREFIXES = COUNTIES.map((c) => `1400000US48${c.county3}`);
const FIPS_BY3 = Object.fromEntries(COUNTIES.map((c) => [c.county3, c.fips]));

const ACS_BASE =
  "https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/data/5YRData";

const TABLES = {
  b01003: "acsdt5y2023-b01003.dat",
  b11001: "acsdt5y2023-b11001.dat",
  b25003: "acsdt5y2023-b25003.dat",
  b25002: "acsdt5y2023-b25002.dat",
  b19013: "acsdt5y2023-b19013.dat",
  b25010: "acsdt5y2023-b25010.dat",
  b25001: "acsdt5y2023-b25001.dat",
  b25024: "acsdt5y2023-b25024.dat",
  b25064: "acsdt5y2023-b25064.dat",
};

const TIGER_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Tracts_Blocks/MapServer/0/query";

function isLaunchTractGeoId(geoId) {
  return PREFIXES.some((p) => geoId.startsWith(p));
}

function tractGeoid(geoId) {
  const m = geoId.match(/^1400000US(\d{11})$/);
  return m ? m[1] : null;
}

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n <= -111111111) return null; // Census missing / not applicable sentinels
  return n;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "StoryHome-ACS-ingest/1.0" },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

async function streamFilterTable(filename) {
  const url = `${ACS_BASE}/${filename}`;
  console.log("download", filename);
  const res = await fetch(url, {
    headers: { "User-Agent": "StoryHome-ACS-ingest/1.0" },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const tmp = join(tmpdir(), filename);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));

  const rows = new Map();
  let headers = null;
  const rl = createInterface({
    input: (await import("node:fs")).createReadStream(tmp),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line) continue;
    const parts = line.split("|");
    if (!headers) {
      headers = parts;
      continue;
    }
    const geoId = parts[0];
    if (!isLaunchTractGeoId(geoId)) continue;
    const geoid = tractGeoid(geoId);
    if (!geoid) continue;
    const rec = {};
    for (let i = 0; i < headers.length; i++) rec[headers[i]] = parts[i];
    rows.set(geoid, rec);
  }
  console.log("  kept", rows.size, "tracts from", filename);
  return rows;
}

async function fetchTigerTracts() {
  const where = `STATE='48' AND COUNTY IN ('373','005','455','457','407','291','471')`;
  const features = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({
      where,
      outFields: "GEOID,STATE,COUNTY,TRACT,NAME,BASENAME",
      returnGeometry: "true",
      outSR: "4326",
      f: "geojson",
      resultOffset: String(offset),
      resultRecordCount: "200",
    });
    const url = `${TIGER_URL}?${params.toString()}`;
    console.log("tiger offset", offset);
    const body = await fetchText(url);
    const gj = JSON.parse(body);
    if (gj.error) throw new Error(JSON.stringify(gj.error));
    const batch = gj.features || [];
    features.push(...batch);
    if (batch.length < 200) break;
    offset += batch.length;
  }
  return features;
}

function ringsOf(geom) {
  if (!geom) return [];
  if (geom.type === "Polygon") return geom.coordinates;
  if (geom.type === "MultiPolygon") return geom.coordinates.flat();
  return [];
}

async function main() {
  const [pop, hh, tenure, occ, income, hhsize, units, structure, rent] =
    await Promise.all([
      streamFilterTable(TABLES.b01003),
      streamFilterTable(TABLES.b11001),
      streamFilterTable(TABLES.b25003),
      streamFilterTable(TABLES.b25002),
      streamFilterTable(TABLES.b19013),
      streamFilterTable(TABLES.b25010),
      streamFilterTable(TABLES.b25001),
      streamFilterTable(TABLES.b25024),
      streamFilterTable(TABLES.b25064),
    ]);

  const geoids = new Set([
    ...pop.keys(),
    ...hh.keys(),
    ...tenure.keys(),
    ...occ.keys(),
    ...income.keys(),
    ...hhsize.keys(),
    ...units.keys(),
    ...structure.keys(),
    ...rent.keys(),
  ]);

  const tracts = [];
  const countyCounts = Object.fromEntries(
    COUNTIES.map((c) => [c.fips, 0]),
  );

  for (const geoid of [...geoids].sort()) {
    const county3 = geoid.slice(2, 5);
    const countyFips = FIPS_BY3[county3];
    if (!countyFips) continue;
    const p = pop.get(geoid) || {};
    const h = hh.get(geoid) || {};
    const t = tenure.get(geoid) || {};
    const o = occ.get(geoid) || {};
    const inc = income.get(geoid) || {};
    const s = hhsize.get(geoid) || {};
    const u = units.get(geoid) || {};
    const st = structure.get(geoid) || {};
    const r = rent.get(geoid) || {};

    const households = num(h.B11001_E001);
    const renterHouseholds = num(t.B25003_E003);
    const ownerHouseholds = num(t.B25003_E002);
    const housingUnits = num(u.B25001_E001) ?? num(o.B25002_E001);
    const vacantUnits = num(o.B25002_E003);
    const structure2plus = [
      num(st.B25024_E004),
      num(st.B25024_E005),
      num(st.B25024_E006),
      num(st.B25024_E007),
      num(st.B25024_E008),
      num(st.B25024_E009),
    ].reduce((acc, n) => (n != null ? acc + n : acc), 0);

    tracts.push({
      geoid,
      countyFips,
      population: num(p.B01003_E001),
      households,
      ownerHouseholds,
      renterHouseholds,
      renterShare:
        households != null && households > 0 && renterHouseholds != null
          ? renterHouseholds / households
          : null,
      housingUnits,
      vacantUnits,
      vacancyRate:
        housingUnits != null && housingUnits > 0 && vacantUnits != null
          ? vacantUnits / housingUnits
          : null,
      medianHouseholdIncome: num(inc.B19013_E001),
      averageHouseholdSize: num(s.B25010_E001),
      medianGrossRent: num(r.B25064_E001),
      unitsInStructure2plus: structure2plus || null,
      householdChange: null,
      populationChange: null,
    });
    countyCounts[countyFips] += 1;
  }

  const tiger = await fetchTigerTracts();
  const geometries = [];
  for (const f of tiger) {
    const geoid = String(f.properties?.GEOID || f.properties?.geoid || "");
    if (!/^\d{11}$/.test(geoid)) continue;
    const county3 = geoid.slice(2, 5);
    if (!FIPS_BY3[county3]) continue;
    const coords = ringsOf(f.geometry);
    if (!coords.length) continue;
    geometries.push({
      geoid,
      type: f.geometry.type,
      coordinates: f.geometry.coordinates,
    });
  }

  const missing = COUNTIES.filter((c) => countyCounts[c.fips] < 1);
  if (missing.length) {
    throw new Error(
      `ACS ingest missing counties: ${missing.map((m) => m.name).join(", ")}`,
    );
  }

  const out = {
    version: "acs5-housing-launch7-v1",
    source:
      "U.S. Census Bureau, American Community Survey 5-year estimates, 2023 table-based Summary File",
    sourceUrl:
      "https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/data/5YRData/",
    vintageLabel: "2019–2023",
    asOf: "2023",
    geography: "Census tract",
    honesty:
      "Local housing context is the ACS 5-year estimate for the Census tract that contains the parcel pin. It is surrounding housing evidence, not apartment demand, not a forecast, and not a custom tabulation of a drawn market frame.",
    householdChangeStatus: "not_verified",
    householdChangeNote:
      "A non-overlapping prior ACS 5-year vintage is not in this file. Household change stays Not verified.",
    counties: Object.fromEntries(
      COUNTIES.map((c) => [
        c.fips,
        { name: c.name, tractCount: countyCounts[c.fips] },
      ]),
    ),
    tractCount: tracts.length,
    geometryCount: geometries.length,
    tracts,
    geometries,
  };

  const dest = join(process.cwd(), "data/shi/acs5-housing-launch7.json");
  await writeFile(dest, JSON.stringify(out));
  console.log("wrote", dest);
  console.log("tracts", out.tractCount, "geometries", out.geometryCount);
  console.log(out.counties);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
