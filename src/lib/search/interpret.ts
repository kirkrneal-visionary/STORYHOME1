import {
  DEFAULT_SEARCH_FILTERS,
  type ListingStatus,
  type SearchFilters,
} from "@/lib/listing-filters";
import { REGION_CITIES, SERVICE_COUNTIES } from "@/lib/markets";
import { paidInterpretStatus } from "@/lib/search/provider";
import {
  EMPTY_GEOGRAPHY,
  allowlistedAdvanced,
  clampQuery,
  mergeFilters,
  recordsEligible,
  type SearchGeography,
  type SearchPlan,
  type SearchPreference,
} from "@/lib/search/plan";

const BED_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

const CITY_SOURCE: Record<string, { label: string; source: string; fips: string }> =
  {
    livingston: { label: "Livingston", source: "polk_cad", fips: "48373" },
    lufkin: { label: "Lufkin", source: "angelina_cad", fips: "48005" },
    huntsville: { label: "Huntsville", source: "walker_cad", fips: "48471" },
    liberty: { label: "Liberty", source: "liberty_cad", fips: "48291" },
    woodville: { label: "Woodville", source: "tyler_cad", fips: "48457" },
    coldspring: { label: "Coldspring", source: "san_jacinto_cad", fips: "48407" },
    groveton: { label: "Groveton", source: "trinity_cad", fips: "48455" },
    diboll: { label: "Diboll", source: "angelina_cad", fips: "48005" },
    shepherd: { label: "Shepherd", source: "san_jacinto_cad", fips: "48407" },
    cleveland: { label: "Cleveland", source: "liberty_cad", fips: "48291" },
  };

const COUNTY_SOURCE: Record<string, { label: string; source: string }> = {
  polk: { label: "Polk County", source: "polk_cad" },
  trinity: { label: "Trinity County", source: "trinity_cad" },
  angelina: { label: "Angelina County", source: "angelina_cad" },
  tyler: { label: "Tyler County", source: "tyler_cad" },
  "san jacinto": { label: "San Jacinto County", source: "san_jacinto_cad" },
  liberty: { label: "Liberty County", source: "liberty_cad" },
  walker: { label: "Walker County", source: "walker_cad" },
};

const OUTSIDE = [
  "houston",
  "dallas",
  "austin",
  "san antonio",
  "fort worth",
  "college station",
  "beaumont",
];

const UNKNOWN_RULES: { re: RegExp; note: string; pref?: SearchPreference }[] = [
  {
    re: /\b(shop|workshop|barn|outbuilding)\b/i,
    note: "Shop or barn is not a Story Home listing field.",
    pref: "shop",
  },
  {
    re: /\b(private|secluded|privacy)\b/i,
    note: "Privacy is not a measured Story Home field.",
    pref: "private",
  },
  {
    re: /\b(frontage|road frontage)\b/i,
    note: "Road frontage is a Story Pro research tool, not public search.",
    pref: "frontage",
  },
  {
    re: /\b(highway exposure|aadt|traffic count)\b/i,
    note: "Highway traffic counts are a Story Pro research tool.",
    pref: "highwayExposure",
  },
  {
    re: /\b(rent|rental|for rent|lease)\b/i,
    note: "Story Home does not have rental inventory.",
  },
  {
    re: /\b(buildable|septic|utilities|divid(?:e|ing)|split the land)\b/i,
    note: "Buildability and land division are not Story Home facts.",
    pref: "roomForAnotherHouse",
  },
  {
    re: /\bmls\b/i,
    note: "Story Home does not use MLS inventory.",
  },
];

function compactAdvanced(extra: Partial<SearchFilters>): Partial<SearchFilters> {
  const out: Partial<SearchFilters> = {};
  if (extra.query?.trim()) out.query = extra.query.trim();
  if (extra.keyword?.trim()) out.keyword = extra.keyword.trim();
  for (const key of [
    "priceMin",
    "priceMax",
    "sqftMin",
    "sqftMax",
    "acresMin",
    "acresMax",
    "beds",
    "baths",
  ] as const) {
    const v = extra[key];
    if (typeof v === "string" && v.trim() && v !== "Any") out[key] = v;
  }
  if (extra.office) out.office = true;
  if (extra.garage) out.garage = true;
  if (extra.pool) out.pool = true;
  if (extra.hoa && extra.hoa !== "any") out.hoa = extra.hoa;
  if (extra.propertyTypes?.length) out.propertyTypes = extra.propertyTypes;
  if (extra.statuses?.length) out.statuses = extra.statuses;
  return out;
}

function followedBySize(q: string, matched: string): boolean {
  const after = q.slice(q.toLowerCase().indexOf(matched.toLowerCase()) + matched.length);
  return /^\s*(acre|acres|bed|beds|bedroom|bath|baths)\b/i.test(after);
}

function money(raw: string): string | null {
  const m = raw.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*(k|m)?/i);
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const suf = (m[2] || "").toLowerCase();
  if (suf === "k") n *= 1000;
  if (suf === "m") n *= 1_000_000;
  return String(Math.round(n));
}

function findCity(hay: string) {
  for (const [key, meta] of Object.entries(CITY_SOURCE)) {
    if (new RegExp(`\\b${key}\\b(?!\\s+(?:county|co\\.?))`, "i").test(hay)) {
      return { key, ...meta };
    }
  }
  return null;
}

function findCounty(hay: string) {
  for (const [key, meta] of Object.entries(COUNTY_SOURCE)) {
    if (new RegExp(`\\b${key}\\s+(?:county|co\\.?)\\b`, "i").test(hay)) {
      return { key, ...meta };
    }
  }
  return null;
}

function parseGeography(q: string): SearchGeography {
  const zip = q.match(/\b(\d{5})\b/);
  if (zip) {
    return {
      raw: zip[1],
      kind: "zip",
      labels: [zip[1]],
      inFootprint: "unknown",
      footprintNote: null,
      cadSource: null,
      cadQuery: zip[1],
    };
  }

  const between = q.match(
    /\bbetween\s+([a-z][a-z.\s]+?)\s+and\s+([a-z][a-z.\s]+?)(?:\s+with|\s*$|[.,])/i,
  );
  if (between) {
    const a = findCity(between[1]);
    const b = findCity(between[2]);
    const labels = [a?.label, b?.label].filter(Boolean) as string[];
    const inFootprint = Boolean(a && b);
    return {
      raw: `${between[1].trim()} and ${between[2].trim()}`,
      kind: "between",
      labels,
      inFootprint,
      footprintNote: inFootprint
        ? `Searching ${labels.join(" and ")}.`
        : "Story Home’s records are East Texas launch counties today.",
      cadSource: a?.source ?? b?.source ?? null,
      cadQuery: labels[0] ?? null,
    };
  }

  const outside = OUTSIDE.find((c) => new RegExp(`\\b${c}\\b`, "i").test(q));
  if (outside && !findCity(q) && !findCounty(q)) {
    return {
      raw: outside,
      kind: "city",
      labels: [outside],
      inFootprint: false,
      footprintNote:
        "Story Home’s records are East Texas launch counties today.",
      cadSource: null,
      cadQuery: null,
    };
  }

  const city = findCity(q);
  if (city) {
    return {
      raw: city.label,
      kind: "city",
      labels: [city.label],
      inFootprint: true,
      footprintNote: null,
      cadSource: city.source,
      cadQuery: city.label,
    };
  }

  const county = findCounty(q);
  if (county) {
    return {
      raw: county.label,
      kind: "county",
      labels: [county.label],
      inFootprint: true,
      footprintNote: null,
      cadSource: county.source,
      cadQuery: county.label.replace(/ County$/i, ""),
    };
  }

  if (/\beast texas\b/i.test(q)) {
    return {
      raw: "East Texas",
      kind: "area",
      labels: ["East Texas"],
      inFootprint: true,
      footprintNote: null,
      cadSource: null,
      cadQuery: null,
    };
  }

  const address = q.match(
    /\b(\d{1,6}\s+[a-z0-9.\s]{3,40}(?:st|street|rd|road|dr|drive|ln|lane|ave|avenue|hwy|highway|loop|fm)\b)/i,
  );
  if (address) {
    return {
      raw: address[1].trim(),
      kind: "address",
      labels: [address[1].trim()],
      inFootprint: "unknown",
      footprintNote: null,
      cadSource: null,
      cadQuery: address[1].trim(),
    };
  }

  const knownHint = [...REGION_CITIES, ...SERVICE_COUNTIES.map((c) => c.hubCity)]
    .map((c) => c.toLowerCase())
    .some((c) => q.toLowerCase().includes(c));
  if (knownHint) {
    const hit = findCity(q);
    if (hit) {
      return {
        raw: hit.label,
        kind: "city",
        labels: [hit.label],
        inFootprint: true,
        footprintNote: null,
        cadSource: hit.source,
        cadQuery: hit.label,
      };
    }
  }

  return { ...EMPTY_GEOGRAPHY, raw: q || null };
}

function parseFilters(q: string): Partial<SearchFilters> {
  const filters: Partial<SearchFilters> = {};

  const under = q.match(
    /\b(?:under|below|less than|up to|max(?:imum)?)\s*\$?\s*([\d,]+(?:\.\d+)?\s*[km]?)/i,
  );
  if (under && !followedBySize(q, under[0])) {
    filters.priceMax = money(under[1]) ?? undefined;
  }

  const over = q.match(
    /\b(?:over|above|more than|at least|min(?:imum)?)\s*\$?\s*([\d,]+(?:\.\d+)?\s*[km]?)/i,
  );
  if (over && !followedBySize(q, over[0])) {
    filters.priceMin = money(over[1]) ?? undefined;
  }

  const barePrice = q.match(/\$\s*([\d,]+(?:\.\d+)?\s*[km]?)/i);
  if (barePrice && !filters.priceMax && !filters.priceMin) {
    filters.priceMax = money(barePrice[1]) ?? undefined;
  }

  const acres = q.match(
    /\b(\d+(?:\.\d+)?)\s*\+?\s*(?:acre|acres)\+?\b/i,
  );
  if (acres) filters.acresMin = acres[1];

  const combo = q.match(/\b(\d+)\s*\/\s*(\d+(?:\.\d+)?)\b/);
  if (combo) {
    const bedsN = Number(combo[1]);
    const bathsN = Number(combo[2]);
    if (Number.isFinite(bedsN)) filters.beds = bedsN >= 5 ? "5+" : String(bedsN);
    if (Number.isFinite(bathsN)) filters.baths = bathsN >= 4 ? "4+" : String(bathsN);
  }

  const beds = q.match(/\b(\d+)\s*(?:\+|plus)?\s*(?:bed|beds|bedroom|bedrooms|br)\b/i);
  if (beds) {
    const n = Number(beds[1]);
    filters.beds = n >= 5 ? "5+" : String(n);
  } else {
    const wordBed = q.match(
      /\b(one|two|three|four|five|six)\s+(?:bed|beds|bedroom|bedrooms)\b/i,
    );
    if (wordBed) {
      const n = BED_WORDS[wordBed[1].toLowerCase()];
      if (n) filters.beds = n >= 5 ? "5+" : String(n);
    }
  }

  const baths = q.match(/\b(\d+(?:\.\d+)?)\s*(?:\+|plus)?\s*(?:bath|baths|ba)\b/i);
  if (baths) {
    const n = Number(baths[1]);
    filters.baths = n >= 4 ? "4+" : String(n);
  }

  const kPrice = q.match(/\b(\d{3,4})\s*k\b/i);
  if (kPrice && !filters.priceMax && !filters.priceMin) {
    const after = q.slice(q.search(kPrice[0]) + kPrice[0].length);
    if (!/^\s*(acre|acres)\b/i.test(after)) {
      filters.priceMax = money(kPrice[0]) ?? undefined;
    }
  }

  if (/\bsold\b/i.test(q)) {
    filters.statuses = ["Sold"];
  } else if (/\bfor sale|homes? currently for sale|active listings?\b/i.test(q)) {
    filters.statuses = ["Active", "Option Pending Continue to Show"];
  }

  if (/\b(farm|ranch|land)\b/i.test(q) && !/\bhome|house|bedroom\b/i.test(q)) {
    filters.propertyTypes = ["Farm and Ranch"];
  }

  return filters;
}

function explain(plan: {
  geography: SearchGeography;
  filters: SearchFilters;
  unknowns: string[];
  recordsEligible: boolean;
}): string {
  const bits: string[] = [];
  if (plan.geography.labels.length) {
    bits.push(plan.geography.labels.join(" and "));
  }
  if (plan.filters.acresMin) bits.push(`${plan.filters.acresMin}+ acres`);
  if (plan.filters.priceMax) bits.push(`under $${Number(plan.filters.priceMax).toLocaleString("en-US")}`);
  if (plan.filters.priceMin) bits.push(`over $${Number(plan.filters.priceMin).toLocaleString("en-US")}`);
  if (plan.filters.beds !== "Any") bits.push(`${plan.filters.beds} bed`);
  if (plan.filters.statuses.includes("Sold")) bits.push("Story Home sold listings");
  else bits.push("Story Home listings");
  if (plan.recordsEligible) bits.push("county records for that place");
  let text = bits.length
    ? `Using ${bits.join(", ")}.`
    : "Using the words Story Home can match on listings.";
  if (plan.unknowns.length) {
    text += ` ${plan.unknowns[0]}`;
  }
  if (plan.geography.footprintNote) text += ` ${plan.geography.footprintNote}`;
  return text.trim();
}

/**
 * First-party interpretation. No model. No warehouse. No ranking weights.
 */
export function interpretSearch(
  raw: string,
  advanced?: unknown,
): SearchPlan {
  const q = clampQuery(raw);
  const extra = compactAdvanced(allowlistedAdvanced(advanced));
  const geography = parseGeography(q);
  const parsed = parseFilters(q);
  const preferences: SearchPreference[] = [];
  const unknowns: string[] = [];

  for (const rule of UNKNOWN_RULES) {
    if (rule.re.test(q)) {
      unknowns.push(rule.note);
      if (rule.pref) preferences.push(rule.pref);
    }
  }
  if (/\bclose to town|near town\b/i.test(q)) preferences.push("closeToTown");
  if (/\bland (matters|more)|older home\b/i.test(q)) {
    preferences.push("landOverHouse");
  }
  if (geography.kind === "between") preferences.push("betweenTowns");

  const extraQuery = extra.query?.trim() ?? "";
  const queryForFilters =
    extraQuery && extraQuery !== q
      ? extraQuery
      : geography.labels.length
        ? geography.labels.join(" ")
        : q;

  const filters = mergeFilters(DEFAULT_SEARCH_FILTERS, {
    ...parsed,
    ...extra,
    query: queryForFilters,
    statuses: extra.statuses?.length
      ? extra.statuses
      : parsed.statuses ??
        (["Active", "Option Pending Continue to Show"] as ListingStatus[]),
  });

  const eligible = recordsEligible(geography);
  const wantsRecords =
    eligible &&
    (/\b(acre|acres|land|parcel|property|properties|record)\b/i.test(q) ||
      geography.kind === "address" ||
      geography.kind === "zip");

  const wantsListings = !/\bcounty records? only\b/i.test(q);
  let lane: SearchPlan["lane"] = "listings";
  if (wantsListings && wantsRecords) lane = "both";
  else if (!wantsListings && wantsRecords) lane = "records";

  if (!eligible && lane !== "listings") lane = "listings";

  if (!eligible && /\b(acre|acres|land|parcel|properties)\b/i.test(q) && !geography.cadQuery) {
    unknowns.push(
      "County records need a city, ZIP, address, or name — Story Home does not offer a public acreage catalog.",
    );
  }

  void paidInterpretStatus();
  return {
    rawQuery: q,
    route: "deterministic",
    lane,
    geography,
    filters,
    preferences,
    unknowns: [...new Set(unknowns)],
    explanation: "",
    recordsEligible: eligible && (lane === "records" || lane === "both"),
  };
}

export function finalizePlan(plan: SearchPlan): SearchPlan {
  return {
    ...plan,
    explanation: explain(plan),
    recordsEligible: recordsEligible(plan.geography) && plan.lane !== "listings",
  };
}

/** Rebuild authority from raw query + allowlisted Advanced. Ignore client plans. */
export function authorizeSearchInput(body: unknown): SearchPlan {
  const row =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const q = clampQuery(row.q ?? row.query ?? row.rawQuery);
  const plan = finalizePlan(interpretSearch(q, row.advanced));
  return plan;
}

export function planToMarketplaceParams(plan: SearchPlan): URLSearchParams {
  const p = new URLSearchParams();
  const q = plan.filters.query || plan.rawQuery;
  if (q) p.set("q", q);
  p.set(
    "intent",
    plan.filters.statuses.includes("Sold") ? "sold" : "sale",
  );
  if (plan.filters.priceMin) p.set("priceMin", plan.filters.priceMin);
  if (plan.filters.priceMax) p.set("priceMax", plan.filters.priceMax);
  if (plan.filters.acresMin) p.set("acresMin", plan.filters.acresMin);
  if (plan.filters.acresMax) p.set("acresMax", plan.filters.acresMax);
  if (plan.filters.beds !== "Any") p.set("beds", plan.filters.beds);
  if (plan.filters.baths !== "Any") p.set("baths", plan.filters.baths);
  if (plan.filters.keyword) p.set("keyword", plan.filters.keyword);
  if (plan.filters.sqftMin) p.set("sqftMin", plan.filters.sqftMin);
  if (plan.filters.sqftMax) p.set("sqftMax", plan.filters.sqftMax);
  if (plan.filters.office) p.set("office", "1");
  if (plan.filters.garage) p.set("garage", "1");
  if (plan.filters.pool) p.set("pool", "1");
  if (plan.filters.hoa !== "any") p.set("hoa", plan.filters.hoa);
  if (plan.filters.propertyTypes.length) {
    p.set("types", plan.filters.propertyTypes.join(","));
  }
  const note = plan.unknowns[0] || plan.geography.footprintNote;
  if (note) p.set("note", note);
  return p;
}
