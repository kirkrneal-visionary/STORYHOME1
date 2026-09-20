/**
 * P1B-1 Settings query-param navigation.
 * Query-param categories only. No nested Settings route tree.
 * This module has no runtime @/ imports so Node tests can load it.
 */

import { destForUser } from "./purpose";
import type { SettingsCapabilities } from "./settings-capabilities";

export const SETTINGS_ORIGIN_STORAGE_KEY = "story-settings-origin";

export type SettingsCategory =
  | "account"
  | "security"
  | "professional"
  | "office";

export type SettingsControl =
  | "username"
  | "profile"
  | "email"
  | "password"
  | "authenticator"
  | "device"
  | "delete"
  | "identity"
  | "license"
  | "living"
  | "brokerage"
  | "open"
  | "workspace";

export type SettingsSearch = {
  category: SettingsCategory | null;
  control: SettingsControl | null;
  setupMfa: boolean;
  from: string | null;
  rawCategory: string | null;
  rawControl: string | null;
};

export type SettingsLocation = {
  screen: "root" | "category" | "control";
  category: SettingsCategory | null;
  control: SettingsControl | null;
  setupMfa: boolean;
};

const CATEGORIES = new Set<string>([
  "account",
  "security",
  "professional",
  "office",
]);

const CONTROLS = new Set<string>([
  "username",
  "profile",
  "email",
  "password",
  "authenticator",
  "device",
  "delete",
  "identity",
  "license",
  "living",
  "brokerage",
  "open",
  "workspace",
]);

const ORIGIN_MAX = 512;

const ORIGIN_PATH = [
  /^\/$/,
  /^\/home(?:\/|$)/,
  /^\/marketplace(?:\/|$)/,
  /^\/saved(?:\/|$)/,
  /^\/portal(?:\/|$)/,
  /^\/office(?:\/|$)/,
  /^\/network(?:\/|$)/,
  /^\/profile(?:\/|$)/,
  /^\/agents(?:\/|$)/,
  /^\/b(?:\/|$)/,
  /^\/u(?:\/|$)/,
  /^\/rent(?:\/|$)/,
  /^\/seller(?:\/|$)/,
  /^\/following(?:\/|$)/,
  /^\/referrals(?:\/|$)/,
  /^\/messages(?:\/|$)/,
  /^\/about(?:\/|$)/,
  /^\/contact(?:\/|$)/,
  /^\/privacy(?:\/|$)/,
  /^\/terms(?:\/|$)/,
  /^\/fair-housing(?:\/|$)/,
  /^\/accessibility(?:\/|$)/,
];

function asCategory(raw: string | null): SettingsCategory | null {
  if (!raw || !CATEGORIES.has(raw)) return null;
  return raw as SettingsCategory;
}

function asControl(raw: string | null): SettingsControl | null {
  if (!raw || !CONTROLS.has(raw)) return null;
  return raw as SettingsControl;
}

export function parseSettingsSearch(params: {
  get(name: string): string | null;
}): SettingsSearch {
  const rawCategory = params.get("category");
  const rawControl = params.get("control");
  const setupMfa = params.get("setup") === "mfa";
  const category = asCategory(rawCategory);
  return {
    category,
    control: asControl(rawControl),
    setupMfa,
    from: params.get("from"),
    rawCategory,
    rawControl,
  };
}

export function categoryAllowed(
  category: SettingsCategory | null,
  caps: SettingsCapabilities,
): boolean {
  if (!category) return false;
  if (category === "account" || category === "security") return true;
  if (category === "professional") return caps.professional;
  if (category === "office") return caps.office;
  return false;
}

export function resolveSettingsLocation(
  search: SettingsSearch,
  caps: SettingsCapabilities,
): SettingsLocation {
  if (search.setupMfa) {
    return {
      screen: "control",
      category: "security",
      control: "authenticator",
      setupMfa: true,
    };
  }

  const username =
    search.control === "username" || search.rawControl === "username";
  if (username) {
    return {
      screen: "control",
      category: "account",
      control: "username",
      setupMfa: false,
    };
  }

  if (!categoryAllowed(search.category, caps)) {
    return {
      screen: "root",
      category: null,
      control: null,
      setupMfa: false,
    };
  }

  const category = search.category as SettingsCategory;
  if (category === "account" && search.control === "profile") {
    return {
      screen: "control",
      category,
      control: "profile",
      setupMfa: false,
    };
  }
  if (
    category === "security" &&
    (search.control === "email" ||
      search.control === "password" ||
      search.control === "authenticator" ||
      search.control === "device" ||
      search.control === "delete")
  ) {
    return {
      screen: "control",
      category,
      control: search.control,
      setupMfa: false,
    };
  }
  if (category === "professional" && search.control === "identity") {
    return {
      screen: "control",
      category,
      control: "identity",
      setupMfa: false,
    };
  }
  if (category === "professional" && search.control === "profile") {
    return {
      screen: "control",
      category,
      control: "profile",
      setupMfa: false,
    };
  }
  if (
    category === "professional" &&
    search.control === "license" &&
    caps.trecLicense
  ) {
    return {
      screen: "control",
      category,
      control: "license",
      setupMfa: false,
    };
  }
  if (
    category === "professional" &&
    search.control === "living" &&
    caps.livingMark
  ) {
    return {
      screen: "control",
      category,
      control: "living",
      setupMfa: false,
    };
  }
  if (
    category === "professional" &&
    search.control === "brokerage" &&
    caps.brokerage
  ) {
    return {
      screen: "control",
      category,
      control: "brokerage",
      setupMfa: false,
    };
  }
  if (category === "office" && search.control === "open" && caps.openOffice) {
    return {
      screen: "control",
      category,
      control: "open",
      setupMfa: false,
    };
  }
  if (
    category === "office" &&
    search.control === "workspace" &&
    caps.officeWorkspace
  ) {
    return {
      screen: "control",
      category,
      control: "workspace",
      setupMfa: false,
    };
  }

  return {
    screen: "category",
    category,
    control: null,
    setupMfa: false,
  };
}

export function buildSettingsHref(opts: {
  category?: SettingsCategory | null;
  control?: SettingsControl | null;
  setup?: "mfa" | null;
  from?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.category) params.set("category", opts.category);
  if (opts.control) params.set("control", opts.control);
  if (opts.setup === "mfa") params.set("setup", "mfa");
  const from = sanitizeSettingsOrigin(opts.from);
  if (from) params.set("from", from);
  const q = params.toString();
  return q ? `/settings?${q}` : "/settings";
}

export function settingsEntryHref(
  pathname: string,
  search = "",
): string {
  if (!pathname || pathname === "/settings" || pathname.startsWith("/settings/")) {
    return "/settings";
  }
  const query = search.startsWith("?") ? search.slice(1) : search;
  const candidate = query ? `${pathname}?${query}` : pathname;
  const from = sanitizeSettingsOrigin(candidate) ?? sanitizeSettingsOrigin(pathname);
  return buildSettingsHref({ from });
}

export function sanitizeSettingsOrigin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value || value.length > ORIGIN_MAX) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  if (value.includes("://") || value.includes("\\")) return null;
  if (/[\u0000-\u001F<>'"]/.test(value)) return null;
  if (/^[a-zA-Z][a-zA-Z+.-]*:/.test(value)) return null;

  let url: URL;
  try {
    url = new URL(value, "https://storyhome.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://storyhome.invalid") return null;
  if (url.username || url.password) return null;

  const pathname = url.pathname;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return null;
  if (pathname === "/login" || pathname.startsWith("/login/")) return null;
  if (!ORIGIN_PATH.some((re) => re.test(pathname))) return null;
  if (url.search.includes("://") || url.search.includes("\\")) return null;
  return `${pathname}${url.search}`;
}

export function fallbackSettingsOrigin(user: {
  kind: string;
  purpose?: string | null;
}): string {
  return destForUser(user);
}

export function rememberSettingsOrigin(origin: string | null): string | null {
  const safe = sanitizeSettingsOrigin(origin);
  if (typeof window === "undefined") return safe;
  try {
    if (safe) {
      window.sessionStorage.setItem(SETTINGS_ORIGIN_STORAGE_KEY, safe);
      return safe;
    }
    const stored = sanitizeSettingsOrigin(
      window.sessionStorage.getItem(SETTINGS_ORIGIN_STORAGE_KEY),
    );
    return stored;
  } catch {
    return safe;
  }
}

export function readRememberedSettingsOrigin(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sanitizeSettingsOrigin(
      window.sessionStorage.getItem(SETTINGS_ORIGIN_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

export function sameOriginReferrerPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const ref = document.referrer;
    if (!ref) return null;
    const url = new URL(ref);
    if (url.origin !== window.location.origin) return null;
    return sanitizeSettingsOrigin(`${url.pathname}${url.search}`);
  } catch {
    return null;
  }
}
