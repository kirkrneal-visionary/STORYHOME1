/**
 * DC-3 — Environment desk bundle (wetlands + place + school + zoning context).
 */

import {
  buildZoningContext,
  fetchPlaceAtPoint,
  fetchSchoolDistrictAtPoint,
  type PlaceFact,
  type SchoolDistrictFact,
  type ZoningContextFact,
} from "@/lib/shi/place-tiger";
import {
  fetchWetlandsAtPoint,
  type WetlandsFact,
} from "@/lib/shi/wetlands-nwi";

export type EnvironmentDesk = {
  version: "environment-desk-v1";
  wetlands: WetlandsFact;
  place: PlaceFact;
  schoolDistrict: SchoolDistrictFact;
  zoningContext: ZoningContextFact;
};

export async function fetchEnvironmentAtPoint(opts: {
  countyFips: string;
  lat: number;
  lng: number;
}): Promise<EnvironmentDesk> {
  const [wetlands, place, schoolDistrict] = await Promise.all([
    fetchWetlandsAtPoint(opts),
    fetchPlaceAtPoint(opts),
    fetchSchoolDistrictAtPoint(opts),
  ]);

  const zoningContext = buildZoningContext({
    ...opts,
    place,
    queriedAt: new Date().toISOString(),
  });

  return {
    version: "environment-desk-v1",
    wetlands,
    place,
    schoolDistrict,
    zoningContext,
  };
}
