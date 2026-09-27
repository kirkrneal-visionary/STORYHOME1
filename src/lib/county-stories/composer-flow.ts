/**
 * County Stories composer decisions. Pure. The server remains the authority.
 */
import type { CountyStoryListingAction, CountyStoryType } from "@/lib/county-stories/publish";
import { isCountyStoryListingAction, isCountyStoryType } from "@/lib/county-stories/publish";

export const COUNTY_STORY_COMPOSER_STEPS = [
  "loading",
  "suspended",
  "owned",
  "county",
  "type",
  "property",
  "capture",
  "processing",
  "review",
  "captions",
  "access",
  "rules",
  "success",
] as const;

export type CountyStoryComposerStep = (typeof COUNTY_STORY_COMPOSER_STEPS)[number];

export type CountyStoryComposerMode = "create" | "replace";

export type CountyStoryPropertyChoice = "keep" | "change" | "remove" | "add" | "none";

export type CountyStoryComposerSlot = {
  id: string;
  countyFips: string;
  storyDay: string;
  slotNumber: number;
  storyType: CountyStoryType | null;
  listingId: string | null;
  listingLabel: string | null;
  replacementUsed: boolean;
  playing: boolean;
};

export type CountyStoryComposerStatus = {
  ok: true;
  storyDay: string;
  suspended: boolean;
  eligibleAt: string | null;
  slot: CountyStoryComposerSlot | null;
  removal: { reason: string | null } | null;
  pauseRemovals: { date: string; reason: string }[];
};

export function composerEntry(status: CountyStoryComposerStatus): {
  screen: CountyStoryComposerStep;
  mode: CountyStoryComposerMode;
} {
  if (status.suspended) return { screen: "suspended", mode: "create" };
  if (status.slot) return { screen: "owned", mode: "replace" };
  return { screen: "owned", mode: "create" };
}

export function showCreateStory(status: CountyStoryComposerStatus): boolean {
  return !status.suspended && !status.slot;
}

export function showReplaceStory(status: CountyStoryComposerStatus): boolean {
  return !status.suspended && !!status.slot && !status.slot.replacementUsed;
}

export function propertyChoices(opts: {
  mode: CountyStoryComposerMode;
  hasCurrentListing: boolean;
}): CountyStoryPropertyChoice[] {
  if (opts.mode === "create" || !opts.hasCurrentListing) return ["add", "none"];
  return ["keep", "change", "remove"];
}

export function propertyChoiceLabel(choice: CountyStoryPropertyChoice): string {
  switch (choice) {
    case "keep":
      return "Keep current property";
    case "change":
      return "Change property";
    case "remove":
      return "Remove property";
    case "add":
      return "Add a property";
    case "none":
      return "No property";
  }
}

export function replaceListingCommand(
  choice: CountyStoryPropertyChoice,
  listingId: string | null,
):
  | { ok: true; action: CountyStoryListingAction; listingId: string | null }
  | { ok: false; message: string } {
  if (choice === "keep") return { ok: true, action: "keep", listingId: null };
  if (choice === "remove" || choice === "none") {
    return { ok: true, action: "clear", listingId: null };
  }
  if (!listingId) {
    return { ok: false, message: "Choose a property, or continue without one." };
  }
  return { ok: true, action: "set", listingId };
}

export function createListingId(
  choice: CountyStoryPropertyChoice,
  listingId: string | null,
): { ok: true; listingId: string | null } | { ok: false; message: string } {
  if (choice === "none" || choice === "remove" || choice === "keep") {
    return { ok: true, listingId: null };
  }
  if (!listingId) {
    return { ok: false, message: "Choose a property, or continue without one." };
  }
  return { ok: true, listingId };
}

export function nextComposerStep(
  mode: CountyStoryComposerMode,
  step: CountyStoryComposerStep,
): CountyStoryComposerStep | null {
  const create: CountyStoryComposerStep[] = [
    "county",
    "type",
    "property",
    "capture",
    "processing",
    "review",
    "captions",
    "access",
    "rules",
    "success",
  ];
  const replace: CountyStoryComposerStep[] = [
    "type",
    "property",
    "capture",
    "processing",
    "review",
    "captions",
    "access",
    "rules",
    "success",
  ];
  const path = mode === "replace" ? replace : create;
  const index = path.indexOf(step);
  if (index < 0 || index === path.length - 1) return null;
  return path[index + 1] ?? null;
}

export function previousComposerStep(
  mode: CountyStoryComposerMode,
  step: CountyStoryComposerStep,
): CountyStoryComposerStep | null {
  if (step === "success" || step === "suspended" || step === "loading") return null;
  const create: CountyStoryComposerStep[] = [
    "owned",
    "county",
    "type",
    "property",
    "capture",
    "processing",
    "review",
    "captions",
    "access",
    "rules",
  ];
  const replace: CountyStoryComposerStep[] = [
    "owned",
    "type",
    "property",
    "capture",
    "processing",
    "review",
    "captions",
    "access",
    "rules",
  ];
  const path = mode === "replace" ? replace : create;
  const index = path.indexOf(step);
  if (index <= 0) return "owned";
  return path[index - 1] ?? "owned";
}

export function storyTypeLockedOnReplace(): boolean {
  return false;
}

export function immutableReplacementFields(): readonly string[] {
  return ["county", "storyDay", "owner", "slotNumber"];
}

export function publishAttemptKey(parts: {
  mode: CountyStoryComposerMode;
  storyDay: string;
  slotId: string | null;
  mediaId: string;
  storyType: string;
  listingAction: string | null;
  listingId: string | null;
}): string {
  return [
    parts.mode,
    parts.storyDay,
    parts.slotId ?? "",
    parts.mediaId,
    parts.storyType,
    parts.listingAction ?? "",
    parts.listingId ?? "",
  ].join("|");
}

export function isComposerStoryType(value: string | null | undefined): value is CountyStoryType {
  return isCountyStoryType(value);
}

export function isComposerListingAction(
  value: string | null | undefined,
): value is CountyStoryListingAction {
  return isCountyStoryListingAction(value);
}

export const COUNTY_STORY_MAX_RECORD_SEC = 30;
