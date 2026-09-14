import type { PromoteProResult } from "./promote-pro";

export type PortalPageAccess = "login" | "refuse" | "allow";

/** Who may see Story Pro page chrome after the TREC promote attempt. */
export function portalPageAccess(result: PromoteProResult): PortalPageAccess {
  if (!result.ok) return "login";
  if (result.accountKind !== "agent" && result.accountKind !== "broker") {
    return "refuse";
  }
  return "allow";
}
