import {
  demoResolvePublicUsername,
  type UsernamePublicStub,
} from "@/lib/account/username-public";
import { DEMO_AGENT, type DemoAgent } from "@/lib/demo-data";

/** Preview/local only. Production Vercel must 404 these review routes. */
export function isUi3aOwnerReviewAllowed(
  vercelEnv = process.env.VERCEL_ENV,
): boolean {
  return vercelEnv !== "production";
}

/**
 * Runtime host lock. Git preview aliases stay open.
 * Blocked live hosts: storyhome-1-eqmg.vercel.app, www.storyhome.app, storyhome.app
 */
export function isUi3aOwnerReviewHost(host: string | null | undefined): boolean {
  const h = (host ?? "").split(":")[0]?.toLowerCase() ?? "";
  if (!h || h === "localhost" || h === "127.0.0.1") return true;
  return h.includes("-git-") && h.endsWith(".vercel.app");
}

export const UI3A_OWNER_REVIEW_WORLD_PATH = "/internal/ui-3a-review/world";
export const UI3A_OWNER_REVIEW_ENTRY_PATH = "/internal/ui-3a-review/entry";

/** Same approved local fixture used for UI-3A screenshots. Not a hosted profile. */
export function ui3aOwnerReviewAgent(): DemoAgent {
  return {
    ...DEMO_AGENT,
    id: "user-realtor",
    fullName: "Sarah Jenkins",
    initials: "SJ",
    professionalRole: "realtor_broker",
    primaryMarketCity: "East Texas",
    bio: "Demo Agent World — Living Mark library + presence on the preview track.",
    photoUrl: null,
    livingMarkVideoUrl: null,
  };
}

export function ui3aOwnerReviewUsernameStub(): UsernamePublicStub {
  const stub = demoResolvePublicUsername("sarahpro");
  if (!stub) {
    throw new Error("UI-3A owner-review username fixture missing");
  }
  return {
    ...stub,
    agentWorldHref: UI3A_OWNER_REVIEW_WORLD_PATH,
  };
}
