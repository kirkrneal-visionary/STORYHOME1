import assert from "node:assert/strict";
import {
  UI3B_OWNER_REVIEW_ORG_PATH,
  isUi3bOwnerReviewAllowed,
  isUi3bOwnerReviewHost,
  ui3bOwnerReviewBrokerage,
  ui3bOwnerReviewFixture,
} from "../src/lib/ui-3b-owner-review.ts";

assert.equal(isUi3bOwnerReviewAllowed("production"), false);
assert.equal(isUi3bOwnerReviewAllowed("preview"), true);
assert.equal(isUi3bOwnerReviewAllowed("development"), true);
assert.equal(isUi3bOwnerReviewHost("localhost"), true);
assert.equal(
  isUi3bOwnerReviewHost(
    "storyhome-1-eqmg-git-cursor-ui-3b-org-world-6752-storyhome.vercel.app",
  ),
  true,
);
assert.equal(isUi3bOwnerReviewHost("storyhome-1-eqmg.vercel.app"), false);
assert.equal(isUi3bOwnerReviewHost("www.storyhome.app"), false);
assert.equal(isUi3bOwnerReviewHost("storyhome.app"), false);
assert.equal(ui3bOwnerReviewBrokerage().name, "Story Home Realty");
assert.equal(ui3bOwnerReviewBrokerage().website, null);
assert.equal(ui3bOwnerReviewBrokerage().phone, null);
assert.equal(ui3bOwnerReviewFixture().agents[0]?.fullName, "Sarah Jenkins");
assert.equal(UI3B_OWNER_REVIEW_ORG_PATH, "/internal/ui-3b-review/org");
assert.notEqual(UI3B_OWNER_REVIEW_ORG_PATH, "/b/story-home-realty");

console.log("ui-3b-owner-review-gate: ok");
