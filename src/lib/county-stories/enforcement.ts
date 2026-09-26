/**
 * County Stories Wave 4 enforcement constants.
 * Policy hide is admin/service-role only. No UI.
 */

export const COUNTY_STORY_POLICY_REASON_CODES = [
  "generic_solicitation",
  "static_business_card",
  "inappropriate",
  "unauthorized_property",
  "other_policy",
] as const;

export type CountyStoryPolicyReasonCode =
  (typeof COUNTY_STORY_POLICY_REASON_CODES)[number];

export const COUNTY_STORY_ENFORCEMENT_ACTORS = ["admin", "system"] as const;

export type CountyStoryEnforcementActor =
  (typeof COUNTY_STORY_ENFORCEMENT_ACTORS)[number];

export function isCountyStoryPolicyReason(
  value: string | null | undefined,
): value is CountyStoryPolicyReasonCode {
  return (
    !!value &&
    (COUNTY_STORY_POLICY_REASON_CODES as readonly string[]).includes(value)
  );
}

export function isCountyStoryEnforcementActor(
  value: string | null | undefined,
): value is CountyStoryEnforcementActor {
  return (
    !!value &&
    (COUNTY_STORY_ENFORCEMENT_ACTORS as readonly string[]).includes(value)
  );
}
