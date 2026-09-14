import type { AccountPurpose } from "@/lib/account/purpose";

export type AssuranceLevel = "aal1" | "aal2";

export const GENERIC_AUTH_SENT =
  "If that account exists, we sent the next step to the email on file.";

export const GENERIC_SIGN_IN_ERROR = "Email or password is incorrect.";

export function isEmailConfirmed(emailConfirmedAt: string | null | undefined): boolean {
  return Boolean(emailConfirmedAt);
}

/** MFA is required for licensed Story Pro and office-admin accounts. */
export function mfaRequiredForPurpose(purpose: AccountPurpose | string | null | undefined): boolean {
  return purpose === "individual_pro" || purpose === "managing_broker";
}

export function mfaRequired(
  purpose: AccountPurpose | string | null | undefined,
  kind: string | null | undefined,
): boolean {
  if (purpose) return mfaRequiredForPurpose(purpose);
  return kind === "agent" || kind === "broker" || kind === "pro";
}

export function needsMfaEnrollment(opts: {
  purpose: AccountPurpose | string | null | undefined;
  kind: string | null | undefined;
  enrolled: boolean;
}): boolean {
  return mfaRequired(opts.purpose, opts.kind) && !opts.enrolled;
}

export function needsMfaChallenge(opts: {
  purpose: AccountPurpose | string | null | undefined;
  kind: string | null | undefined;
  enrolled: boolean;
  currentAal: AssuranceLevel | null | undefined;
}): boolean {
  if (!mfaRequired(opts.purpose, opts.kind)) return false;
  if (!opts.enrolled) return false;
  return opts.currentAal !== "aal2";
}

/** Portal, home, and private APIs after login. */
export function canAccessPrivateApp(opts: {
  emailConfirmed: boolean;
  purpose: AccountPurpose | string | null | undefined;
  kind: string | null | undefined;
  enrolled: boolean;
  currentAal: AssuranceLevel | null | undefined;
}): boolean {
  if (!opts.emailConfirmed) return false;
  if (needsMfaEnrollment(opts)) return false;
  if (needsMfaChallenge(opts)) return false;
  return true;
}

/** Settings + login stay reachable so the user can finish email / MFA. */
export function canAccessSettingsWhilePending(): boolean {
  return true;
}

export function shouldStayOnLogin(opts: {
  recoveryMode: boolean;
  pendingEmail: boolean;
  pendingMfa: boolean;
}): boolean {
  return opts.recoveryMode || opts.pendingEmail || opts.pendingMfa;
}

export function signInPublicMessage(errorMessage: string | undefined): string {
  const msg = (errorMessage ?? "").toLowerCase();
  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
    return "Confirm your email to continue. Check your inbox for the link.";
  }
  return GENERIC_SIGN_IN_ERROR;
}

export function parseAssuranceLevel(value: string | null | undefined): AssuranceLevel | null {
  if (value === "aal1" || value === "aal2") return value;
  return null;
}

export type ReadyReason =
  | "ok"
  | "login"
  | "email"
  | "mfa_enroll"
  | "mfa_challenge";

export type AccountReadiness = {
  ok: boolean;
  reason: ReadyReason;
  emailConfirmed: boolean;
  enrolled: boolean;
  currentAal: AssuranceLevel | null;
  redirectTo: string | null;
};

export function redirectForReason(
  reason: ReadyReason,
  nextPath: string,
): string | null {
  if (reason === "ok") return null;
  if (reason === "login") {
    return `/login?next=${encodeURIComponent(nextPath)}`;
  }
  if (reason === "email") {
    return `/login?pending=email&next=${encodeURIComponent(nextPath)}`;
  }
  if (reason === "mfa_enroll") return "/settings?setup=mfa";
  return `/login?pending=mfa&next=${encodeURIComponent(nextPath)}`;
}

/** Pure gate used by portal, home, and SHI APIs. */
export function decideReadiness(opts: {
  signedIn: boolean;
  emailConfirmed: boolean;
  purpose: AccountPurpose | string | null | undefined;
  kind: string | null | undefined;
  enrolled: boolean;
  currentAal: AssuranceLevel | null | undefined;
  nextPath?: string;
}): AccountReadiness {
  const nextPath = opts.nextPath ?? "/";
  const empty = {
    emailConfirmed: opts.emailConfirmed,
    enrolled: opts.enrolled,
    currentAal: opts.currentAal ?? null,
  };
  if (!opts.signedIn) {
    return {
      ok: false,
      reason: "login",
      ...empty,
      redirectTo: redirectForReason("login", nextPath),
    };
  }
  if (!opts.emailConfirmed) {
    return {
      ok: false,
      reason: "email",
      ...empty,
      redirectTo: redirectForReason("email", nextPath),
    };
  }
  if (
    needsMfaEnrollment({
      purpose: opts.purpose,
      kind: opts.kind,
      enrolled: opts.enrolled,
    })
  ) {
    return {
      ok: false,
      reason: "mfa_enroll",
      ...empty,
      redirectTo: redirectForReason("mfa_enroll", nextPath),
    };
  }
  if (
    needsMfaChallenge({
      purpose: opts.purpose,
      kind: opts.kind,
      enrolled: opts.enrolled,
      currentAal: opts.currentAal,
    })
  ) {
    return {
      ok: false,
      reason: "mfa_challenge",
      ...empty,
      redirectTo: redirectForReason("mfa_challenge", nextPath),
    };
  }
  return {
    ok: canAccessPrivateApp({
      emailConfirmed: opts.emailConfirmed,
      purpose: opts.purpose,
      kind: opts.kind,
      enrolled: opts.enrolled,
      currentAal: opts.currentAal,
    }),
    reason: "ok",
    ...empty,
    redirectTo: null,
  };
}
