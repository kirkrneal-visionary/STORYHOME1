import assert from "node:assert/strict";
import {
  UI6_OWNER_REVIEW_SETTINGS_PATH,
  isUi6OwnerReviewAllowed,
  isUi6OwnerReviewHost,
  parseUi6ReviewPanel,
  parseUi6ReviewRole,
  ui6ReviewAccount,
  ui6ReviewCapabilities,
  ui6ReviewHref,
} from "../src/lib/ui-6-owner-review.ts";

assert.equal(isUi6OwnerReviewAllowed("production"), false);
assert.equal(isUi6OwnerReviewAllowed("preview"), true);
assert.equal(isUi6OwnerReviewAllowed("development"), true);
assert.equal(isUi6OwnerReviewAllowed(undefined), true);
assert.equal(isUi6OwnerReviewHost("localhost"), true);
assert.equal(isUi6OwnerReviewHost("127.0.0.1:56418"), true);
assert.equal(
  isUi6OwnerReviewHost(
    "storyhome-1-eqmg-git-cursor-ui-6-settings-hygiene-6752-storyhome.vercel.app",
  ),
  true,
);
assert.equal(isUi6OwnerReviewHost("storyhome-1-eqmg.vercel.app"), false);
assert.equal(isUi6OwnerReviewHost("www.storyhome.app"), false);
assert.equal(isUi6OwnerReviewHost("storyhome.app"), false);
assert.equal(UI6_OWNER_REVIEW_SETTINGS_PATH, "/internal/ui-6-review/settings");

assert.equal(parseUi6ReviewRole("realtor"), "realtor");
assert.equal(parseUi6ReviewRole("managing_broker"), "managing_broker");
assert.equal(parseUi6ReviewRole("other_professional"), "other_professional");
assert.equal(parseUi6ReviewRole("unknown"), "consumer");

const consumer = ui6ReviewCapabilities("consumer");
assert.equal(consumer.account, true);
assert.equal(consumer.professional, false);
assert.equal(consumer.livingMark, false);
assert.equal(consumer.primaryCounty, false);
assert.equal(consumer.office, false);

const realtor = ui6ReviewCapabilities("realtor");
assert.equal(realtor.professional, true);
assert.equal(realtor.livingMark, true);
assert.equal(realtor.primaryCounty, true);
assert.equal(realtor.serviceCounties, true);
assert.equal(realtor.availability, true);
assert.equal(realtor.brokerage, true);
assert.equal(realtor.office, false);

const managing = ui6ReviewCapabilities("managing_broker");
assert.equal(managing.professional, true);
assert.equal(managing.office, true);
assert.equal(managing.officeWorkspace, true);
assert.equal(managing.primaryCounty, true);

const other = ui6ReviewCapabilities("other_professional");
assert.equal(other.professional, true);
assert.equal(other.livingMark, false);
assert.equal(other.primaryCounty, false);
assert.equal(other.serviceCounties, false);
assert.equal(other.availability, false);
assert.equal(other.office, false);

assert.equal(parseUi6ReviewPanel("primary", consumer), "root");
assert.equal(parseUi6ReviewPanel("primary", realtor), "primary");
assert.equal(parseUi6ReviewPanel("office", managing), "office");
assert.equal(ui6ReviewAccount("realtor").purpose, "individual_pro");
assert.equal(
  ui6ReviewHref("realtor", "counties"),
  "/internal/ui-6-review/settings?role=realtor&panel=counties",
);

console.log("ui-6-owner-review-gate: ok");
