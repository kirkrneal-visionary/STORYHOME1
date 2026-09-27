/**
 * Public sentences for a policy-hidden County Story.
 * The server maps a known reason. The client never sees the code, notes, or actor.
 */

const REMOVAL_REASONS: Record<string, string> = {
  generic_solicitation:
    "This Story was removed because it was general advertising rather than useful local real estate information.",
  static_business_card:
    "This Story was removed because it was a business card or static promotion.",
  unauthorized_property:
    "This Story was removed because the property promotion was not authorized.",
  inappropriate:
    "This Story was removed because the content did not meet County Stories posting standards.",
  other_policy:
    "This Story was removed because the content did not meet County Stories posting standards.",
};

const PAUSE_REASONS: Record<string, string> = {
  generic_solicitation: "General advertising without useful local real estate information",
  static_business_card: "Static promotional or business card style content",
  unauthorized_property: "Property promotion was not authorized",
  inappropriate: "Content did not meet County Stories posting standards",
  other_policy: "Content did not meet County Stories posting standards",
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type CountyStoryRemovalNotice = {
  reason: string | null;
};

export type CountyStoryPauseRemoval = {
  date: string;
  reason: string;
};

export function countyStoryRemovalNotice(
  reasonCode: string | null | undefined,
): CountyStoryRemovalNotice {
  const reason = reasonCode ? (REMOVAL_REASONS[reasonCode] ?? null) : null;
  return { reason };
}

export function countyStoryPauseReason(reasonCode: string | null | undefined): string | null {
  if (!reasonCode) return null;
  return PAUSE_REASONS[reasonCode] ?? null;
}

export function countyStoryRemovalDate(occurredAt: string): string | null {
  const when = new Date(occurredAt);
  if (Number.isNaN(when.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(when);
}

/** Qualifying removals inside the seven days that ended when this pause began. */
export function countyStoryPauseRemovalList(
  events: { occurredAt: string; reasonCode: string; qualifies: boolean }[],
  pauseStartsAt: string,
): CountyStoryPauseRemoval[] {
  const end = new Date(pauseStartsAt).getTime();
  if (!Number.isFinite(end)) return [];
  const start = end - WEEK_MS;
  return events
    .filter((event) => event.qualifies)
    .map((event) => ({ ...event, at: new Date(event.occurredAt).getTime() }))
    .filter((event) => Number.isFinite(event.at) && event.at >= start && event.at <= end)
    .sort((a, b) => a.at - b.at)
    .flatMap((event) => {
      const reason = countyStoryPauseReason(event.reasonCode);
      const date = countyStoryRemovalDate(event.occurredAt);
      if (!reason || !date) return [];
      return [{ date, reason }];
    });
}
