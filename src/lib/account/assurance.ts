import type { AccountPurpose } from "@/lib/account/purpose";

export const GENERIC_AUTH_SENT =
  "If that account exists, we sent the next step to the email on file.";

export const GENERIC_SIGN_IN_ERROR = "Email or password is incorrect.";

export function isEmailConfirmed(emailConfirmedAt: string | null | undefined): boolean {
  return Boolean(emailConfirmedAt);
}

export const STORY_PRO_SETTINGS_BLOCKED =
  "Confirm your email before Story Pro settings.";

/** Portal, home, and private APIs after login. Sign-in is email and password only. */
export function canAccessPrivateApp(opts: { emailConfirmed: boolean }): boolean {
  return opts.emailConfirmed;
}

export const STORY_PRO_SETTINGS_NOT_THIS_ACCOUNT =
  "Story Pro settings cannot be changed on this account.";

/** Realtor fields follow the account on file, not View as Consumer. */
export function holdsRealtorSettingsPurpose(
  purpose: AccountPurpose | string | null | undefined,
): boolean {
  return (
    purpose === "individual_pro" ||
    purpose === "managing_broker" ||
    purpose === "other_professional"
  );
}

/** Professional profile and license cards. Settings itself stays open. */
export function canEditStoryProSettings(opts: {
  emailConfirmed: boolean;
  purpose: AccountPurpose | string | null | undefined;
}): boolean {
  if (!holdsRealtorSettingsPurpose(opts.purpose)) return false;
  return canAccessPrivateApp(opts);
}

/** Settings + login stay reachable so the user can finish email. */
export function canAccessSettingsWhilePending(): boolean {
  return true;
}

export function shouldStayOnLogin(opts: {
  recoveryMode: boolean;
  pendingEmail: boolean;
}): boolean {
  return opts.recoveryMode || opts.pendingEmail;
}

export function signInPublicMessage(errorMessage: string | undefined): string {
  const msg = (errorMessage ?? "").toLowerCase();
  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
    return "Confirm your email to continue. Check your inbox for the link.";
  }
  return GENERIC_SIGN_IN_ERROR;
}

export type ReadyReason = "ok" | "login" | "email";

export type AccountReadiness = {
  ok: boolean;
  reason: ReadyReason;
  emailConfirmed: boolean;
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
  return `/login?pending=email&next=${encodeURIComponent(nextPath)}`;
}

/** Pure gate used by portal, office, home, suites, and SHI APIs. */
export function decideReadiness(opts: {
  signedIn: boolean;
  emailConfirmed: boolean;
  nextPath?: string;
}): AccountReadiness {
  const nextPath = opts.nextPath ?? "/";
  const reason: ReadyReason = !opts.signedIn
    ? "login"
    : !opts.emailConfirmed
      ? "email"
      : "ok";
  return {
    ok: reason === "ok",
    reason,
    emailConfirmed: opts.emailConfirmed,
    redirectTo: redirectForReason(reason, nextPath),
  };
}
