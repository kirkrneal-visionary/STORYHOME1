/**
 * Public sentences for a policy-hidden County Story.
 * The server maps a known reason. The client never sees the code, notes, or actor.
 */

const REMOVAL_SUMMARY =
  "Your County Story was removed because it did not meet County Stories posting rules.";

const REMOVAL_DETAILS: Record<string, string> = {
  generic_solicitation:
    "Content was general advertising rather than useful local real estate information.",
  static_business_card: "The Story used a business card or static promotional format.",
  unauthorized_property: "The property promotion was not authorized.",
  inappropriate: "The content did not meet County Stories standards.",
  other_policy: "The content did not meet County Stories standards.",
};

export type CountyStoryRemovalNotice = {
  summary: string;
  detail: string | null;
};

export function countyStoryRemovalNotice(
  reasonCode: string | null | undefined,
): CountyStoryRemovalNotice {
  const detail = reasonCode ? (REMOVAL_DETAILS[reasonCode] ?? null) : null;
  return { summary: REMOVAL_SUMMARY, detail };
}
