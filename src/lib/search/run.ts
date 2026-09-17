import { applySearchFilters } from "@/lib/listing-filters";
import { boundedCadSearch } from "@/lib/cad/bounded-search";
import { consumeCadAccess } from "@/lib/cad/public-access";
import { LISTING_SELECT, rowToListing } from "@/lib/listings-map";
import type { DemoListing } from "@/lib/demo-data";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  SMART_SEARCH_LISTING_CAP,
  SMART_SEARCH_RECORD_CAP,
  type SearchPlan,
} from "@/lib/search/plan";

export type SmartSearchRecord = {
  id: string;
  source: string;
  countyFips: string | null;
  propId: string;
  ownerName: string | null;
  situsAddress: string | null;
  situsCity: string | null;
  situsZip: string | null;
  legalAcreage: number | null;
  centroidLat: number | null;
  centroidLng: number | null;
};

type SlimCad = SmartSearchRecord;

export type SmartSearchRun = {
  plan: SearchPlan;
  listings: DemoListing[];
  records: SmartSearchRecord[];
  listingCap: number;
  recordCap: number;
};

function slimRecord(p: SlimCad): SmartSearchRecord {
  return {
    id: p.id,
    source: p.source,
    countyFips: p.countyFips,
    propId: p.propId,
    ownerName: p.ownerName,
    situsAddress: p.situsAddress,
    situsCity: p.situsCity,
    situsZip: p.situsZip,
    legalAcreage: p.legalAcreage,
    centroidLat: p.centroidLat,
    centroidLng: p.centroidLng,
  };
}

async function loadListings(): Promise<DemoListing[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToListing);
}

export async function runAuthorizedPlan(
  plan: SearchPlan,
  ip: string,
): Promise<SmartSearchRun> {
  const listings =
    plan.lane === "records"
      ? []
      : applySearchFilters(await loadListings(), plan.filters).slice(
          0,
          SMART_SEARCH_LISTING_CAP,
        );

  let records: SmartSearchRecord[] = [];
  if (plan.recordsEligible && plan.geography.cadQuery) {
    const cadHit = consumeCadAccess({ lane: "search", ip });
    if (cadHit.ok) {
      const acresMin = Number(plan.filters.acresMin);
      const found = await boundedCadSearch({
        query: plan.geography.cadQuery,
        source: plan.geography.cadSource ?? undefined,
        field: plan.geography.kind === "address" ? "address" : "all",
        limit: SMART_SEARCH_RECORD_CAP,
      });
      const narrowed =
        Number.isFinite(acresMin) && acresMin > 0
          ? found.filter(
              (p) => p.legalAcreage != null && p.legalAcreage >= acresMin,
            )
          : found;
      records = narrowed.slice(0, SMART_SEARCH_RECORD_CAP).map(slimRecord);
    }
  }

  return {
    plan,
    listings,
    records,
    listingCap: SMART_SEARCH_LISTING_CAP,
    recordCap: SMART_SEARCH_RECORD_CAP,
  };
}
