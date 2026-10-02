"use client";

import { useMemo, useState } from "react";
import { CountyStoryPanel, type CountyStoryPanelView } from "@/components/county-stories/CountyStoryPanel";
import { countyStoryTypeCopy } from "@/lib/county-stories/composer-copy";
import {
  COUNTY_STORY_COMPOSER_STEPS,
  type CountyStoryComposerStep,
} from "@/lib/county-stories/composer-flow";

const SAMPLE_CUES = ["Welcome to Story Home.", "This County has a quiet market this week."];

const SAMPLE_MARKS: Record<string, string> = {
  "48373": "7 / 30",
  "48455": "12 / 30",
  "48005": "Full",
  "48457": "4 / 30",
  "48407": "9 / 30",
  "48291": "18 / 30",
  "48471": "2 / 30",
};

const REVIEW_SCREENS = COUNTY_STORY_COMPOSER_STEPS.filter((step) => step !== "loading");

const SCREEN_LABEL: Record<(typeof REVIEW_SCREENS)[number], string> = {
  suspended: "Paused",
  owned: "Your Story",
  county: "County",
  type: "Story type",
  property: "Property",
  capture: "Record or upload",
  processing: "Preparing",
  review: "Review",
  captions: "Captions",
  access: "Visual check",
  rules: "Rules",
  success: "Published",
};

function isReviewScreen(value: string | undefined): value is (typeof REVIEW_SCREENS)[number] {
  return REVIEW_SCREENS.some((step) => step === value);
}

const SAMPLE_PAUSE_REMOVALS = [
  { date: "September 25, 2026", reason: "General advertising without useful local real estate information" },
  { date: "September 26, 2026", reason: "Static promotional or business card style content" },
  { date: "September 27, 2026", reason: "Property promotion was not authorized" },
];

function sample(
  screen: CountyStoryComposerStep,
  hub: "create" | "replace" | "used",
  removed: boolean,
  showPauseReasons: boolean,
  resume: "create" | "replace" | null,
): CountyStoryPanelView {
  const replace = hub !== "create" && screen !== "county" && screen !== "suspended";
  const hasSlot = replace || screen === "suspended" || screen === "success" || (removed && screen === "owned");
  const countyFull = screen === "county" && hub === "used";
  const marks = { ...SAMPLE_MARKS };
  if (countyFull) marks["48373"] = "Full";
  const workspace =
    screen === "processing" ||
    screen === "review" ||
    screen === "captions" ||
    screen === "access" ||
    screen === "rules";
  return {
    screen,
    mode: replace ? "replace" : "create",
    hasSlot,
    countyFips: "48373",
    countyName: "Polk County",
    capacityLine: null,
    capacityNote: null,
    capacityFull: countyFull,
    storyType: screen === "type" || screen === "owned" || screen === "county" || screen === "suspended" ? null : "local_knowledge",
    propertyChoice: screen === "property" ? (replace ? "keep" : "none") : null,
    listings: [
      { id: "sample", label: "100 Main Street" },
      { id: "lake", label: "42 Lake Drive" },
    ],
    selectedListingId: null,
    currentListingLabel: replace ? "100 Main Street" : null,
    slotNumber: hasSlot ? 12 : null,
    replacementAvailable: hub !== "used" && screen !== "success",
    playing: screen !== "suspended",
    countdown: screen === "suspended" ? "5 days 14 hours" : null,
    eligibleWhen: screen === "suspended" ? "October 2 at 3:00 PM" : null,
    cueTexts: SAMPLE_CUES,
    accessBasis: screen === "access" ? "spoken_audio" : null,
    accessDescription: "",
    rulesChecked: false,
    videoUrl: workspace ? "/county-stories/preview-frame.mp4" : null,
    uploadPercent: screen === "processing" ? 40 : null,
    captionsReady: screen !== "processing",
    processingNote: null,
    error: null,
    busy: false,
    recording: false,
    recordClock: null,
    showRetry: false,
    reviewReady: workspace && screen !== "processing",
    countyMarks: marks,
    showingPauseReasons: showPauseReasons && screen === "suspended",
    removed: removed && screen === "owned",
    removalReason:
      removed && screen === "owned"
        ? "This Story was removed because it was general advertising rather than useful local real estate information."
        : null,
    pauseRemovals: screen === "suspended" ? SAMPLE_PAUSE_REMOVALS : [],
    resumeOffer: resume ? "continue" : null,
    resumeLead: resume === "replace"
      ? "You have an unfinished replacement. Your current Story stays live."
      : resume === "create"
        ? "You have an unfinished Story."
        : null,
    discardConfirm: false,
    draftNotice: null,
  };
}

export function CountyStoryPreview({
  clean = false,
  initialScreen,
  initialHub,
  initialLayout,
  showRemoval = false,
  showPauseReasons = false,
  resume = null,
}: {
  clean?: boolean;
  initialScreen?: string;
  initialHub?: string;
  initialLayout?: string;
  showRemoval?: boolean;
  showPauseReasons?: boolean;
  resume?: "create" | "replace" | null;
}) {
  const [screen, setScreen] = useState<(typeof REVIEW_SCREENS)[number]>(
    isReviewScreen(initialScreen) ? initialScreen : "owned",
  );
  const [hub, setHub] = useState<"create" | "replace" | "used">(
    initialHub === "replace" || initialHub === "used" ? initialHub : "create",
  );
  const [layout, setLayout] = useState<"phone" | "desk">(initialLayout === "desk" ? "desk" : "phone");
  const [whyOpen, setWhyOpen] = useState(showPauseReasons);
  const [draftSaved, setDraftSaved] = useState(resume != null);
  const resumeMode = draftSaved ? (resume === "replace" || hub === "replace" ? "replace" : "create") : null;
  const view = useMemo(() => {
    const next = sample(screen, hub, showRemoval, whyOpen, resumeMode);
    return {
      ...next,
      showingPauseReasons: whyOpen && screen === "suspended",
      hasSlot: resumeMode === "replace" ? true : next.hasSlot,
      mode: resumeMode === "replace" ? "replace" : next.mode,
      countyName: resume === "replace" ? "Polk County" : next.countyName,
    };
  }, [screen, hub, showRemoval, whyOpen, resumeMode]);
  const noop = () => undefined;

  return (
    <main className={clean ? "min-h-dvh bg-[var(--background)] px-4 py-6 text-ink" : "min-h-dvh bg-[var(--background)] px-4 py-8 text-ink"}>
      {clean ? null : (
        <div data-county-story-preview-board>
          <p className="text-sm text-[var(--muted)]">Sample screens. Nothing here publishes a County Story.</p>
          <h1 className="type-page-title mt-2">County Story composer</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
            {countyStoryTypeCopy("local_knowledge").title} and {countyStoryTypeCopy("open_house_property").title} are the only Story types.
          </p>
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Sample screen">
            <button type="button" className="story-press story-cta-secondary" aria-pressed={screen === "owned" && hub === "create"} onClick={() => { setScreen("owned"); setHub("create"); }}>
              Create Story
            </button>
            <button type="button" className="story-press story-cta-secondary" aria-pressed={screen === "owned" && hub === "replace"} onClick={() => { setScreen("owned"); setHub("replace"); }}>
              Replace Story
            </button>
            <button type="button" className="story-press story-cta-secondary" aria-pressed={screen === "owned" && hub === "used"} onClick={() => { setScreen("owned"); setHub("used"); }}>
              Replacement used
            </button>
            <button type="button" className="story-press story-cta-secondary" aria-pressed={screen === "county" && hub === "used"} onClick={() => { setScreen("county"); setHub("used"); }}>
              County full
            </button>
            {REVIEW_SCREENS.filter((step) => step !== "owned").map((step) => (
              <button
                key={step}
                type="button"
                className="story-press story-cta-secondary"
                aria-pressed={screen === step && !(step === "county" && hub === "used")}
                onClick={() => {
                  setHub(step === "success" ? "create" : "replace");
                  setScreen(step);
                }}
              >
                {SCREEN_LABEL[step]}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" className="story-press story-cta-secondary" aria-pressed={layout === "phone"} onClick={() => setLayout("phone")}>
              Phone
            </button>
            <button type="button" className="story-press story-cta-secondary" aria-pressed={layout === "desk"} onClick={() => setLayout("desk")}>
              Desktop
            </button>
          </div>
        </div>
      )}
      <div className={layout === "phone" ? "mx-auto mt-2 max-w-sm" : "mx-auto mt-2 max-w-4xl"} data-county-story-preview-layout={layout}>
        <CountyStoryPanel
          view={view}
          actions={{
            onCreate: () => setScreen("county"),
            onReplace: () => setScreen("type"),
            onCounty: () => undefined,
            onType: () => undefined,
            onPropertyChoice: () => undefined,
            onListing: () => undefined,
            onCue: noop,
            onAccessBasis: noop,
            onAccessDescription: noop,
            onRules: noop,
            onRecord: noop,
            onUpload: noop,
            onContinue: () => {
              const index = REVIEW_SCREENS.indexOf(screen);
              const next = REVIEW_SCREENS[index + 1];
              if (next) setScreen(next);
            },
            onBack: () => {
              const index = REVIEW_SCREENS.indexOf(screen);
              const previous = REVIEW_SCREENS[index - 1];
              if (previous) setScreen(previous);
            },
            onSaveExit: () => {
              setDraftSaved(true);
              setScreen("owned");
            },
            onResume: noop,
            onAskDiscard: noop,
            onCancelDiscard: noop,
            onConfirmDiscard: noop,
            onRetry: noop,
            onShowPauseReasons: () => setWhyOpen(true),
            onClosePauseReasons: () => setWhyOpen(false),
          }}
        />
      </div>
    </main>
  );
}
