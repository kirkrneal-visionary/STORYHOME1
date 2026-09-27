/**
 * Plain language for the County Stories composer.
 * No codec names, no strike math, no database wording.
 */
import { SERVICE_COUNTIES } from "@/lib/markets";
import { COUNTY_STORY_MAX_SLOTS, type CountyStoryType } from "@/lib/county-stories/publish";

export const COUNTY_STORY_RULES_COPY = [
  "The Story must share useful local real estate knowledge, or a real property or open house.",
  "Once accepted, it uses today’s County Story opportunity.",
  "Only one replacement is allowed.",
  "A Story removed for a policy violation does not reopen that County spot.",
  "Repeated qualifying removals can pause County Story posting for a while.",
] as const;

export function countyStoryCountyName(fips: string | null | undefined): string {
  const match = SERVICE_COUNTIES.find((county) => county.fips === fips);
  return match?.name ?? "This County";
}

export function countyStoryTypeCopy(type: CountyStoryType): { title: string; body: string } {
  if (type === "open_house_property") {
    return {
      title: "Open House / Property",
      body: "A real property or open-house Story.",
    };
  }
  return {
    title: "Local Knowledge",
    body: "Useful real estate education specific to this County.",
  };
}

export function countyStoryCapacityCopy(accepted: number, max = COUNTY_STORY_MAX_SLOTS): {
  line: string;
  note: string;
  full: boolean;
} {
  const safe = Number.isFinite(accepted) ? Math.max(0, Math.floor(accepted)) : 0;
  const full = safe >= max;
  if (full) {
    return {
      line: `${max} / ${max}`,
      note: "Full for Today",
      full: true,
    };
  }
  return {
    line: `${safe} / ${max} Stories today`,
    note: "This count is live and can change until Publish succeeds. An open spot is not held for you.",
    full: false,
  };
}

export function countyStoryEligibleWhen(eligibleAt: string | null | undefined): string | null {
  if (!eligibleAt) return null;
  const when = new Date(eligibleAt);
  if (Number.isNaN(when.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(when);
}

/** Display-only countdown from the server timestamp. The timestamp stays the authority. */
export function countyStoryCountdown(eligibleAt: string, now: Date): string | null {
  const end = new Date(eligibleAt).getTime();
  if (!Number.isFinite(end)) return null;
  const ms = end - now.getTime();
  if (ms <= 0) return "Eligible again now";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
  const minutes = totalMinutes - days * 24 * 60 - hours * 60;
  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"} ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  const shown = Math.max(1, minutes);
  return `${shown} minute${shown === 1 ? "" : "s"}`;
}

export function countyStoryComposerMessage(
  code: string | null | undefined,
  eligibleAt?: string | null,
): string {
  switch (code) {
    case "FEATURE_DISABLED":
      return "County Stories are not available yet.";
    case "COUNTY_FULL":
      return "This County filled before your Story was accepted. Your video is still here. This does not use today’s opportunity, and it is not a penalty.";
    case "ALREADY_POSTED":
      return "You already own today’s County Story.";
    case "REPLACEMENT_ALREADY_USED":
      return "Today’s replacement has already been used.";
    case "POSTING_SUSPENDED": {
      const when = countyStoryEligibleWhen(eligibleAt);
      return when
        ? `County Stories posting is paused until ${when}.`
        : "County Stories posting is paused.";
    }
    case "PLAYBACK_NOT_READY":
    case "PROVIDER_PROCESSING":
      return "Your video is still being prepared.";
    case "ACCESSIBILITY_NOT_READY":
      return "Finish reviewing captions and the visual check before publishing.";
    case "CAPTIONS_REQUIRED":
      return "Review and confirm the captions before publishing.";
    case "CAPTION_REVISION_CONFLICT":
      return "The captions changed. Review them again, then confirm.";
    case "LISTING_NOT_AUTHORIZED":
      return "You can’t use that property on this Story.";
    case "LISTING_COUNTY_MISMATCH":
      return "That property is in a different County.";
    case "VIDEO_TOO_LONG":
      return "County Stories are 30 seconds or shorter.";
    case "INVALID_MEDIA_TYPE":
      return "County Stories are video only.";
    case "FILE_TOO_LARGE":
      return "That video is too large to upload.";
    case "PROVIDER_UNAVAILABLE":
    case "PROVIDER_ERRORED":
      return "We could not prepare this video. You can try again.";
    case "IDEMPOTENCY_CONFLICT":
      return "This try does not match the Story already sent. Review it and try again.";
    case "MEDIA_NOT_VALID":
    case "INVALID_MEDIA":
    case "UNSUPPORTED_CODEC":
      return "This video could not be used. Try recording again or choose another video.";
    case "STORY_DAY_ENDED":
      return "Today’s County Story day has ended.";
    case "COUNTY_INACTIVE":
      return "That County is not open for Stories.";
    case "RULES_REQUIRED":
      return "Review and confirm the County Stories rules before publishing.";
    case "NOT_SLOT_OWNER":
      return "This County Story belongs to another professional.";
    default:
      return "That Story could not be accepted. Review the details and try again.";
  }
}
