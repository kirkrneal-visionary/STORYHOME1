import type { CountyStoryType } from "@/lib/county-stories/publish";
import type {
  CountyStoryComposerMode,
  CountyStoryComposerStep,
  CountyStoryPropertyChoice,
} from "@/lib/county-stories/composer-flow";

/** Client-only unfinished Story. Never a County Story position and never a rules acknowledgment. */
export type CountyStoryDraft = {
  version: 1;
  mode: CountyStoryComposerMode;
  slotId: string | null;
  screen: CountyStoryComposerStep;
  countyFips: string | null;
  storyType: CountyStoryType | null;
  propertyChoice: CountyStoryPropertyChoice | null;
  selectedListingId: string | null;
  mediaId: string | null;
  cueTexts: string[];
  accessBasis: "spoken_audio" | "supplied_description" | null;
  accessDescription: string;
  savedAt: string;
};

const STORAGE_PREFIX = "story-home-county-story-draft:";

const SCREENS: CountyStoryComposerStep[] = [
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

export function viewToCountyStoryDraft(input: {
  mode: CountyStoryComposerMode;
  slotId: string | null;
  screen: CountyStoryComposerStep;
  countyFips: string | null;
  storyType: CountyStoryType | null;
  propertyChoice: CountyStoryPropertyChoice | null;
  selectedListingId: string | null;
  mediaId: string | null;
  cueTexts: string[];
  accessBasis: CountyStoryDraft["accessBasis"];
  accessDescription: string;
}): CountyStoryDraft {
  return {
    version: 1,
    mode: input.mode,
    slotId: input.slotId,
    screen: input.screen,
    countyFips: input.countyFips,
    storyType: input.storyType,
    propertyChoice: input.propertyChoice,
    selectedListingId: input.selectedListingId,
    mediaId: input.mediaId,
    cueTexts: input.cueTexts,
    accessBasis: input.accessBasis,
    accessDescription: input.accessDescription,
    savedAt: new Date().toISOString(),
  };
}

export function countyStoryDraftKey(ownerId: string): string {
  return `${STORAGE_PREFIX}${ownerId}`;
}

export function draftHasProgress(draft: CountyStoryDraft): boolean {
  return Boolean(
    draft.countyFips ||
      draft.storyType ||
      draft.propertyChoice ||
      draft.selectedListingId ||
      draft.mediaId ||
      draft.accessBasis ||
      draft.accessDescription.trim() ||
      draft.cueTexts.some((line) => line.trim()) ||
      (draft.mode === "replace" && draft.screen !== "owned"),
  );
}

export function parseCountyStoryDraft(raw: string | null): CountyStoryDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CountyStoryDraft>;
    if (value.version !== 1) return null;
    if (value.mode !== "create" && value.mode !== "replace") return null;
    if (!value.screen || !SCREENS.includes(value.screen)) return null;
    const draft: CountyStoryDraft = {
      version: 1,
      mode: value.mode,
      slotId: typeof value.slotId === "string" ? value.slotId : null,
      screen: value.screen,
      countyFips: typeof value.countyFips === "string" ? value.countyFips : null,
      storyType:
        value.storyType === "local_knowledge" || value.storyType === "open_house_property"
          ? value.storyType
          : null,
      propertyChoice:
        value.propertyChoice === "keep" ||
        value.propertyChoice === "change" ||
        value.propertyChoice === "remove" ||
        value.propertyChoice === "add" ||
        value.propertyChoice === "none"
          ? value.propertyChoice
          : null,
      selectedListingId: typeof value.selectedListingId === "string" ? value.selectedListingId : null,
      mediaId: typeof value.mediaId === "string" ? value.mediaId : null,
      cueTexts: Array.isArray(value.cueTexts) ? value.cueTexts.filter((line) => typeof line === "string") : [],
      accessBasis:
        value.accessBasis === "spoken_audio" || value.accessBasis === "supplied_description"
          ? value.accessBasis
          : null,
      accessDescription: typeof value.accessDescription === "string" ? value.accessDescription : "",
      savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date(0).toISOString(),
    };
    return draftHasProgress(draft) ? draft : null;
  } catch {
    return null;
  }
}

export function serializeCountyStoryDraft(draft: CountyStoryDraft): string {
  const stored: CountyStoryDraft = {
    version: 1,
    mode: draft.mode,
    slotId: draft.slotId,
    screen: draft.screen,
    countyFips: draft.countyFips,
    storyType: draft.storyType,
    propertyChoice: draft.propertyChoice,
    selectedListingId: draft.selectedListingId,
    mediaId: draft.mediaId,
    cueTexts: draft.cueTexts,
    accessBasis: draft.accessBasis,
    accessDescription: draft.accessDescription,
    savedAt: draft.savedAt,
  };
  return JSON.stringify(stored);
}

export type DraftResume =
  | { kind: "none" }
  | { kind: "continue"; draft: CountyStoryDraft; lead: string }
  | { kind: "blocked"; draft: CountyStoryDraft; lead: string };

export function draftResume(opts: {
  draft: CountyStoryDraft | null;
  suspended: boolean;
  hasSlot: boolean;
  slotId: string | null;
  replacementAvailable: boolean;
}): DraftResume {
  if (!opts.draft || opts.suspended) return { kind: "none" };
  if (opts.draft.mode === "create" && opts.hasSlot) {
    return {
      kind: "blocked",
      draft: opts.draft,
      lead: "You already have today’s Story. This unfinished draft was not published. Your published Story is unchanged.",
    };
  }
  if (opts.draft.mode === "replace" && !opts.hasSlot) {
    return {
      kind: "blocked",
      draft: opts.draft,
      lead: "Today’s Story is no longer here, so this replacement draft cannot be published.",
    };
  }
  if (opts.draft.mode === "replace" && opts.slotId && opts.draft.slotId && opts.draft.slotId !== opts.slotId) {
    return {
      kind: "blocked",
      draft: opts.draft,
      lead: "This replacement draft is for a different Story. Your current Story was not changed.",
    };
  }
  if (opts.draft.mode === "replace" && !opts.replacementAvailable) {
    return {
      kind: "blocked",
      draft: opts.draft,
      lead: "Today’s replacement has already been used. This unfinished draft was not published. Your current Story is unchanged.",
    };
  }
  return {
    kind: "continue",
    draft: opts.draft,
    lead:
      opts.draft.mode === "replace"
        ? "You have an unfinished replacement. Your current Story stays live."
        : "You have an unfinished Story.",
  };
}

export function readCountyStoryDraft(ownerId: string): CountyStoryDraft | null {
  if (typeof window === "undefined" || !ownerId) return null;
  try {
    return parseCountyStoryDraft(window.localStorage.getItem(countyStoryDraftKey(ownerId)));
  } catch {
    return null;
  }
}

export function writeCountyStoryDraft(ownerId: string, draft: CountyStoryDraft): void {
  if (typeof window === "undefined" || !ownerId || !draftHasProgress(draft)) return;
  try {
    window.localStorage.setItem(countyStoryDraftKey(ownerId), serializeCountyStoryDraft(draft));
  } catch {
    /* The Story can still be finished in this visit. */
  }
}

export function clearCountyStoryDraft(ownerId: string): void {
  if (typeof window === "undefined" || !ownerId) return;
  try {
    window.localStorage.removeItem(countyStoryDraftKey(ownerId));
  } catch {
    /* ignore */
  }
}
