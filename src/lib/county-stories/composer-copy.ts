/**
 * Plain language for the County Stories composer.
 * No codec names, no strike math, no database wording.
 */
import { SERVICE_COUNTIES } from "@/lib/markets";
import { COUNTY_STORY_MAX_SLOTS, type CountyStoryType } from "@/lib/county-stories/publish";

export const COUNTY_STORY_RULES_SECTIONS = [
  {
    heading: "What belongs in County Stories",
    paragraphs: [
      "County Stories are for useful local real estate knowledge and legitimate property or open house information.",
      "Share information that helps people understand the County, its real estate, land, homes, or a property you are authorized to promote.",
      "General advertising, business card videos, and simple call me promotions do not qualify.",
    ],
  },
  {
    heading: "Your County position",
    paragraphs: [
      "Once your Story is accepted, your County position is used for the day.",
      "If Story Home later removes the Story for a posting rule violation, that position is not reopened.",
    ],
  },
  {
    heading: "Your one replacement",
    paragraphs: [
      "You may replace today’s Story one time.",
      "Your current Story remains active until the replacement is successfully published.",
      "A replacement does not erase a previous removal.",
    ],
  },
  {
    heading: "When posting can be paused",
    paragraphs: [
      "A Story removed for a qualifying posting rule violation remains on your County Stories posting record.",
      "Three qualifying removals within any seven day period pause County Stories posting for seven days beginning with the third removal.",
      "Technical upload, processing, connection, or system failures do not count as posting violations.",
    ],
  },
  {
    heading: "Before you continue",
    paragraphs: [
      "Review your video, captions, County, Story type, and property information carefully.",
      "You are responsible for making sure your Story is accurate, authorized, and appropriate for County Stories.",
    ],
  },
] as const;

export const COUNTY_STORY_RULES_CONFIRM =
  "I reviewed this Story and understand the County Stories posting rules.";

export function countyStoryCountyName(fips: string | null | undefined): string {
  const match = SERVICE_COUNTIES.find((county) => county.fips === fips);
  return match?.name ?? "This County";
}

export function countyStoryTypeCopy(type: CountyStoryType): { title: string; body: string } {
  if (type === "open_house_property") {
    return {
      title: "Open House / Property",
      body: "Share a property or open house in this County.",
    };
  }
  return {
    title: "Local Knowledge",
    body: "Teach buyers or sellers something useful about this County.",
  };
}

/** Short count for the County list. Full means no room today. */
export function countyStoryCapacityMark(accepted: number, max = COUNTY_STORY_MAX_SLOTS): string {
  const safe = Number.isFinite(accepted) ? Math.max(0, Math.floor(accepted)) : 0;
  if (safe >= max) return "Full";
  return `${safe} / ${max}`;
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
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "long",
    day: "numeric",
  }).format(when);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
  }).format(when);
  return `${date} at ${time}`;
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
