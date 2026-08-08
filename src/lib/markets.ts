/**
 * Story Home launch region — East Texas counties.
 * Built by a REALTOR, for REALTORs. Goal: grow beyond national portals.
 */

export type ServiceCounty = {
  name: string;
  fips: string;
  hubCity: string;
};

/** Beginning rollout footprint */
export const SERVICE_COUNTIES: ServiceCounty[] = [
  { name: "Polk County", fips: "48373", hubCity: "Livingston" },
  { name: "Trinity County", fips: "48455", hubCity: "Groveton" },
  { name: "Angelina County", fips: "48005", hubCity: "Lufkin" },
  { name: "Tyler County", fips: "48457", hubCity: "Woodville" },
  { name: "San Jacinto County", fips: "48407", hubCity: "Coldspring" },
  { name: "Liberty County", fips: "48291", hubCity: "Liberty" },
  { name: "Walker County", fips: "48471", hubCity: "Huntsville" },
];

export const REGION = {
  id: "east-texas",
  name: "East Texas",
  state: "TX",
  label: "East Texas",
  tagline: "Polk · Trinity · Angelina · Tyler · San Jacinto · Liberty · Walker",
} as const;

/** Default search focus — largest hub in the launch region */
export const DEFAULT_MARKET = {
  city: "Lufkin",
  state: "TX",
  label: "Lufkin, TX",
  countyFips: "48005",
  countyName: "Angelina County",
  regionLabel: REGION.label,
} as const;

/** Quick-search cities across the seven-county footprint */
export const REGION_CITIES = [
  "Lufkin",
  "Livingston",
  "Huntsville",
  "Liberty",
  "Cleveland",
  "Woodville",
  "Coldspring",
  "Groveton",
  "Diboll",
  "Shepherd",
] as const;

export function getCountyByFips(fips: string) {
  return SERVICE_COUNTIES.find((c) => c.fips === fips) ?? null;
}

export function getCountyByName(name: string) {
  const normalized = name.trim().toLowerCase();
  return (
    SERVICE_COUNTIES.find(
      (c) =>
        c.name.toLowerCase() === normalized ||
        c.name.toLowerCase().replace(" county", "") === normalized,
    ) ?? null
  );
}
