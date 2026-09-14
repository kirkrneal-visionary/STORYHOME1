/**
 * Wave 4 proves the code. It does not ship itself.
 * A human must say GO LIVE before SQL or Auth dashboard changes.
 */
export const GO_LIVE_BLOCKED =
  "Go-live is a separate human step. Wave 4 only proves the code.";

export function mayAutoGoLive(): false {
  return false;
}

export const ACCOUNT_STACK_MIGRATIONS = [
  "0048_account_purpose_wave1.sql",
  "0049_open_office_account.sql",
  "0051_office_keeps_story_pro.sql",
] as const;

export const ACCOUNT_STACK_PROOF = {
  purposeSeparateFromLicense: true,
  trecNeverGrantsOffice: true,
  emailAndMfaGatePrivateApp: true,
  officeKeepsStoryPro: true,
  noProductionPeopleCopied: true,
  noLiveMailFromInbox: true,
  autoGoLive: false,
} as const;
