/**
 * P1A-3 Settings username UX helpers.
 * Presentation only. Claim/availability stay on the server.
 */

import {
  USERNAME_MIN_LEN,
  usernameSyntax,
  usernameSyntaxCopy,
  type UsernameSyntaxCode,
} from "./username";
import type {
  UsernameAvailabilityResponse,
  UsernameClaimResponse,
} from "./username-api";

export const USERNAME_DEBOUNCE_MS = 350;

export type UsernameUiPhase =
  | "idle"
  | "invalid"
  | "checking"
  | "available"
  | "unavailable"
  | "current"
  | "saved"
  | "cooldown"
  | "change_limit"
  | "error";

export function canSaveUsername(opts: {
  shaped: string;
  syntax: UsernameSyntaxCode | null;
  phase: UsernameUiPhase;
  saving: boolean;
}): boolean {
  if (opts.saving) return false;
  if (!opts.shaped || opts.syntax) return false;
  if (opts.phase === "unavailable" || opts.phase === "checking") return false;
  if (opts.phase === "invalid") return false;
  if (opts.phase === "cooldown" || opts.phase === "change_limit") return false;
  if (opts.phase === "error") return true;
  return (
    opts.phase === "available" ||
    opts.phase === "current" ||
    opts.phase === "saved"
  );
}

export function usernameStatusCopy(opts: {
  phase: UsernameUiPhase;
  syntax: UsernameSyntaxCode | null;
  shaped: string;
  claim?: UsernameClaimResponse | null;
}): { text: string; tone: "muted" | "ok" | "bad" } {
  if (opts.phase === "checking") {
    return { text: "Checking…", tone: "muted" };
  }
  if (opts.phase === "available") {
    return { text: `@${opts.shaped} · Available`, tone: "ok" };
  }
  if (opts.phase === "current" || opts.phase === "saved") {
    return { text: `@${opts.shaped} · Current username`, tone: "ok" };
  }
  if (opts.phase === "unavailable") {
    return { text: "Username unavailable", tone: "bad" };
  }
  if (opts.phase === "cooldown") {
    return {
      text: opts.claim?.error || "You can change your username again later.",
      tone: "bad",
    };
  }
  if (opts.phase === "change_limit") {
    return {
      text: opts.claim?.error || "You have reached the username-change limit.",
      tone: "bad",
    };
  }
  if (opts.phase === "error") {
    return {
      text: opts.claim?.error || "Couldn't save that username. Try again.",
      tone: "bad",
    };
  }
  if (opts.phase === "invalid" && opts.syntax) {
    return { text: usernameSyntaxCopy(opts.syntax), tone: "bad" };
  }
  if (opts.shaped && opts.shaped.length < USERNAME_MIN_LEN) {
    return { text: "Use at least 4 characters.", tone: "muted" };
  }
  return { text: "4–20 characters. Letters, numbers, underscore.", tone: "muted" };
}

export function phaseAfterAvailability(opts: {
  shaped: string;
  current: string | null;
  syntax: UsernameSyntaxCode | null;
  result: UsernameAvailabilityResponse | null;
}): UsernameUiPhase {
  if (opts.syntax) return "invalid";
  if (opts.current && opts.shaped === opts.current) return "current";
  if (!opts.result) return "checking";
  if (opts.result.status === "available") return "available";
  if (opts.result.status === "invalid") return "invalid";
  return "unavailable";
}

export function phaseAfterClaim(
  result: UsernameClaimResponse,
): UsernameUiPhase {
  if (result.ok) return "saved";
  if (result.code === "cooldown") return "cooldown";
  if (result.code === "change_limit") return "change_limit";
  if (result.code === "unavailable") return "unavailable";
  if (
    result.code === "too_short" ||
    result.code === "too_long" ||
    result.code === "bad_chars"
  ) {
    return "invalid";
  }
  return "error";
}

export function formatOwnChangeDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    const day = iso.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ownCooldownCopy(iso: string | null | undefined): string {
  const pretty = formatOwnChangeDate(iso);
  if (pretty) return `You can change your username again on ${pretty}.`;
  return "You can change your username again later.";
}

export function shouldCheckAvailability(opts: {
  shaped: string;
  syntax: UsernameSyntaxCode | null;
  current: string | null;
}): boolean {
  if (!opts.shaped || opts.syntax) return false;
  if (opts.shaped.length < USERNAME_MIN_LEN) return false;
  if (opts.current && opts.shaped === opts.current) return false;
  return true;
}

export { usernameSyntax, usernameSyntaxCopy };
