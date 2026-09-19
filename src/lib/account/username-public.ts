/**
 * P1A-4 public /u/[username] mapping.
 * Username is a public alias. It is not authorization.
 * Only ACTIVE registry rows resolve. Reserved / tombstoned / unknown are 404.
 */

import { inspectUsername } from "./username";
import { agentWorldPath } from "@/lib/living-mark/share";

export const USERNAME_PUBLIC_PROFILE_SELECT =
  "id, full_name, photo_url, account_purpose, account_kind" as const;

export const USERNAME_PUBLIC_FIELD_ALLOWLIST = [
  "id",
  "full_name",
  "photo_url",
  "account_purpose",
  "account_kind",
] as const;

export const USERNAME_PUBLIC_FORBIDDEN_SELECT = [
  "email",
  "phone",
  "legal_full_name",
  "trec_license",
  "trec_status",
  "sponsor_name",
  "sponsor_license_number",
  "brokerage_id",
  "professional_role",
  "bio",
  "website",
  "living_mark_video_url",
  "username_normalized",
  "forced_logout_at",
] as const;

export type UsernamePublicKind = "consumer" | "professional";

export type UsernamePublicStub = {
  username: string;
  displayName: string;
  kind: UsernamePublicKind;
  photoUrl: string | null;
  agentWorldHref: string | null;
};

export type UsernamePublicProfileRow = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  account_purpose: string | null;
  account_kind: string | null;
};

export function classifyUsernamePublicKind(
  purpose?: string | null,
  kind?: string | null,
): UsernamePublicKind {
  if (
    purpose === "individual_pro" ||
    purpose === "managing_broker" ||
    purpose === "other_professional"
  ) {
    return "professional";
  }
  if (kind === "agent" || kind === "broker" || kind === "pro") {
    return "professional";
  }
  return "consumer";
}

export function publicUsernamePath(normalized: string): string {
  return `/u/${normalized}`;
}

export function canonicalUsernameParam(
  raw: string | null | undefined,
): string | null {
  const inspected = inspectUsername(raw);
  return inspected.status === "ok" ? inspected.normalized : null;
}

/** True when the URL should 308 to the lowercase canonical /u/ path. */
export function needsUsernameCanonicalRedirect(
  raw: string,
  normalized: string,
): boolean {
  return raw !== normalized;
}

export function stubFromPublicRow(
  username: string,
  row: UsernamePublicProfileRow,
): UsernamePublicStub {
  const kind = classifyUsernamePublicKind(row.account_purpose, row.account_kind);
  const displayName = (row.full_name ?? "").trim() || "Story Home";
  return {
    username,
    displayName,
    kind,
    photoUrl: row.photo_url?.trim() || null,
    agentWorldHref: kind === "professional" ? agentWorldPath(row.id) : null,
  };
}

export function initialsFromDisplayName(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type DemoPublicRow = UsernamePublicProfileRow & { username: string; state: "active" | "tombstoned" };

const demoPublicRows: DemoPublicRow[] = [];

export function resetDemoPublicUsernames() {
  demoPublicRows.length = 0;
  demoPublicRows.push(
    {
      username: "jordanhale",
      state: "active",
      id: "user-buyer",
      full_name: "Jordan Hale",
      photo_url: null,
      account_purpose: "consumer",
      account_kind: "consumer",
    },
    {
      username: "sarahpro",
      state: "active",
      id: "user-realtor",
      full_name: "Sarah Jenkins",
      photo_url: null,
      account_purpose: "individual_pro",
      account_kind: "agent",
    },
    {
      username: "oldname",
      state: "tombstoned",
      id: "user-gone",
      full_name: "Gone",
      photo_url: null,
      account_purpose: "consumer",
      account_kind: "consumer",
    },
  );
}

resetDemoPublicUsernames();

export function demoResolvePublicUsername(
  raw: string,
): UsernamePublicStub | null {
  const normalized = canonicalUsernameParam(raw);
  if (!normalized) return null;
  const row = demoPublicRows.find(
    (item) => item.username === normalized && item.state === "active",
  );
  if (!row) return null;
  return stubFromPublicRow(normalized, row);
}

export function demoChangePublicUsername(
  accountId: string,
  nextRaw: string,
): UsernamePublicStub | null {
  const next = canonicalUsernameParam(nextRaw);
  if (!next) return null;
  const current = demoPublicRows.find(
    (item) => item.id === accountId && item.state === "active",
  );
  if (!current) return null;
  current.state = "tombstoned";
  const created: DemoPublicRow = {
    ...current,
    username: next,
    state: "active",
  };
  demoPublicRows.push(created);
  return stubFromPublicRow(next, created);
}
