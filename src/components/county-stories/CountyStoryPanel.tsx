"use client";

import { SERVICE_COUNTIES } from "@/lib/markets";
import { COUNTY_STORY_RULES_COPY, countyStoryTypeCopy } from "@/lib/county-stories/composer-copy";
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
};

const fieldClass =
  "min-h-11 w-full rounded-md border border-hairline bg-transparent px-3 text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]";

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
  const title =
    view.mode === "replace" && view.screen !== "owned" && view.screen !== "suspended"
      ? "Replace Story"
      : "County Stories";

  return (
    <section
      className="mt-8 border-y border-hairline py-6"
      data-county-story-composer
      data-county-story-screen={view.screen}
      data-county-story-mode={view.mode}
      aria-labelledby="county-story-heading"
    >
      <div className="flex flex-col gap-5 md:grid md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-start md:gap-10">
        <div>
          <h2 id="county-story-heading" className="text-xl font-semibold tracking-[-0.02em] text-ink">
            {title}
          </h2>
          {view.mode === "replace" && view.screen !== "owned" && view.screen !== "success" ? (
            <p className="mt-2 text-sm text-[var(--muted)]" data-county-story-locked>
              Same County Story for today. County, Story Day, and story number stay the same. This is not a new Story.
            </p>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">
              A short video for one County, on your Agent World.
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {view.error ? (
            <p className="text-sm text-ink" role="alert" data-county-story-error>
              {view.error}
            </p>
          ) : null}

          {view.screen === "loading" ? (
            <div>
              {view.error ? null : (
                <p className="text-base text-[var(--muted)]" role="status">
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
              <p className="text-lg font-semibold text-ink">County Stories posting paused</p>
              {view.countdown ? (
                <p className="mt-3 text-base text-ink">
                  Eligible again in
                  <span className="mt-1 block font-semibold" data-county-story-countdown>
                    {view.countdown}
                  </span>
                </p>
              ) : null}
              {view.eligibleWhen ? (
                <p className="mt-2 text-sm text-[var(--muted)]">{view.eligibleWhen}</p>
              ) : null}
              {view.hasSlot ? (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Today’s County Story stays as it is. Posting and replacement wait until you are eligible again.
                </p>
              ) : null}
            </div>
          ) : null}

          {view.screen === "owned" && !view.hasSlot ? (
            <div>
              <p className="text-base text-ink">You can post one County Story today.</p>
              <button
                type="button"
                className="story-press story-cta-primary mt-4 w-full md:w-auto"
                onClick={actions.onCreate}
              >
                Create Story
              </button>
            </div>
          ) : null}

          {view.screen === "owned" && view.hasSlot ? (
            <div data-county-story-owned>
              <p className="text-base text-ink">
                {view.playing ? "Your Story is active." : "You own today’s County Story."}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {view.countyName}
                {view.slotNumber ? ` · Story ${view.slotNumber}` : ""}
                {" · today"}
              </p>
              {view.storyType ? (
                <p className="mt-1 text-sm text-[var(--muted)]">{countyStoryTypeCopy(view.storyType).title}</p>
              ) : null}
              <p className="mt-3 text-sm text-ink">
                {view.replacementAvailable
                  ? "One replacement is still available."
                  : "Today’s replacement has already been used."}
              </p>
              {view.replacementAvailable ? (
                <button
                  type="button"
                  className="story-press story-cta-primary mt-4 w-full md:w-auto"
                  onClick={actions.onReplace}
                  data-county-story-replace
                >
                  Replace Story
                </button>
              ) : null}
            </div>
          ) : null}

          {view.screen === "county" ? (
            <fieldset>
              <legend className="text-base font-semibold text-ink">Choose a County</legend>
              <div className="mt-3 flex flex-col gap-2">
                {SERVICE_COUNTIES.map((county) => (
                  <label
                    key={county.fips}
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-hairline px-3"
                  >
                    <input
                      className="h-5 w-5 accent-[var(--gold)]"
                      type="radio"
                      name="county-story-county"
                      checked={view.countyFips === county.fips}
                      onChange={() => actions.onCounty(county.fips)}
                    />
                    <span className="text-ink">
                      {county.name}
                      <span className="text-[var(--muted)]"> · {county.hubCity}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {view.capacityLine &&
          (view.screen === "county" ||
            view.screen === "rules" ||
            (view.mode === "replace" && (view.screen === "type" || view.screen === "owned"))) ? (
            <div data-county-story-capacity>
              <p className="text-sm text-[var(--muted)]">{view.countyName}</p>
              <p className="text-lg font-semibold text-ink">{view.capacityLine}</p>
              {view.capacityNote ? <p className="text-sm text-[var(--muted)]">{view.capacityNote}</p> : null}
              {view.mode === "replace" ? (
                <p className="mt-1 text-sm text-[var(--muted)]">Replacing your Story does not change this count.</p>
              ) : null}
            </div>
          ) : null}

          {view.screen === "type" ? (
            <fieldset>
              <legend className="text-base font-semibold text-ink">Story type</legend>
              <div className="mt-3 flex flex-col gap-2">
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
              <legend className="text-base font-semibold text-ink">Property</legend>
              <p className="mt-1 text-sm text-[var(--muted)]">Optional for either Story type.</p>
              {view.currentListingLabel ? (
                <p className="mt-2 text-sm text-ink">Current property: {view.currentListingLabel}</p>
              ) : null}
              <div className="mt-3 flex flex-col gap-2" data-county-story-property>
                {(["keep", "change", "remove", "add", "none"] as const)
                  .filter((choice) => {
                    if (view.mode === "create") return choice === "add" || choice === "none";
                    if (view.currentListingLabel) return choice === "keep" || choice === "change" || choice === "remove";
                    return choice === "add" || choice === "none";
                  })
                  .map((choice) => (
                    <Choice
                      key={choice}
                      name="county-story-property"
                      checked={view.propertyChoice === choice}
                      onChange={() => actions.onPropertyChoice(choice)}
                      title={propertyChoiceLabel(choice)}
                    />
                  ))}
              </div>
              {view.propertyChoice === "add" || view.propertyChoice === "change" ? (
                <div className="mt-3 flex flex-col gap-2">
                  {view.listings.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">No properties in this County are available to you.</p>
                  ) : (
                    view.listings.map((listing) => (
                      <Choice
                        key={listing.id}
                        name="county-story-listing"
                        checked={view.selectedListingId === listing.id}
                        onChange={() => actions.onListing(listing.id)}
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
              <p className="text-base text-ink">Record or upload a video. 30 seconds maximum.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="story-press story-cta-primary w-full sm:w-auto"
                  onClick={actions.onRecord}
                  data-county-story-record
                >
                  {view.recording ? `Stop · ${view.recordClock ?? ""}` : "Record Video"}
                </button>
                <label className="story-press story-cta-secondary w-full cursor-pointer sm:w-auto">
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
            <p className="text-base text-ink" role="status" data-county-story-processing>
              {view.processingNote ?? "Preparing your video."}
            </p>
          ) : null}

          {view.screen === "review" ? (
            <div data-county-story-review>
              <p className="text-base font-semibold text-ink">This is what people will see.</p>
              {view.videoUrl ? (
                <video
                  className="mt-3 aspect-[9/16] w-full max-w-sm rounded-md bg-black"
                  controls
                  playsInline
                  src={view.videoUrl}
                >
                  <track kind="captions" />
                </video>
              ) : (
                <p className="mt-3 text-sm text-[var(--muted)]">Your video will appear here when it is ready.</p>
              )}
            </div>
          ) : null}

          {view.screen === "captions" ? (
            <div data-county-story-captions>
              <p className="text-base text-ink">Correct the words. Then confirm them.</p>
              <div className="mt-3 flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
                {view.videoUrl ? (
                  <video className="aspect-[9/16] w-full rounded-md bg-black" controls playsInline src={view.videoUrl} />
                ) : null}
                <div className="flex flex-col gap-2">
                  {view.cueTexts.map((text, index) => (
                    <label key={index} className="block text-sm text-[var(--muted)]">
                      Line {index + 1}
                      <textarea
                        className={`${fieldClass} mt-1 min-h-16 py-2`}
                        value={text}
                        onChange={(event) => actions.onCue(index, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {view.screen === "access" ? (
            <fieldset data-county-story-access>
              <legend className="text-base font-semibold text-ink">Visual check</legend>
              <div className="mt-3 flex flex-col gap-2">
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
            <fieldset data-county-story-rules>
              <legend className="text-base font-semibold text-ink">County Stories rules</legend>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink">
                {COUNTY_STORY_RULES_COPY.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <label className="mt-4 flex min-h-12 items-start gap-3 text-base text-ink">
                <input
                  className="mt-1 h-5 w-5 accent-[var(--gold)]"
                  type="checkbox"
                  checked={view.rulesChecked}
                  onChange={(event) => actions.onRules(event.target.checked)}
                />
                I confirm these rules for this {view.mode === "replace" ? "replacement" : "Story"}.
              </label>
            </fieldset>
          ) : null}

          {view.screen === "success" ? (
            <div data-county-story-success>
              <p className="text-lg font-semibold text-ink">
                {view.mode === "replace" ? "Your replacement is active." : "Your Story is active."}
              </p>
              <p className="mt-2 text-base text-ink">{view.countyName}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">You own today’s County Story.</p>
              <p className="mt-2 text-sm text-ink">
                {view.mode === "replace"
                  ? "Today’s replacement has been used."
                  : "One replacement is still available."}
              </p>
            </div>
          ) : null}

          {view.screen !== "loading" &&
          view.screen !== "suspended" &&
          view.screen !== "owned" &&
          view.screen !== "success" ? (
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="story-press story-cta-secondary w-full sm:w-auto"
                onClick={actions.onBack}
                disabled={view.busy}
              >
                Back
              </button>
              {view.showRetry ? (
                <button
                  type="button"
                  className="story-press story-cta-primary w-full sm:w-auto"
                  onClick={actions.onRetry}
                >
                  Try again
                </button>
              ) : (
                <button
                  type="button"
                  className="story-press story-cta-primary w-full sm:w-auto"
                  onClick={actions.onContinue}
                  disabled={view.busy}
                  data-county-story-continue
                >
                  {view.busy
                    ? "Working…"
                    : view.screen === "rules"
                      ? view.mode === "replace"
                        ? "Publish replacement"
                        : "Publish"
                      : view.screen === "captions"
                        ? "Confirm captions"
                        : "Continue"}
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
