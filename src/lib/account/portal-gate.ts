import type { PromoteProResult } from "./promote-pro";
import { mayUseStoryPro } from "./purpose";

export type PortalPageAccess = "login" | "refuse" | "allow";

export function portalPageAccess(result: PromoteProResult): PortalPageAccess {
  if (!result.ok) return "login";
  if (mayUseStoryPro(result.accountPurpose, result.accountKind)) return "allow";
  return "refuse";
}

export function portalRefuseCopy(purpose?: string | null): {
  title: string;
  body: string;
  href: string;
  cta: string;
} {
  if (purpose === "managing_broker") {
    return {
      title: "Office account",
      body: "This login manages a brokerage. Story Pro, Archie, and buyer view stay on this same login.",
      href: "/portal",
      cta: "Open Story Pro",
    };
  }
  return {
    title: "For realtors",
    body: "Story Pro is for approved individual realtor and broker accounts.",
    href: "/",
    cta: "Back home",
  };
}
