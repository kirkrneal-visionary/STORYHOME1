/**
 * Federated network navigation — Story Home host + Archie's Intelligence node.
 * Backend routes stay `/api/shi/*` and `/portal/intelligence`; this is UX only.
 */

export type NetworkId = "storyhome" | "archie";

export type NetworkLink = {
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
  /** Context ribbon / sub-nav links (Wave N2 consumes these) */
  modules: NetworkLink[];
};

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
        href: "/portal/intelligence",
        label: "Research",
        match: "/portal/intelligence",
      },
      {
        href: "/portal/intelligence?section=vault",
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
