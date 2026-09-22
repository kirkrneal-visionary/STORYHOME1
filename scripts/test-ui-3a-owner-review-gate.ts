import assert from "node:assert/strict";
import {
  UI3A_OWNER_REVIEW_WORLD_PATH,
  isUi3aOwnerReviewAllowed,
  ui3aOwnerReviewAgent,
  ui3aOwnerReviewUsernameStub,
} from "../src/lib/ui-3a-owner-review.ts";

assert.equal(isUi3aOwnerReviewAllowed("production"), false);
assert.equal(isUi3aOwnerReviewAllowed("preview"), true);
assert.equal(isUi3aOwnerReviewAllowed("development"), true);
assert.equal(isUi3aOwnerReviewAllowed(undefined), true);
assert.equal(ui3aOwnerReviewAgent().fullName, "Sarah Jenkins");
assert.equal(ui3aOwnerReviewUsernameStub().username, "sarahpro");
assert.equal(
  ui3aOwnerReviewUsernameStub().agentWorldHref,
  UI3A_OWNER_REVIEW_WORLD_PATH,
);
assert.notEqual(
  ui3aOwnerReviewUsernameStub().agentWorldHref,
  "/agents/user-realtor",
);

console.log("ui-3a-owner-review-gate: ok");
