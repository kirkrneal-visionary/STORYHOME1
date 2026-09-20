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
  if (purpose === "other_professional" || purpose === "consumer") {
    return false;
  }
  if (purpose === "individual_pro" || purpose === "managing_broker") {
    return true;
  }
  return kind === "agent" || kind === "broker" || kind === "pro";
}

export function mayManageBrokerage(purpose?: string | null): boolean {
  return purpose === "managing_broker";
}

/** Only an individual licensed broker can turn this login into the office account. */
export function canOpenOfficeAccount(
  purpose?: string | null,
  kind?: string | null,
): boolean {
  return purpose === "individual_pro" && kind === "broker";
}

/** Story Pro nav, including the office login. */
export function navRoleForAccount(
  purpose?: string | null,
  kind?: string | null,
): "consumer" | "professional" {
  return mayUseStoryPro(purpose, kind) ? "professional" : "consumer";
}

export function purposeLabel(purpose?: string | null): string {
  if (purpose === "managing_broker") return "Office account";
  if (purpose === "individual_pro") return "Story Pro";
  if (purpose === "other_professional") return "Other professional";
  return "Consumer";
}

/** Human label for the professional type already on file. Does not change authority. */
export function professionalTypeLabel(opts: {
  purpose?: string | null;
  kind?: string | null;
  professionalRole?: string | null;
}): string {
  if (opts.purpose === "managing_broker") return "Managing Broker";
  if (opts.purpose === "other_professional") {
    if (opts.professionalRole === "inspector") return "Inspector";
    if (opts.professionalRole === "appraiser") return "Appraiser";
    if (opts.professionalRole === "lender") return "Lender";
    return "Other Professional";
  }
  if (opts.kind === "agent") return "Sales Agent";
  if (opts.kind === "broker") return "Broker";
  if (opts.purpose === "individual_pro" || opts.kind === "pro") return "Story Pro";
  if (opts.purpose === "consumer" || opts.kind === "consumer") return "Consumer";
  return purposeLabel(opts.purpose);
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
  if (mayManageBrokerage(user.purpose)) return "/office";
  if (mayUseStoryPro(user.purpose, user.kind)) return "/portal";
  if (user.kind === "seller") return "/";
  return "/home";
}
