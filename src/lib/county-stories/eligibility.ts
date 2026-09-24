/**
 * County Stories publisher eligibility foundation.
 * Mirrors public.county_story_publisher_eligible.
 * brokerage_id is intentionally ignored.
 */

export function countyStoryPublisherEligible(opts: {
  purpose?: string | null;
  brokerageId?: string | null;
}): boolean {
  void opts.brokerageId;
  return (
    opts.purpose === "individual_pro" || opts.purpose === "managing_broker"
  );
}
