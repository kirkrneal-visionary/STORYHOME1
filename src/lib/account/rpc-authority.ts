/**
 * Story Pro RPC authority.
 * Mirrors supabase/migrations/0056_story_pro_rpc_authority.sql.
 * UI overlays are accepted only so tests can prove they are ignored.
 */

export type RpcAuthRole = "anon" | "authenticated" | "service_role";

export type HostileClientOverlay = {
  viewAsBuyer?: boolean;
  navRole?: string | null;
  requestPurpose?: string | null;
  routeParam?: string | null;
  localKind?: string | null;
  hiddenControl?: string | null;
  roleLabel?: string | null;
  localStoragePurpose?: string | null;
};

/** Database rule. Purpose on the profile row — not a tab label. */
export function mayUseStoryProDb(purpose?: string | null): boolean {
  return purpose === "individual_pro" || purpose === "managing_broker";
}

/**
 * Authoritative neighbor / frontage RPC decision.
 * Overlay fields never change the result.
 */
export function decideStoryProRpc(opts: {
  role: RpcAuthRole;
  purpose?: string | null;
  overlay?: HostileClientOverlay;
}): "allow" | "deny" {
  void opts.overlay;
  if (opts.role === "service_role") return "allow";
  if (opts.role !== "authenticated") return "deny";
  return mayUseStoryProDb(opts.purpose) ? "allow" : "deny";
}
