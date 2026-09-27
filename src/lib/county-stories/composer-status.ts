/**
 * Composer reads for the signed-in publisher. Service role only.
 * Omits strike counts, admin notes, and reason history.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { readCountyStorySuspension } from "@/lib/county-stories/enforcement-service";
import { countyStoryCountyName } from "@/lib/county-stories/composer-copy";
import type { CountyStoryComposerStatus } from "@/lib/county-stories/composer-flow";
import { isCountyStoryType } from "@/lib/county-stories/publish";

export async function readCountyStoryComposerStatus(opts: {
  admin: SupabaseClient;
  ownerId: string;
}): Promise<CountyStoryComposerStatus | { ok: false }> {
  const dayResult = await opts.admin.rpc("county_story_day");
  const storyDay = typeof dayResult.data === "string" ? dayResult.data.slice(0, 10) : null;
  if (dayResult.error || !storyDay) return { ok: false };

  const suspension = await readCountyStorySuspension({
    admin: opts.admin,
    ownerId: opts.ownerId,
  });
  if (!suspension.ok) return { ok: false };

  const { data: slotRow, error: slotError } = await opts.admin
    .from("county_story_slots")
    .select("id, county_fips, story_day, slot_number, story_type, listing_id, replacement_used, state")
    .eq("professional_owner_id", opts.ownerId)
    .eq("story_day", storyDay)
    .maybeSingle();
  if (slotError) return { ok: false };

  let listingLabel: string | null = null;
  if (slotRow?.listing_id) {
    const { data: listing } = await opts.admin
      .from("listings")
      .select("address_serif, city")
      .eq("id", slotRow.listing_id)
      .maybeSingle();
    if (listing) {
      listingLabel = [listing.address_serif, listing.city].filter(Boolean).join(", ") || null;
    }
  }

  const storyType = isCountyStoryType(slotRow?.story_type) ? slotRow.story_type : null;
  return {
    ok: true,
    storyDay,
    suspended: suspension.suspended === true,
    eligibleAt: suspension.eligible_at ?? null,
    slot: slotRow
      ? {
          id: slotRow.id,
          countyFips: slotRow.county_fips,
          storyDay: String(slotRow.story_day).slice(0, 10),
          slotNumber: slotRow.slot_number,
          storyType,
          listingId: slotRow.listing_id ?? null,
          listingLabel,
          replacementUsed: slotRow.replacement_used === true,
          playing: slotRow.state === "accepted",
        }
      : null,
  };
}

export async function listAttachableCountyStoryListings(opts: {
  admin: SupabaseClient;
  ownerId: string;
  brokerageId: string | null;
  accountPurpose: string | null;
  countyFips: string;
  slotId?: string | null;
}): Promise<{ id: string; label: string }[]> {
  const { data, error } = await opts.admin
    .from("listings")
    .select("id, address_serif, city, agent_id, brokerage_id")
    .eq("county_fips", opts.countyFips)
    .limit(80);
  if (error || !data) return [];

  const broker = opts.accountPurpose === "managing_broker" && !!opts.brokerageId;
  const allowed = data.filter((row) => {
    if (row.agent_id === opts.ownerId) return true;
    if (broker && row.brokerage_id && row.brokerage_id === opts.brokerageId) return true;
    return false;
  });

  let blocked = new Set<string>();
  if (opts.slotId) {
    const { data: slot } = await opts.admin
      .from("county_story_slots")
      .select("id, professional_owner_id")
      .eq("id", opts.slotId)
      .maybeSingle();
    if (slot && slot.professional_owner_id === opts.ownerId) {
      const { data: events } = await opts.admin
        .from("county_story_enforcement_events")
        .select("prior_listing_id")
        .eq("slot_id", opts.slotId)
        .eq("reason_code", "unauthorized_property");
      blocked = new Set(
        (events ?? [])
          .map((event) => event.prior_listing_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      );
    }
  }

  return allowed
    .filter((row) => !blocked.has(row.id))
    .map((row) => ({
      id: row.id,
      label: [row.address_serif, row.city].filter(Boolean).join(", ") || "Property",
    }));
}

export function composerCountyLabel(fips: string): string {
  return countyStoryCountyName(fips);
}
