/**
 * Sign in and Create account are two jobs. They must not share a password.
 * This module has no runtime @/ imports so Node tests can load it.
 */

export type AuthFormMode = "signin" | "signup" | "reset";

export type AuthFormDraft = {
  email: string;
  password: string;
  fullName: string;
  license: string;
};

export const LOGIN_EMAIL_STASH_KEY = "story-login-email";

export const emptyAuthDraft = (): AuthFormDraft => ({
  email: "",
  password: "",
  fullName: "",
  license: "",
});

/** Remember the last Sign in email. Never store a password. */
export function rememberSignInEmail(
  leaving: AuthFormMode,
  email: string,
  previousStash: string,
): string {
  if (leaving === "signin") return email.trim();
  return previousStash;
}

/**
 * Create account starts blank.
 * Returning to Sign in or Forgot password keeps the Sign in email and clears the password.
 */
export function draftAfterModeChange(opts: {
  next: AuthFormMode;
  leaving: AuthFormMode;
  draft: AuthFormDraft;
  signInEmail: string;
}): { draft: AuthFormDraft; signInEmail: string } {
  const signInEmail = rememberSignInEmail(
    opts.leaving,
    opts.draft.email,
    opts.signInEmail,
  );

  if (opts.next === "signup") {
    return { signInEmail, draft: emptyAuthDraft() };
  }

  return {
    signInEmail,
    draft: {
      email: signInEmail,
      password: "",
      fullName: "",
      license: "",
    },
  };
}

/** After logout, email may stay. Password must be typed again. */
export function draftAfterLogout(email: string | null | undefined): AuthFormDraft {
  return {
    email: (email ?? "").trim(),
    password: "",
    fullName: "",
    license: "",
  };
}

export function readStashedLoginEmail(): string {
  try {
    return (sessionStorage.getItem(LOGIN_EMAIL_STASH_KEY) ?? "").trim();
  } catch {
    return "";
  }
}

export function stashLoginEmail(email: string | null | undefined): void {
  const value = (email ?? "").trim();
  try {
    if (value) sessionStorage.setItem(LOGIN_EMAIL_STASH_KEY, value);
    else sessionStorage.removeItem(LOGIN_EMAIL_STASH_KEY);
  } catch {
    // ignore
  }
}
