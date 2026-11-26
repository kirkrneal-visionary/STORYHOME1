/**
 * One password rule for create account, password reset, and change password.
 * PASSWORD_MIN_LENGTH must equal Supabase Auth "Minimum password length" on the
 * live project (6 when read on 2026-11-25, no required character types).
 * Supabase also refuses passwords found in known data leaks; that answer only
 * arrives on submit, so the form shows it after Supabase says so.
 */
export const PASSWORD_MIN_LENGTH = 6;

export const PASSWORD_RULE_COPY = `At least ${PASSWORD_MIN_LENGTH} characters`;

export const PASSWORD_LEAKED_COPY =
  "This password is too common or has shown up in a data leak. Choose a different one.";

export const SIGNUP_GENERIC_COPY =
  "Unable to create this account. Try again or sign in.";

export const PASSWORD_UPDATE_GENERIC_COPY = "Unable to update password.";

/** GoTrue still blocks password/email updates when auth.mfa_factors has a row. */
export const PASSWORD_STILL_HAS_AUTHENTICATOR_COPY =
  "This account still has an old authenticator saved. Story Home no longer uses verification codes — try this reset link again after we finish cleanup, or sign in and change your password in Settings.";

export function passwordTooShortCopy(min = PASSWORD_MIN_LENGTH): string {
  return `Use at least ${min} characters.`;
}

/** Supabase counts characters (code points), not UTF-16 units like `.length`. */
export function passwordLength(password: string): number {
  return Array.from(password).length;
}

export function meetsPasswordRule(password: string): boolean {
  return passwordLength(password) >= PASSWORD_MIN_LENGTH;
}

type AuthErrorLike =
  | { message?: string; code?: string; reasons?: readonly string[] }
  | null
  | undefined;

function numberIn(message: string, pattern: RegExp): number | null {
  const n = Number(pattern.exec(message)?.[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Plain copy when Supabase refused the password itself; null for any other failure. */
export function passwordRejectedMessage(error: AuthErrorLike): string | null {
  const code = (error?.code ?? "").toLowerCase();
  const msg = (error?.message ?? "").toLowerCase();
  const reasons = error?.reasons ?? [];
  if (reasons.includes("length") || /at least \d+ characters/.test(msg)) {
    return passwordTooShortCopy(
      numberIn(msg, /at least (\d+) characters/) ?? PASSWORD_MIN_LENGTH,
    );
  }
  if (
    reasons.includes("pwned") ||
    msg.includes("pwned") ||
    msg.includes("easy to guess")
  ) {
    return PASSWORD_LEAKED_COPY;
  }
  if (msg.includes("cannot be longer than")) {
    const max = numberIn(msg, /cannot be longer than (\d+)/) ?? 72;
    return `Use ${max} characters or fewer.`;
  }
  if (code === "same_password") {
    return "Choose a password that is different from your current one.";
  }
  if (code === "weak_password") {
    return "Choose a different password.";
  }
  return null;
}

export function signUpPublicMessage(error: AuthErrorLike): string {
  const rejected = passwordRejectedMessage(error);
  if (rejected) return rejected;
  const code = (error?.code ?? "").toLowerCase();
  const msg = (error?.message ?? "").toLowerCase();
  if (
    code === "user_already_exists" ||
    msg.includes("already registered") ||
    msg.includes("already exists")
  ) {
    return "That email already has an account. Sign in or reset the password.";
  }
  return SIGNUP_GENERIC_COPY;
}

export function passwordStillHasAuthenticator(error: AuthErrorLike): boolean {
  const code = (error?.code ?? "").toLowerCase();
  const msg = (error?.message ?? "").toLowerCase();
  return (
    code === "insufficient_aal" ||
    msg.includes("aal2") ||
    msg.includes("mfa is enabled") ||
    msg.includes("authenticator")
  );
}

export function passwordUpdatePublicMessage(error: AuthErrorLike): string {
  const rejected = passwordRejectedMessage(error);
  if (rejected) return rejected;
  if (passwordStillHasAuthenticator(error)) return PASSWORD_STILL_HAS_AUTHENTICATOR_COPY;
  return PASSWORD_UPDATE_GENERIC_COPY;
}
