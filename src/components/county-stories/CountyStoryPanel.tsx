"use client";

import { useState } from "react";
import { SERVICE_COUNTIES } from "@/lib/markets";
import {
  COUNTY_STORY_RULES_CONFIRM,
  COUNTY_STORY_RULES_SECTIONS,
  countyStoryTypeCopy,
} from "@/lib/county-stories/composer-copy";
import {
  propertyChoiceLabel,
  type CountyStoryComposerMode,
  type CountyStoryComposerStep,
  type CountyStoryPropertyChoice,
} from "@/lib/county-stories/composer-flow";
import type { CountyStoryType } from "@/lib/county-stories/publish";

export type CountyStoryListingOption = { id: string; label: string };

export type CountyStoryPanelView = {
  screen: CountyStoryComposerStep;
  mode: CountyStoryComposerMode;
  hasSlot: boolean;
  countyFips: string | null;
  countyName: string | null;
  capacityLine: string | null;
  capacityNote: string | null;
  capacityFull: boolean;
  storyType: CountyStoryType | null;
  propertyChoice: CountyStoryPropertyChoice | null;
  listings: CountyStoryListingOption[];
  selectedListingId: string | null;
  currentListingLabel: string | null;
  slotNumber: number | null;
  replacementAvailable: boolean;
  playing: boolean;
  countdown: string | null;
  eligibleWhen: string | null;
  cueTexts: string[];
  accessBasis: "spoken_audio" | "supplied_description" | null;
  accessDescription: string;
  rulesChecked: boolean;
  videoUrl: string | null;
  processingNote: string | null;
  error: string | null;
  busy: boolean;
  recording: boolean;
  recordClock: string | null;
  showRetry: boolean;
  reviewReady: boolean;
  countyMarks: Record<string, string>;
  readingRules: boolean;
  removalSummary: string | null;
  removalDetail: string | null;
};

type Actions = {
  onCreate: () => void;
  onReplace: () => void;
  onCounty: (fips: string) => void;
  onType: (type: CountyStoryType) => void;
  onPropertyChoice: (choice: CountyStoryPropertyChoice) => void;
  onListing: (id: string) => void;
  onCue: (index: number, text: string) => void;
  onAccessBasis: (basis: "spoken_audio" | "supplied_description") => void;
  onAccessDescription: (value: string) => void;
  onRules: (checked: boolean) => void;
  onRecord: () => void;
  onUpload: (file: File) => void;
  onContinue: () => void;
  onBack: () => void;
  onRetry: () => void;
  onReviewRules: () => void;
  onCloseRules: () => void;
};

const fieldClass =
  "min-h-11 w-full rounded-md border border-hairline bg-transparent px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]";

function RulesSections() {
  return (
    <div className="mt-4 flex flex-col gap-5">
      {COUNTY_STORY_RULES_SECTIONS.map((section) => (
        <div key={section.heading}>
          <h3 className="text-base font-semibold text-ink">{section.heading}</h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-2 text-base leading-relaxed text-ink">
              {paragraph}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function Choice({
  name,
  checked,
  onChange,
  title,
  body,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  body?: string;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-md border border-hairline px-3 py-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--gold)]">
      <input
        className="mt-1 h-5 w-5 accent-[var(--gold)]"
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
      />
      <span>
        <span className="block font-semibold text-ink">{title}</span>
        {body ? <span className="mt-1 block text-sm text-[var(--muted)]">{body}</span> : null}
      </span>
    </label>
  );
}

export function CountyStoryPanel({ view, actions }: { view: CountyStoryPanelView; actions: Actions }) {
  const [propertyQuery, setPropertyQuery] = useState("");
  const wide = view.screen === "review" || view.screen === "captions";
  const listings = view.listings.filter((listing) =>
    listing.label.toLowerCase().includes(propertyQuery.trim().toLowerCase()),
  );
  const showPropertyList = view.propertyChoice === "add" || view.propertyChoice === "change";

  return (
    <section
      className="mt-8 border-y border-hairline py-6"
      data-county-story-composer
      data-county-story-screen={view.screen}
      data-county-story-mode={view.mode}
      aria-labelledby="county-story-heading"
    >
      <div className={wide ? "mx-auto flex max-w-3xl flex-col gap-5" : "mx-auto flex max-w-lg flex-col gap-5"}>
        <div className="flex min-w-0 flex-col gap-4">
          {view.error ? (
            <p className="text-sm text-ink" role="alert" data-county-story-error>
              {view.error}
            </p>
          ) : null}

          {view.screen === "loading" ? (
            <div>
              <h2 id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                County Stories
              </h2>
              {view.error ? null : (
                <p className="mt-2 text-base text-[var(--muted)]" role="status">
                  Loading your County Stories…
                </p>
              )}
              {view.showRetry ? (
                <button type="button" className="story-press story-cta-secondary mt-4" onClick={actions.onRetry}>
                  Try again
                </button>
              ) : null}
            </div>
          ) : null}

          {view.screen === "suspended" ? (
            <div data-county-story-suspension>
              {view.readingRules ? (
                <div>
                  <h2 id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                    Before you publish
                  </h2>
                  <RulesSections />
                  <button type="button" className="story-press story-cta-secondary mt-6 w-full" onClick={actions.onCloseRules}>
                    Back
                  </button>
                </div>
              ) : (
                <div>
                  <h2 id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                    County Stories posting paused
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-ink">
                    Your County Stories posting access is paused because three of your Stories were removed for qualifying rule violations within the past seven days.
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-ink">
                    County Stories pauses posting for seven days after the third qualifying removal.
                  </p>
                  {view.countdown ? (
                    <p className="mt-4 text-base text-ink">
                      Eligible again in
                      <span className="mt-1 block text-lg font-semibold" data-county-story-countdown>
                        {view.countdown}
                      </span>
                    </p>
                  ) : null}
                  {view.eligibleWhen ? (
                    <p className="mt-2 text-sm text-[var(--muted)]">{view.eligibleWhen}</p>
                  ) : null}
                  <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">
                    You can continue using the rest of Story Home while County Stories posting is paused.
                  </p>
                  <button
                    type="button"
                    className="story-press story-cta-secondary mt-6 w-full"
                    onClick={actions.onReviewRules}
                  >
                    Review County Stories Rules
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {view.screen === "owned" && !view.hasSlot ? (
            <div>
              <h2 id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                County Stories
              </h2>
              <p className="mt-2 text-base text-[var(--muted)]">
                Share useful local real estate knowledge or a property with your County.
              </p>
              <button type="button" className="story-press story-cta-primary mt-5 w-full" onClick={actions.onCreate}>
                Create Story
              </button>
            </div>
          ) : null}

          {view.screen === "owned" && view.hasSlot ? (
            <div data-county-story-owned>
              <h2 id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                County Stories
              </h2>
              {view.removalSummary ? (
                <div className="mt-4" data-county-story-removal>
                  <p className="text-base leading-relaxed text-ink">{view.removalSummary}</p>
                  {view.removalDetail ? (
                    <p className="mt-2 text-base leading-relaxed text-ink">{view.removalDetail}</p>
                  ) : null}
                </div>
              ) : null}
              <p className="mt-4 text-sm text-[var(--muted)]">Today&apos;s Story</p>
              <p className="text-lg font-semibold text-ink">{view.countyName}</p>
              {view.replacementAvailable ? (
                <button
                  type="button"
                  className="story-press story-cta-primary mt-5 w-full"
                  onClick={actions.onReplace}
                  data-county-story-replace
                >
                  Replace Story
                </button>
              ) : (
                <p className="mt-4 text-base text-ink">Replacement used for today.</p>
              )}
            </div>
          ) : null}

          {view.screen === "county" ? (
            <fieldset>
              <legend id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                Choose a County
              </legend>
              <div className="mt-4 flex flex-col gap-2" data-county-story-capacity>
                {SERVICE_COUNTIES.map((county) => {
                  const selected = view.countyFips === county.fips;
                  return (
                    <label
                      key={county.fips}
                      className={
                        selected
                          ? "flex min-h-14 cursor-pointer items-center justify-between rounded-md border border-[var(--gold)] px-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--gold)]"
                          : "flex min-h-14 cursor-pointer items-center justify-between rounded-md border border-hairline px-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--gold)]"
                      }
                    >
                      <input
                        className="sr-only"
                        type="radio"
                        name="county-story-county"
                        checked={selected}
                        onChange={() => actions.onCounty(county.fips)}
                      />
                      <span className="font-semibold text-ink">{county.name}</span>
                      <span className="text-sm text-[var(--muted)]">{view.countyMarks[county.fips] ?? ""}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {view.screen === "type" ? (
            <fieldset>
              <legend id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                What are you sharing?
              </legend>
              {view.mode === "replace" ? (
                <p className="mt-2 text-sm text-[var(--muted)]" data-county-story-locked>
                  Replace today&apos;s Story. Your current Story stays live until your replacement is ready.
                </p>
              ) : null}
              <div className="mt-4 flex flex-col gap-2">
                {(["local_knowledge", "open_house_property"] as const).map((type) => {
                  const copy = countyStoryTypeCopy(type);
                  return (
                    <Choice
                      key={type}
                      name="county-story-type"
                      checked={view.storyType === type}
                      onChange={() => actions.onType(type)}
                      title={copy.title}
                      body={copy.body}
                    />
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {view.screen === "property" ? (
            <fieldset>
              <legend id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                Choose a property
              </legend>
              {view.currentListingLabel && view.mode === "replace" ? (
                <p className="mt-2 text-sm text-[var(--muted)]">{view.currentListingLabel}</p>
              ) : null}
              <div className="mt-4 flex flex-col gap-2" data-county-story-property>
                {(view.mode === "replace" && view.currentListingLabel
                  ? (["keep", "change", "remove"] as const)
                  : (["none"] as const)
                ).map((choice) => (
                  <Choice
                    key={choice}
                    name="county-story-property"
                    checked={view.propertyChoice === choice}
                    onChange={() => actions.onPropertyChoice(choice)}
                    title={propertyChoiceLabel(choice)}
                  />
                ))}
              </div>
              {view.mode === "create" || !view.currentListingLabel || showPropertyList ? (
                <div className="mt-4 flex flex-col gap-2">
                  <label className="text-sm text-[var(--muted)]">
                    Find a property
                    <input
                      className={`${fieldClass} mt-1`}
                      type="search"
                      value={propertyQuery}
                      onChange={(event) => setPropertyQuery(event.target.value)}
                    />
                  </label>
                  {listings.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No matching properties in this County.</p>
                  ) : (
                    listings.map((listing) => (
                      <Choice
                        key={listing.id}
                        name="county-story-listing"
                        checked={view.selectedListingId === listing.id}
                        onChange={() => {
                          actions.onPropertyChoice(view.mode === "replace" && view.currentListingLabel ? "change" : "add");
                          actions.onListing(listing.id);
                        }}
                        title={listing.label}
                      />
                    ))
                  )}
                </div>
              ) : null}
            </fieldset>
          ) : null}

          {view.screen === "capture" ? (
            <div data-county-story-capture>
              <h2 id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                Your video
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Up to 30 seconds.</p>
              <div className="mt-5 flex flex-col gap-3">
                <button
                  type="button"
                  className="story-press story-cta-primary w-full"
                  onClick={actions.onRecord}
                  data-county-story-record
                >
                  {view.recording ? `Stop · ${view.recordClock ?? ""}` : "Record Video"}
                </button>
                <label className="story-press story-cta-secondary w-full cursor-pointer">
                  Upload Video
                  <input
                    className="sr-only"
                    type="file"
                    accept="video/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) actions.onUpload(file);
                    }}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {view.screen === "processing" ? (
            <div data-county-story-processing>
              <h2 id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                {view.showRetry ? "Try again" : view.reviewReady ? "Your Story is ready" : "Preparing your Story"}
              </h2>
              <p className="mt-2 text-base text-[var(--muted)]" role="status">
                {view.showRetry
                  ? "We could not prepare this Story. You can try again."
                  : view.reviewReady
                    ? "Watch it before you publish."
                    : "This usually takes a moment."}
              </p>
            </div>
          ) : null}

          {view.screen === "review" ? (
            <div data-county-story-review>
              <h2 id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                This is what people will see.
              </h2>
              {view.videoUrl ? (
                <video
                  className="mt-4 aspect-[9/16] w-full rounded-md bg-black"
                  controls
                  playsInline
                  src={view.videoUrl}
                />
              ) : (
                <p className="mt-4 text-sm text-[var(--muted)]">Your video will appear here when it is ready.</p>
              )}
            </div>
          ) : null}

          {view.screen === "captions" ? (
            <div data-county-story-captions>
              <h2 id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                Correct the words
              </h2>
              <div className="@container">
              <div className="mt-4 flex flex-col gap-4 @min-[40rem]:grid @min-[40rem]:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
                {view.videoUrl ? (
                  <video className="aspect-[9/16] w-full rounded-md bg-black" controls playsInline src={view.videoUrl} />
                ) : null}
                <div className="flex flex-col gap-3">
                  {view.cueTexts.map((text, index) => (
                    <textarea
                      key={index}
                      aria-label={`Words ${index + 1}`}
                      className={`${fieldClass} min-h-16 py-2`}
                      value={text}
                      onChange={(event) => actions.onCue(index, event.target.value)}
                    />
                  ))}
                </div>
              </div>
              </div>
            </div>
          ) : null}

          {view.screen === "access" ? (
            <fieldset data-county-story-access>
              <legend id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                Can someone follow this without the picture?
              </legend>
              <div className="mt-4 flex flex-col gap-2">
                <Choice
                  name="county-story-access"
                  checked={view.accessBasis === "spoken_audio"}
                  onChange={() => actions.onAccessBasis("spoken_audio")}
                  title="Important visual information is already explained in what I say in the video."
                />
                <Choice
                  name="county-story-access"
                  checked={view.accessBasis === "supplied_description"}
                  onChange={() => actions.onAccessBasis("supplied_description")}
                  title="Add a short description of important things visible in the video."
                />
              </div>
              {view.accessBasis === "supplied_description" ? (
                <label className="mt-3 block text-sm text-[var(--muted)]">
                  Short description
                  <textarea
                    className={`${fieldClass} mt-1 min-h-24 py-2`}
                    value={view.accessDescription}
                    onChange={(event) => actions.onAccessDescription(event.target.value)}
                  />
                </label>
              ) : null}
            </fieldset>
          ) : null}

          {view.screen === "rules" ? (
            <div data-county-story-rules>
              <h2 id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                Before you publish
              </h2>
              <RulesSections />
              <label className="mt-6 flex min-h-12 items-start gap-3 text-base text-ink">
                <input
                  className="mt-1 h-5 w-5 accent-[var(--gold)]"
                  type="checkbox"
                  checked={view.rulesChecked}
                  onChange={(event) => actions.onRules(event.target.checked)}
                />
                {COUNTY_STORY_RULES_CONFIRM}
              </label>
            </div>
          ) : null}

          {view.screen === "success" ? (
            <div data-county-story-success>
              <h2 id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
                Your Story is active
              </h2>
              <p className="mt-3 text-lg text-ink">{view.countyName}</p>
              <p className="mt-2 text-base text-[var(--muted)]">
                {view.mode === "replace" ? "Replacement used for today." : "You can replace it once today."}
              </p>
            </div>
          ) : null}

          {view.screen !== "loading" &&
          view.screen !== "suspended" &&
          view.screen !== "owned" &&
          view.screen !== "success" &&
          view.screen !== "capture" ? (
            <div className="mt-2 flex flex-col gap-3">
              {view.showRetry ? (
                <button type="button" className="story-press story-cta-primary w-full" onClick={actions.onRetry}>
                  Try again
                </button>
              ) : view.screen === "processing" && !view.reviewReady ? null : (
                <button
                  type="button"
                  className="story-press story-cta-primary w-full"
                  onClick={actions.onContinue}
                  disabled={view.busy}
                  data-county-story-continue
                >
                  {view.busy
                    ? "Working…"
                    : view.screen === "rules"
                      ? view.mode === "replace"
                        ? "Publish Replacement"
                        : "Publish Story"
                      : view.screen === "captions"
                        ? "Confirm words"
                        : "Continue"}
                </button>
              )}
              <button
                type="button"
                className="story-press story-cta-secondary w-full"
                onClick={actions.onBack}
                disabled={view.busy}
              >
                Back
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
