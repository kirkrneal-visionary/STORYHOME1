/**
 * Pro listing model + MLS import parsing for Story Pro "My Listings".
 *
 * Pure module (no React, no browser APIs) so the parser and mappers can be
 * reused and tested. The client-side store lives in
 * `src/components/broker/proListingsStore.ts`.
 */

import { DEMO_LISTINGS } from "@/lib/demo-data";
import type { ListingDraft } from "@/lib/listing-compliance";
import type { ListingStatus, PropertyType } from "@/lib/listing-filters";
import { PROPERTY_TYPES } from "@/lib/listing-filters";

export type ProListing = {
  id: string;
  mlsNumber: string;
  streetAddress: string;
  city: string;
  countyName: string;
  state: string;
  zip: string;
  price: number;
  propertyType: PropertyType | "";
  status: ListingStatus;
  beds: number;
  baths: number;
  sqft: number;
  acres: number;
  yearBuilt: number;
  description: string;
  brokerageName: string;
  listingAgentName: string;
  listingAgentLicense: string;
  photos: string[];
  leadPaintDisclosureProvided: boolean;
  sellersDisclosureProvided: boolean;
  source: "manual" | "mls-import" | "seed";
  updatedAt: number;
};

/** Approximate ZIP codes for the East Texas demo cities. */
const CITY_ZIP: Record<string, string> = {
  Livingston: "77351",
  Huntsville: "77320",
  Lufkin: "75901",
  Woodville: "75979",
  Groveton: "75845",
  Liberty: "77575",
  Coldspring: "77331",
  Cleveland: "77327",
  Diboll: "75941",
};

export function zipForCity(city: string): string {
  return CITY_ZIP[city.trim()] ?? "";
}

export function emptyProListing(overrides: Partial<ProListing> = {}): ProListing {
  return {
    id: `listing-${Math.random().toString(36).slice(2, 10)}`,
    mlsNumber: "",
    streetAddress: "",
    city: "",
    countyName: "",
    state: "TX",
    zip: "",
    price: 0,
    propertyType: "",
    status: "Active",
    beds: 0,
    baths: 0,
    sqft: 0,
    acres: 0,
    yearBuilt: 0,
    description: "",
    brokerageName: "Story Home Realty",
    listingAgentName: "",
    listingAgentLicense: "",
    photos: [],
    leadPaintDisclosureProvided: false,
    sellersDisclosureProvided: false,
    source: "manual",
    updatedAt: Date.now(),
    ...overrides,
  };
}

/** Map a ProListing into the compliance-engine draft shape. */
export function toListingDraft(listing: ProListing): ListingDraft {
  return {
    streetAddress: listing.streetAddress,
    city: listing.city,
    countyName: listing.countyName,
    state: listing.state,
    zip: listing.zip,
    price: listing.price,
    propertyType: listing.propertyType,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft,
    acres: listing.acres,
    yearBuilt: listing.yearBuilt,
    description: listing.description,
    brokerageName: listing.brokerageName,
    listingAgentName: listing.listingAgentName,
    listingAgentLicense: listing.listingAgentLicense,
    photos: listing.photos,
    leadPaintDisclosureProvided: listing.leadPaintDisclosureProvided,
    sellersDisclosureProvided: listing.sellersDisclosureProvided,
  };
}

/** Statuses that mean the listing is no longer for sale (auto de-list). */
export const SOLD_LIKE_STATUSES: ListingStatus[] = [
  "Sold",
  "Withdrawn",
  "Terminated",
  "Expired",
];

export function isLiveStatus(status: ListingStatus): boolean {
  return !SOLD_LIKE_STATUSES.includes(status);
}

/** Seed a pro's book from the shared demo listings. */
export function seedProListings(agent: {
  name: string;
  license: string;
  brokerage: string;
}): ProListing[] {
  return DEMO_LISTINGS.map((l, i) => ({
    id: l.id,
    mlsNumber: `ETX${(1000 + i).toString()}`,
    streetAddress: l.addressSerif,
    city: l.city,
    countyName: l.countyName,
    state: "TX",
    zip: zipForCity(l.city),
    price: l.price,
    propertyType: l.propertyType,
    status: l.status,
    beds: l.beds,
    baths: l.baths,
    sqft: l.sqft,
    acres: l.acres,
    yearBuilt: l.yearBuilt,
    description: l.description,
    brokerageName: agent.brokerage,
    listingAgentName: agent.name,
    listingAgentLicense: agent.license,
    photos: [l.photoUrl],
    // Seeded demo listings are treated as fully disclosed so they are compliant.
    leadPaintDisclosureProvided: true,
    sellersDisclosureProvided: true,
    source: "seed" as const,
    updatedAt: Date.now() - i * 86_400_000,
  }));
}

const NUM_KEYS = new Set([
  "price",
  "beds",
  "baths",
  "sqft",
  "acres",
  "yearBuilt",
]);

/** Map of accepted MLS field labels (lowercased) to ProListing keys. */
const MLS_FIELD_ALIASES: Record<string, keyof ProListing> = {
  "mls": "mlsNumber",
  "mls#": "mlsNumber",
  "mls #": "mlsNumber",
  "mls number": "mlsNumber",
  "address": "streetAddress",
  "street address": "streetAddress",
  "street": "streetAddress",
  "city": "city",
  "county": "countyName",
  "state": "state",
  "zip": "zip",
  "zip code": "zip",
  "postal code": "zip",
  "price": "price",
  "list price": "price",
  "property type": "propertyType",
  "type": "propertyType",
  "status": "status",
  "beds": "beds",
  "bedrooms": "beds",
  "br": "beds",
  "baths": "baths",
  "bathrooms": "baths",
  "ba": "baths",
  "sqft": "sqft",
  "sq ft": "sqft",
  "square feet": "sqft",
  "living area": "sqft",
  "acres": "acres",
  "lot size": "acres",
  "year built": "yearBuilt",
  "yr built": "yearBuilt",
  "brokerage": "brokerageName",
  "broker": "brokerageName",
  "office": "brokerageName",
  "agent": "listingAgentName",
  "listing agent": "listingAgentName",
  "license": "listingAgentLicense",
  "license #": "listingAgentLicense",
  "license number": "listingAgentLicense",
  "description": "description",
  "remarks": "description",
  "public remarks": "description",
};

function toNumber(raw: string): number {
  const n = parseFloat(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function normalizePropertyType(raw: string): PropertyType | "" {
  const found = PROPERTY_TYPES.find(
    (t) => t.toLowerCase() === raw.trim().toLowerCase(),
  );
  return found ?? "";
}

/**
 * Parse pasted MLS data ("Key: Value" lines, one per line) into a partial
 * ProListing. Unknown lines are ignored; numeric fields are cleaned of
 * currency/commas. This mirrors copy/paste from an MLS detail sheet.
 */
export function parseMlsPaste(text: string): Partial<ProListing> {
  const result: Partial<ProListing> = {};
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const label = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!value) continue;

    const key = MLS_FIELD_ALIASES[label];
    if (!key) continue;

    if (NUM_KEYS.has(key)) {
      (result as Record<string, unknown>)[key] = toNumber(value);
    } else if (key === "propertyType") {
      result.propertyType = normalizePropertyType(value);
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  // Backfill ZIP from a recognized city when the paste omitted it.
  if (!result.zip && result.city) {
    const zip = zipForCity(result.city);
    if (zip) result.zip = zip;
  }

  return result;
}
