/**
 * County Stories Wave 6 composer. No database. Does not enable publishing.
 * Run: npm run test:county-stories-w6
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  countyStoryComposerMessage,
  countyStoryCapacityCopy,
  countyStoryCapacityMark,
  countyStoryCountdown,
  countyStoryTypeCopy,
} from "../src/lib/county-stories/composer-copy.ts";
import {
  createListingId,
  immutableReplacementFields,
  nextComposerStep,
  previousComposerStep,
  propertyChoiceLabel,
  propertyChoices,
  replaceListingCommand,
  showCreateStory,
  showReplaceStory,
  storyTypeLockedOnReplace,
  type CountyStoryComposerStatus,
} from "../src/lib/county-stories/composer-flow.ts";

const root = process.cwd();
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const slot = {
  id: "slot",
  countyFips: "48373",
  storyDay: "2026-09-27",
  slotNumber: 4,
  storyType: "local_knowledge" as const,
  listingId: "listing",
  listingLabel: "100 Main",
  replacementUsed: false,
  playing: true,
};

const open: CountyStoryComposerStatus = {
  ok: true,
  storyDay: "2026-09-27",
  suspended: false,
  eligibleAt: null,
  slot: null,
};
const owned: CountyStoryComposerStatus = { ...open, slot };
const used: CountyStoryComposerStatus = { ...open, slot: { ...slot, replacementUsed: true } };
const suspended: CountyStoryComposerStatus = {
  ...owned,
  suspended: true,
  eligibleAt: "2026-10-02T20:00:00.000Z",
};

assert.equal(showCreateStory(open), true);
assert.equal(showReplaceStory(open), false);
assert.equal(showCreateStory(owned), false);
assert.equal(showReplaceStory(owned), true);
assert.equal(showReplaceStory(used), false);
assert.equal(showCreateStory(suspended), false);
assert.equal(showReplaceStory(suspended), false);

assert.equal(storyTypeLockedOnReplace(), false);
assert.deepEqual(immutableReplacementFields(), ["county", "storyDay", "owner", "slotNumber"]);

assert.deepEqual(propertyChoices({ mode: "create", hasCurrentListing: false }), ["add", "none"]);
assert.deepEqual(propertyChoices({ mode: "replace", hasCurrentListing: true }), ["keep", "change", "remove"]);
assert.deepEqual(propertyChoices({ mode: "replace", hasCurrentListing: false }), ["add", "none"]);
assert.equal(propertyChoiceLabel("keep"), "Keep current property");
assert.equal(propertyChoiceLabel("change"), "Change property");
assert.equal(propertyChoiceLabel("remove"), "Remove property");
assert.equal(propertyChoiceLabel("add"), "Add a property");
assert.equal(propertyChoiceLabel("none"), "No property");

assert.deepEqual(replaceListingCommand("keep", "listing"), { ok: true, action: "keep", listingId: null });
assert.deepEqual(replaceListingCommand("remove", "listing"), { ok: true, action: "clear", listingId: null });
assert.deepEqual(replaceListingCommand("none", null), { ok: true, action: "clear", listingId: null });
assert.deepEqual(replaceListingCommand("change", "next"), { ok: true, action: "set", listingId: "next" });
assert.equal(replaceListingCommand("add", null).ok, false);
assert.deepEqual(createListingId("none", "listing"), { ok: true, listingId: null });
assert.deepEqual(createListingId("add", "next"), { ok: true, listingId: "next" });

assert.equal(nextComposerStep("create", "owned"), null);
assert.equal(nextComposerStep("create", "county"), "type");
assert.equal(nextComposerStep("create", "rules"), "success");
assert.equal(nextComposerStep("replace", "type"), "property");
assert.equal(previousComposerStep("replace", "type"), "owned");
assert.equal(nextComposerStep("replace", "county"), null);

const seven = countyStoryCapacityCopy(7);
assert.equal(seven.line, "7 / 30 Stories today");
assert.equal(seven.full, false);
const almost = countyStoryCapacityCopy(29);
assert.match(almost.note, /does not hold|not held/);
const full = countyStoryCapacityCopy(30);
assert.equal(full.line, "30 / 30");
assert.equal(full.note, "Full for Today");
assert.equal(countyStoryCapacityMark(7), "7 / 30");
assert.equal(countyStoryCapacityMark(30), "Full");
assert.equal(countyStoryTypeCopy("local_knowledge").body, "Teach buyers or sellers something useful about this County.");
assert.equal(countyStoryTypeCopy("open_house_property").title, "Open House / Property");

assert.equal(
  countyStoryCountdown("2026-10-02T20:00:00.000Z", new Date("2026-09-27T06:00:00.000Z")),
  "5 days 14 hours",
);

assert.match(countyStoryComposerMessage("FEATURE_DISABLED"), /not available yet/);
assert.match(countyStoryComposerMessage("COUNTY_FULL"), /filled before/);
assert.match(countyStoryComposerMessage("COUNTY_FULL"), /not a penalty/);
assert.match(countyStoryComposerMessage("ALREADY_POSTED"), /already own/);
assert.match(countyStoryComposerMessage("REPLACEMENT_ALREADY_USED"), /already been used/);
assert.match(countyStoryComposerMessage("POSTING_SUSPENDED", "2026-10-02T20:00:00.000Z"), /paused until/);
assert.match(countyStoryComposerMessage("PLAYBACK_NOT_READY"), /still being prepared/);
assert.match(countyStoryComposerMessage("ACCESSIBILITY_NOT_READY"), /captions/);
assert.match(countyStoryComposerMessage("RULES_REQUIRED"), /rules/);
assert.match(countyStoryComposerMessage("CAPTION_REVISION_CONFLICT"), /captions changed/);
assert.match(countyStoryComposerMessage("LISTING_NOT_AUTHORIZED"), /can’t use that property/);
assert.match(countyStoryComposerMessage("LISTING_COUNTY_MISMATCH"), /different County/);
assert.match(countyStoryComposerMessage("VIDEO_TOO_LONG"), /30 seconds/);
assert.doesNotMatch(countyStoryComposerMessage("UNSUPPORTED_CODEC"), /H\.264|HEVC|MOV|HLS|Mux/);

const composer = read("src/components/county-stories/CountyStoryComposer.tsx");
const panel = read("src/components/county-stories/CountyStoryPanel.tsx");
const previewGallery = read("src/components/county-stories/CountyStoryPreview.tsx");
const route = read("src/app/api/county-stories/composer/route.ts");
const preview = read("src/app/county-stories/preview/page.tsx");
const agentWorld = read("src/components/agents/AgentWorldView.tsx");
assert.match(composer, /rulesAcknowledged: true/);
assert.match(composer, /CAPTION_REVISION_CONFLICT/);
assert.match(composer, /We did not get a confirmation/);
assert.match(composer, /reviewReady/);
assert.match(panel, /Create Story/);
assert.match(panel, /Replace Story/);
assert.match(panel, /What are you sharing/);
assert.match(panel, /Preparing your Story/);
assert.match(panel, /This usually takes a moment/);
assert.match(panel, /Replace today/);
assert.doesNotMatch(panel, /Delete Story/);
assert.doesNotMatch(panel, /WCAG|WebVTT|H\.264|HEVC|Mux|HLS/);
assert.doesNotMatch(panel, /Story Day|story number|durable slot|media version|allocation/);
assert.doesNotMatch(panel, /Livingston|Groveton|Lufkin|Woodville|Coldspring|Huntsville/);
assert.doesNotMatch(panel, /Sample screen|data-county-story-preview-board/);
assert.match(previewGallery, /aria-label="Sample screen"/);
assert.match(previewGallery, /data-county-story-preview-board/);
assert.match(previewGallery, /clean \? null/);
assert.doesNotMatch(composer, /Sample screen|data-county-story-preview-board|CountyStoryPreview/);
assert.doesNotMatch(agentWorld, /CountyStoryPreview|Sample screen|data-county-story-preview-board/);
assert.doesNotMatch(composer, /publish_enabled\s*=\s*true/);
assert.doesNotMatch(route, /qualifying_count|reason_detail|hidden_reason/);
assert.match(preview, /VERCEL_ENV === "preview"/);
assert.match(preview, /clean=\{params\.clean === "1"\}/);
assert.match(agentWorld, /isOwn \? <CountyStoryComposer \/> : null/);
assert.doesNotMatch(read("src/components/home/HomeSearchHero.tsx"), /CountyStory/);
assert.equal(existsSync(join(root, "src/app/api/county-stories/delete/route.ts")), false);
assert.equal(existsSync(join(root, "src/components/county-stories/CountyStoryViewer.tsx")), false);
assert.match(read("src/app/api/county-stories/publish/route.ts"), /FEATURE_DISABLED/);

console.log("county-stories-w6-composer: ok");
