import assert from "node:assert/strict";
import {
  UI5_OWNER_REVIEW_CARDS_PATH,
  isUi5OwnerReviewAllowed,
  isUi5OwnerReviewHost,
  ui5OwnerReviewListings,
} from "../src/lib/ui-5-owner-review.ts";
import { DEMO_LISTINGS } from "../src/lib/demo-data.ts";

assert.equal(isUi5OwnerReviewAllowed("production"), false);
assert.equal(isUi5OwnerReviewAllowed("preview"), true);
assert.equal(isUi5OwnerReviewAllowed("development"), true);
assert.equal(isUi5OwnerReviewAllowed(undefined), true);
assert.equal(isUi5OwnerReviewHost("localhost"), true);
assert.equal(isUi5OwnerReviewHost("127.0.0.1:56417"), true);
assert.equal(
  isUi5OwnerReviewHost(
    "storyhome-1-eqmg-git-cursor-ui-5-marketplace-visual-6752-storyhome.vercel.app",
  ),
  true,
);
assert.equal(isUi5OwnerReviewHost("storyhome-1-eqmg.vercel.app"), false);
assert.equal(isUi5OwnerReviewHost("www.storyhome.app"), false);
assert.equal(isUi5OwnerReviewHost("storyhome.app"), false);
assert.equal(UI5_OWNER_REVIEW_CARDS_PATH, "/internal/ui-5-review/cards");
assert.equal(DEMO_LISTINGS.length, 0);
const rows = ui5OwnerReviewListings();
assert.equal(rows.length, 2);
assert.ok(rows.every((row) => row.id.startsWith("ui5-review-")));
assert.ok(rows.every((row) => row.photoUrl === ""));
assert.notEqual(rows[0].id, rows[1].id);

console.log("ui-5-owner-review-gate: ok");
