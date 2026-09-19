/**
 * P1A-2 HTTP mapping over P1A-1 username RPCs.
 * Does not reproduce claim transactions. Username is not authorization.
 */

export const USERNAME_CACHE_CONTROL = "no-store";

export const USERNAME_LEAK_KEYS = [
  "account_id",
  "email",
  "display_name",
  "full_name",
  "account_purpose",
  "account_kind",
  "professional_role",
  "brokerage",
  "brokerage_id",
  "trec_license",
  "trec_status",
  "release_reason",
  "reserved_kind",
  "state",
  "holder",
  "prior_holder",
  "changes_in_window",
  "changes_remaining",
] as const;

const SYNTAX_CODES = new Set(["too_short", "too_long", "bad_chars"]);

export type UsernameAvailabilityStatus =
  | "invalid"
  | "available"
  | "unavailable";

export type UsernameAvailabilityResponse = {
  status: UsernameAvailabilityStatus;
  normalized?: string;
  code?: "too_short" | "too_long" | "bad_chars";
};

export type UsernameClaimResponse = {
  ok: boolean;
  normalized?: string;
  error?: string;
  code?: string;
  retryAfter?: string;
};

export type UsernameRpcRow = {
  normalized?: string | null;
  status?: string | null;
  code?: string | null;
  ok?: boolean | null;
  error_code?: string | null;
};

export type UsernameOwnMutationState = {
  cooldown_until?: string | null;
  active_normalized?: string | null;
};

export type UsernameOwnResponse = {
  username: string | null;
};

export function usernameHeaders(): HeadersInit {
  return { "cache-control": USERNAME_CACHE_CONTROL };
}

export function readUsernameQuery(raw: string | null): string {
  return (raw ?? "").toString();
}

export function readClaimUsername(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const username = (body as { username?: unknown }).username;
  return typeof username === "string" ? username : "";
}

export function mapAvailabilityRow(
  row: UsernameRpcRow | null | undefined,
): UsernameAvailabilityResponse {
  const status = row?.status;
  if (status === "invalid") {
    const code = SYNTAX_CODES.has(row?.code ?? "")
      ? (row?.code as "too_short" | "too_long" | "bad_chars")
      : "bad_chars";
    const out: UsernameAvailabilityResponse = { status: "invalid", code };
    if (row?.normalized) out.normalized = row.normalized;
    return out;
  }
  if (status === "available" && row?.normalized) {
    return { status: "available", normalized: row.normalized };
  }
  if (status === "unavailable" && row?.normalized) {
    return { status: "unavailable", normalized: row.normalized };
  }
  return { status: "unavailable" };
}

function syntaxMessage(code: string): string {
  if (code === "too_short") return "That username is too short.";
  if (code === "too_long") return "That username is too long.";
  return "That username uses invalid characters.";
}

function ownCooldownMessage(until: string | null | undefined): string {
  if (!until) return "You can change your username again later.";
  const day = until.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return `You can change your username again after ${day}.`;
  }
  return "You can change your username again later.";
}

export function mapClaimRow(
  row: UsernameRpcRow | null | undefined,
  own?: UsernameOwnMutationState | null,
): { body: UsernameClaimResponse; status: number } {
  if (row?.ok) {
    return {
      status: 200,
      body: { ok: true, normalized: row.normalized ?? undefined },
    };
  }
  const code = row?.error_code ?? "unavailable";
  if (code === "sign_in_required") {
    return {
      status: 401,
      body: { ok: false, error: "Sign in required.", code },
    };
  }
  if (SYNTAX_CODES.has(code)) {
    return {
      status: 400,
      body: { ok: false, error: syntaxMessage(code), code },
    };
  }
  if (code === "cooldown") {
    return {
      status: 429,
      body: {
        ok: false,
        error: ownCooldownMessage(own?.cooldown_until),
        code,
        retryAfter: own?.cooldown_until ?? undefined,
      },
    };
  }
  if (code === "change_limit") {
    return {
      status: 429,
      body: {
        ok: false,
        error: "You have reached the username-change limit.",
        code,
      },
    };
  }
  return {
    status: 409,
    body: { ok: false, error: "Username unavailable.", code: "unavailable" },
  };
}

export function firstRpcRow<T>(data: T | T[] | null): T | null {
  if (!data) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}
