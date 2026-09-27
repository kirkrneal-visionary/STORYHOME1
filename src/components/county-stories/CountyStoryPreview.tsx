"use client";

import { useMemo, useState } from "react";
import { CountyStoryPanel, type CountyStoryPanelView } from "@/components/county-stories/CountyStoryPanel";
import { countyStoryCapacityCopy, countyStoryTypeCopy } from "@/lib/county-stories/composer-copy";
import {
  COUNTY_STORY_COMPOSER_STEPS,
  type CountyStoryComposerStep,
} from "@/lib/county-stories/composer-flow";

const SAMPLE_CUES = ["Welcome to Story Home.", "This County has a quiet market this week."];

function sample(screen: CountyStoryComposerStep, hub: "create" | "replace" | "used"): CountyStoryPanelView {
  const capacity = screen === "rules" ? countyStoryCapacityCopy(29) : countyStoryCapacityCopy(7);
  const full = screen === "county" && hub === "used" ? countyStoryCapacityCopy(30) : capacity;
  const replace = hub !== "create" && screen !== "county" && screen !== "suspended";
  const hasSlot = replace || screen === "suspended" || screen === "success";
  return {
    screen,
    mode: replace ? "replace" : "create",
    hasSlot,
    countyFips: "48373",
    countyName: "Polk County",
    capacityLine: screen === "county" || screen === "rules" || replace ? full.line : capacity.line,
    capacityNote: full.full ? full.note : capacity.note,
    capacityFull: full.full,
    storyType: "local_knowledge",
    propertyChoice: screen === "property" ? (replace ? "keep" : "none") : null,
    listings: [{ id: "sample", label: "100 Main Street, Livingston" }],
    selectedListingId: null,
    currentListingLabel: replace || screen === "owned" ? "100 Main Street, Livingston" : null,
    slotNumber: hasSlot ? 12 : null,
    replacementAvailable: hub !== "used" && screen !== "success",
    playing: screen !== "suspended",
    countdown: screen === "suspended" ? "5 days 14 hours" : null,
    eligibleWhen: screen === "suspended" ? "Thu, Oct 2, 3:00 PM CDT" : null,
    cueTexts: SAMPLE_CUES,
    accessBasis: screen === "access" ? "spoken_audio" : null,
    accessDescription: "",
    rulesChecked: false,
    videoUrl: null,
    processingNote: screen === "processing" ? "Preparing your video." : null,
    error: null,
    busy: false,
    recording: false,
    recordClock: null,
    showRetry: false,
  };
}

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

export function CountyStoryPreview() {
  const [screen, setScreen] = useState<(typeof REVIEW_SCREENS)[number]>("owned");
  const [hub, setHub] = useState<"create" | "replace" | "used">("create");
  const [layout, setLayout] = useState<"phone" | "desk">("phone");
  const view = useMemo(() => sample(screen, hub), [screen, hub]);
  const noop = () => undefined;

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-8 text-ink">
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
      <div className={layout === "phone" ? "mx-auto mt-6 max-w-sm" : "mx-auto mt-6 max-w-4xl"} data-county-story-preview-layout={layout}>
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
            onRetry: noop,
          }}
        />
      </div>
    </main>
  );
}
