/**
 * P1C-1A Professional geography validation.
 * Reuses Story Home launch-seven FIPS. County name text is not authority.
 * Other Professionals cannot hold this geography.
 */

import { SERVICE_COUNTIES } from "../markets";

export const PROFESSIONAL_LAUNCH_COUNTY_FIPS = SERVICE_COUNTIES.map(
  (county) => county.fips,
) as readonly string[];

const LAUNCH = new Set(PROFESSIONAL_LAUNCH_COUNTY_FIPS);

export const PRIMARY_COUNTY_STATUSES = [
  "requested",
  "effective",
  "rejected",
  "superseded",
] as const;

export const SERVICE_COUNTY_STATUSES = ["current", "ended"] as const;

export function isProfessionalLaunchCountyFips(
  fips: string | null | undefined,
): boolean {
  return !!fips && LAUNCH.has(fips.trim());
}

/** Realtor geography is individual_pro / managing_broker only. */
export function mayHoldRealtorGeography(purpose?: string | null): boolean {
  return purpose === "individual_pro" || purpose === "managing_broker";
}
