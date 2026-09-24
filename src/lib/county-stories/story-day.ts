/**
 * County Stories Story Day — display / test twin.
 * Database public.county_story_day(now()) is publishing authority.
 * Do not use this helper to accept a Story.
 */

export const COUNTY_STORY_TIMEZONE = "America/Chicago";
export const COUNTY_STORY_RESET_HOUR = 8;

function chicagoParts(at: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: COUNTY_STORY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function shiftCalendarDay(
  year: number,
  month: number,
  day: number,
  delta: number,
): { year: number; month: number; day: number } {
  const shifted = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** Canonical Story Day key (YYYY-MM-DD) for a UTC instant. Not publish authority. */
export function countyStoryDayFromInstant(at: Date): string {
  const local = chicagoParts(at);
  if (local.hour < COUNTY_STORY_RESET_HOUR) {
    const prev = shiftCalendarDay(local.year, local.month, local.day, -1);
    return isoDate(prev.year, prev.month, prev.day);
  }
  return isoDate(local.year, local.month, local.day);
}
