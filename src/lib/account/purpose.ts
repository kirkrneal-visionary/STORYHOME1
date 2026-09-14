/**
 * Account purpose is not the same as license type.
 * License (agent/broker) can exist on an individual Pro without office power.
 */

export type AccountPurpose =
  | "consumer"
  | "individual_pro"
  | "managing_broker"
  | "other_professional";

const OTHER_ROLES = new Set(["inspector", "appraiser", "lender"]);

export function purposeAfterSignup(
  professionalRole: string | null | undefined,
): AccountPurpose {
  if (professionalRole && OTHER_ROLES.has(professionalRole)) {
    return "other_professional";
  }
  return "consumer";
}

/** TREC success never grants office-admin. Inspectors never become Story Pro. */
export function purposeAfterTrecPromote(
  currentPurpose: AccountPurpose | null | undefined,
): AccountPurpose | null {
  if (currentPurpose === "other_professional") return null;
  if (currentPurpose === "managing_broker") return null;
  return "individual_pro";
}

export function mayUseStoryPro(
  purpose?: string | null,
  kind?: string | null,
): boolean {
  if (
    purpose === "managing_broker" ||
    purpose === "other_professional" ||
    purpose === "consumer"
  ) {
    return false;
  }
  if (purpose === "individual_pro") return true;
  return kind === "agent" || kind === "broker" || kind === "pro";
}

export function mayManageBrokerage(purpose?: string | null): boolean {
  return purpose === "managing_broker";
}

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export type ApprovalBinding = {
  legalName: string;
  license: string;
  purpose: string;
};

/** Display-name edits are not part of this binding. */
export function approvalBindingHolds(
  current: ApprovalBinding,
  verified: ApprovalBinding | null | undefined,
): boolean {
  if (!verified?.license || !verified.legalName) return true;
  return (
    norm(current.legalName) === norm(verified.legalName) &&
    norm(current.license) === norm(verified.license) &&
    current.purpose === verified.purpose
  );
}

export function lastWord(name: string | null | undefined): string | undefined {
  const part = (name ?? "").trim().split(/\s+/).filter(Boolean).slice(-1)[0];
  return part || undefined;
}

/** Where a user lands after a finished login. */
export function destForUser(user: {
  kind: string;
  purpose?: string | null;
}): string {
  if (mayManageBrokerage(user.purpose)) return "/settings";
  if (mayUseStoryPro(user.purpose, user.kind)) return "/portal";
  if (user.kind === "seller") return "/";
  return "/home";
}
