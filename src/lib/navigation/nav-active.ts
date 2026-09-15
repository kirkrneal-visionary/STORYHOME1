/**
 * Explicit active-tab map for the shared dock, drawer, and Archie ribbon.
 * Active means the URL is already there — never a pending hop.
 */

function isArchiePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === "/portal/intelligence" ||
    pathname.startsWith("/portal/intelligence/") ||
    pathname.startsWith("/portal/intelligence?")
  );
}

function isStoryProPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (!pathname.startsWith("/portal")) return false;
  return !isArchiePath(pathname);
}

export type PrimaryDockId =
  | "home"
  | "pro"
  | "archie"
  | "suites"
  | "search"
  | "profile";

export function isHomePath(pathname: string | null | undefined): boolean {
  return pathname === "/";
}

export function isMarketplacePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/marketplace" || pathname.startsWith("/marketplace/");
}

export function isSuitesPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/saved" || pathname.startsWith("/saved/");
}

export function isProfilePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/profile") || pathname.startsWith("/login");
}

export function isOfficePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/office" || pathname.startsWith("/office/");
}

export function isSettingsPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

export function isNetworkPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/network" || pathname.startsWith("/network/");
}

/** Dock / header Story Pro — never Archie. */
export function isProWorkspacePath(pathname: string | null | undefined): boolean {
  return isStoryProPath(pathname);
}

export function primaryDockId(pathname: string | null | undefined): PrimaryDockId | null {
  if (isHomePath(pathname)) return "home";
  if (isArchiePath(pathname)) return "archie";
  if (isProWorkspacePath(pathname)) return "pro";
  if (isMarketplacePath(pathname)) return "search";
  if (isSuitesPath(pathname)) return "suites";
  if (isProfilePath(pathname)) return "profile";
  return null;
}
