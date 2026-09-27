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
  countyStoryEligibleWhen,
  countyStoryTypeCopy,
} from "../src/lib/county-stories/composer-copy.ts";
import {
  COUNTY_STORY_CAMERA_MAX_SEC,
  countyStoryCameraClock,
  countyStoryCameraDeniedCopy,
  countyStoryCameraRequest,
  countyStoryCameraShouldStop,
} from "../src/lib/county-stories/camera-capture.ts";
import {
  draftResume,
  parseCountyStoryDraft,
  serializeCountyStoryDraft,
  type CountyStoryDraft,
} from "../src/lib/county-stories/composer-draft.ts";
import {
  countyStoryPauseRemovalList,
  countyStoryRemovalNotice,
} from "../src/lib/county-stories/removal-notice.ts";
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
  removal: null,
  pauseRemovals: [],
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
assert.equal(countyStoryEligibleWhen("2026-10-02T20:00:00.000Z"), "October 2 at 3:00 PM");
const advertising = countyStoryRemovalNotice("generic_solicitation");
assert.match(advertising.reason ?? "", /general advertising rather than useful local real estate information/);
assert.equal(countyStoryRemovalNotice("not_a_reason").reason, null);
assert.match(
  countyStoryRemovalNotice("unauthorized_property").reason ?? "",
  /property promotion was not authorized/,
);
assert.doesNotMatch(JSON.stringify(countyStoryRemovalNotice("other_policy")), /other_policy|reason_detail|actor/);
const pauseStart = "2026-09-27T20:00:00.000Z";
const pauseList = countyStoryPauseRemovalList(
  [
    { occurredAt: "2026-09-20T19:00:00.000Z", reasonCode: "generic_solicitation", qualifies: true },
    { occurredAt: "2026-09-25T15:00:00.000Z", reasonCode: "static_business_card", qualifies: true },
    { occurredAt: "2026-09-26T15:00:00.000Z", reasonCode: "unauthorized_property", qualifies: false },
    { occurredAt: "2026-09-27T20:00:00.000Z", reasonCode: "generic_solicitation", qualifies: true },
    { occurredAt: "2026-09-28T12:00:00.000Z", reasonCode: "other_policy", qualifies: true },
  ],
  pauseStart,
);
assert.equal(pauseList.length, 2);
assert.match(pauseList[0]?.reason ?? "", /Static promotional/);
assert.match(pauseList[1]?.reason ?? "", /General advertising/);
assert.doesNotMatch(JSON.stringify(pauseList), /reason_code|unauthorized_property|actor/);

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
assert.match(panel, /Record Video/);
assert.match(panel, /data-county-story-upload/);
assert.doesNotMatch(panel, /capture="user"|capture="environment"/);
assert.doesNotMatch(composer, /getUserMedia/);
assert.match(composer, /CountyStoryCamera/);
assert.match(composer, /setCameraOpen\(true\)/);
const camera = read("src/components/county-stories/CountyStoryCamera.tsx");
assert.match(camera, /data-county-story-camera/);
assert.match(camera, /Retake/);
assert.match(camera, /Use Video/);
assert.match(camera, /Try Camera Again/);
assert.match(camera, /Switch camera/);
assert.match(camera, /countyStoryCameraRequest/);
assert.doesNotMatch(camera, /filter|sticker|beauty|music library/i);
assert.equal(COUNTY_STORY_CAMERA_MAX_SEC, 30);
assert.equal(countyStoryCameraClock(4), "0:04");
assert.equal(countyStoryCameraShouldStop(30000), true);
assert.equal(countyStoryCameraShouldStop(29999), false);
assert.equal(countyStoryCameraRequest("user").video.frameRate.ideal, 30);
assert.equal(countyStoryCameraRequest("environment").video.height.ideal, 1920);
assert.match(countyStoryCameraDeniedCopy(), /camera and microphone/);
assert.doesNotMatch(countyStoryCameraDeniedCopy(), /NotAllowedError|getUserMedia/);
assert.match(panel, /Replace Story/);
assert.match(panel, /What are you sharing/);
assert.match(panel, /Preparing your Story/);
assert.match(panel, /This usually takes a moment/);
assert.match(panel, /Replace today/);
const rulesCopy = read("src/lib/county-stories/composer-copy.ts");
assert.match(rulesCopy, /What belongs in County Stories/);
assert.match(rulesCopy, /Your County position/);
assert.match(rulesCopy, /Your one replacement/);
assert.match(rulesCopy, /A replacement does not erase a previous removal/);
assert.match(rulesCopy, /When posting can be paused/);
assert.match(rulesCopy, /Before you continue/);
assert.match(rulesCopy, /do not count as posting violations/);
assert.match(rulesCopy, /I reviewed this Story and understand the County Stories posting rules/);
assert.match(panel, /COUNTY_STORY_RULES_SECTIONS/);
assert.match(panel, /COUNTY_STORY_RULES_CONFIRM/);
assert.match(panel, /Publish Story/);
assert.match(panel, /Publish Replacement/);
assert.match(panel, /three of your County Stories were removed/);
assert.match(panel, /Why was my posting paused/);
assert.match(panel, /Your County Story was removed/);
assert.match(panel, /Your County position remains used for today/);
assert.match(panel, /This removal counts toward County Stories posting limits/);
assert.doesNotMatch(panel, /generic_solicitation|reason_code|hidden_reason|reason_detail|Navigating to rules page/);
assert.doesNotMatch(composer, /Navigating to rules page/);
assert.doesNotMatch(agentWorld, /Navigating to rules page/);
assert.match(read("src/lib/county-stories/composer-status.ts"), /countyStoryRemovalNotice/);
assert.match(route, /removal: status\.removal/);
assert.match(route, /pauseRemovals: status\.pauseRemovals/);
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
assert.match(agentWorld, /isOwn \? <CountyStoryComposer ownerId=\{agent\.id\} \/> : null/);
assert.match(panel, /data-county-story-back/);
assert.match(panel, /Save and exit/);
assert.match(panel, /Continue Story/);
assert.match(panel, /Discard Draft/);
assert.match(panel, /Your current Story stays live/);
assert.match(composer, /rulesChecked: false/);
assert.match(composer, /clearCountyStoryDraft/);
assert.doesNotMatch(read("src/lib/county-stories/composer-draft.ts"), /rulesChecked/);
assert.equal(previousComposerStep("create", "capture"), "property");
assert.equal(previousComposerStep("replace", "type"), "owned");

const savedDraft: CountyStoryDraft = {
  version: 1,
  mode: "create",
  slotId: null,
  screen: "rules",
  countyFips: "48373",
  storyType: "local_knowledge",
  propertyChoice: "none",
  selectedListingId: null,
  mediaId: "media-1",
  cueTexts: ["A local note"],
  accessBasis: "spoken_audio",
  accessDescription: "",
  savedAt: "2026-09-27T00:00:00.000Z",
};
const stored = serializeCountyStoryDraft(savedDraft);
assert.doesNotMatch(stored, /rulesChecked/);
const parsed = parseCountyStoryDraft(stored);
assert.equal(parsed?.screen, "rules");
assert.equal(parsed?.mediaId, "media-1");
assert.equal(parsed?.countyFips, "48373");
const resumed = draftResume({
  draft: parsed,
  suspended: false,
  hasSlot: false,
  slotId: null,
  replacementAvailable: false,
});
assert.equal(resumed.kind, "continue");
const blocked = draftResume({
  draft: parsed,
  suspended: false,
  hasSlot: true,
  slotId: "slot",
  replacementAvailable: true,
});
assert.equal(blocked.kind, "blocked");
assert.match(blocked.kind === "blocked" ? blocked.lead : "", /published Story is unchanged/);
const replacement = draftResume({
  draft: { ...savedDraft, mode: "replace", slotId: "slot", screen: "capture" },
  suspended: false,
  hasSlot: true,
  slotId: "slot",
  replacementAvailable: true,
});
assert.equal(replacement.kind, "continue");
assert.match(replacement.kind === "continue" ? replacement.lead : "", /current Story stays live/);
const replacementUsed = draftResume({
  draft: { ...savedDraft, mode: "replace", slotId: "slot" },
  suspended: false,
  hasSlot: true,
  slotId: "slot",
  replacementAvailable: false,
});
assert.equal(replacementUsed.kind, "blocked");
assert.match(replacementUsed.kind === "blocked" ? replacementUsed.lead : "", /current Story is unchanged/);
assert.doesNotMatch(read("src/components/home/HomeSearchHero.tsx"), /CountyStory/);
assert.equal(existsSync(join(root, "src/app/api/county-stories/delete/route.ts")), false);
assert.equal(existsSync(join(root, "src/components/county-stories/CountyStoryViewer.tsx")), false);
assert.match(read("src/app/api/county-stories/publish/route.ts"), /FEATURE_DISABLED/);

console.log("county-stories-w6-composer: ok");
