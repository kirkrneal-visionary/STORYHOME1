/**
 * Federated network navigation — Story Home host + Archie's Intelligence node.
 * Backend routes stay `/api/shi/*` and `/portal/intelligence`; this is UX only.
 */

import type { ArchieModule } from "@/lib/navigation/archieMemory";
import { archieHrefForModule } from "@/lib/navigation/archieMemory";

export type NetworkId = "storyhome" | "archie";

export type NetworkLink = {
  id?: ArchieModule;
  href: string;
  label: string;
  /** Match path prefix for active state */
  match?: string;
};

export type NetworkDefinition = {
  id: NetworkId;
  label: string;
  shortLabel: string;
  href: string;
  /** Paths that activate this network node */
  matchPrefixes: string[];
  /** Context ribbon / sub-nav links */
  modules: NetworkLink[];
};

/** Top bar height (px) — keep in sync with --story-header-h (full state). */
export const GLOBAL_NAV_HEIGHT_PX = 72;

/** Floating phone bottom nav clearance — keep in sync with --story-bottom-clearance. */
export const STORY_BOTTOM_CLEARANCE_PX = 76;

/** Archie context ribbon height (px) — keep in sync with --story-archie-ribbon-h. */
export const ARCHIE_RIBBON_HEIGHT_PX = 40;

export const NAVIGATION_NETWORKS: Record<NetworkId, NetworkDefinition> = {
  storyhome: {
    id: "storyhome",
    label: "Story Home",
    shortLabel: "Story Home",
    href: "/",
    matchPrefixes: ["/"],
    modules: [],
  },
  archie: {
    id: "archie",
    label: "Archie's Intelligence",
    shortLabel: "Intelligence",
    href: "/portal/intelligence",
    matchPrefixes: ["/portal/intelligence"],
    modules: [
      {
        id: "research",
        href: archieHrefForModule("research"),
        label: "Research",
        match: "/portal/intelligence",
      },
      {
        id: "corridors",
        href: archieHrefForModule("corridors"),
        label: "Corridors",
        match: "/portal/intelligence",
      },
      {
        id: "prospects",
        href: archieHrefForModule("prospects"),
        label: "Prospects",
        match: "/portal/intelligence",
      },
      {
        id: "farms",
        href: archieHrefForModule("farms"),
        label: "Farms",
        match: "/portal/intelligence",
      },
      {
        id: "vault",
        href: archieHrefForModule("vault"),
        label: "Study Vault",
        match: "/portal/intelligence",
      },
    ],
  },
};

export const ARCHIE_MARK_SRC = "/brand/archie-intelligence.png" as const;

export function isArchiePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return NAVIGATION_NETWORKS.archie.matchPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function activeNetworkId(
  pathname: string | null | undefined,
): NetworkId {
  return isArchiePath(pathname) ? "archie" : "storyhome";
}

/** Story Pro workspace (tools, listings, …) — not Archie. */
export function isStoryProPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (!pathname.startsWith("/portal")) return false;
  return !isArchiePath(pathname);
}

export function isArchieModuleActive(
  module: ArchieModule,
  section: string | null | undefined,
): boolean {
  const current =
    section === "vault"
      ? "vault"
      : section === "prospects"
        ? "prospects"
        : section === "farms"
          ? "farms"
          : section === "corridors"
            ? "corridors"
            : "research";
  return current === module;
}
