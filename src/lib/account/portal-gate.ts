import type { PromoteProResult } from "./promote-pro";

export type PortalPageAccess = "login" | "refuse" | "allow";

export function portalPageAccess(result: PromoteProResult): PortalPageAccess {
  if (!result.ok) return "login";
  if (result.accountPurpose === "individual_pro") return "allow";
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
      body: "This login manages a brokerage. Story Pro stays with each realtor’s own account.",
      href: "/settings",
      cta: "Open settings",
    };
  }
  return {
    title: "For realtors",
    body: "Story Pro is for approved individual realtor and broker accounts.",
    href: "/",
    cta: "Back home",
  };
}
