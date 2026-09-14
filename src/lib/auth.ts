import type { AccountPurpose } from "@/lib/account/purpose";

export type AccountKind = "consumer" | "pro" | "seller" | "broker";

export type ProRole =
  | "realtor_broker"
  | "inspector"
  | "appraiser"
  | "lender";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  kind: AccountKind;
  purpose?: AccountPurpose;
  proRole?: ProRole;
  sellerListingCode?: string;
  emailConfirmed?: boolean;
  aal?: "aal1" | "aal2";
  mfaEnrolled?: boolean;
};

export const AUTH_STORAGE_KEY = "story-home-auth-user";

export const PRO_ROLE_LABELS: Record<ProRole, string> = {
  realtor_broker: "Realtor / Broker",
  inspector: "Inspector",
  appraiser: "Appraiser",
  lender: "Lender",
};

export const DEMO_ACCOUNTS: AuthUser[] = [
  {
    id: "user-buyer",
    name: "Jordan Hale",
    email: "jordan@storyhome.demo",
    initials: "JH",
    kind: "consumer",
    purpose: "consumer",
  },
  {
    id: "user-realtor",
    name: "Sarah Jenkins",
    email: "sarah@storyhome.demo",
    initials: "SJ",
    kind: "pro",
    purpose: "individual_pro",
    proRole: "realtor_broker",
  },
  {
    id: "user-inspector",
    name: "Chris Nguyen",
    email: "chris@storyhome.demo",
    initials: "CN",
    kind: "pro",
    purpose: "other_professional",
    proRole: "inspector",
  },
  {
    id: "user-appraiser",
    name: "Ava Brooks",
    email: "ava@storyhome.demo",
    initials: "AB",
    kind: "pro",
    purpose: "other_professional",
    proRole: "appraiser",
  },
  {
    id: "user-lender",
    name: "Marcus Lee",
    email: "marcus@storyhome.demo",
    initials: "ML",
    kind: "pro",
    purpose: "other_professional",
    proRole: "lender",
  },
];

export function accountLabel(user: AuthUser) {
  if (user.purpose === "managing_broker") return "Managing broker";
  if (user.purpose === "other_professional") {
    return PRO_ROLE_LABELS[user.proRole ?? "inspector"];
  }
  if (user.kind === "consumer") return "Buyer / Consumer";
  if (user.kind === "seller") return "Seller (listing access)";
  if (user.kind === "broker") return "Individual broker";
  return PRO_ROLE_LABELS[user.proRole ?? "realtor_broker"];
}

/** Demo Broker-of-Record account for "The Brokerage" org admin experience. */
export const DEMO_BROKER: AuthUser = {
  id: "user-broker",
  name: "Dana Brooks",
  email: "dana@storyhome.demo",
  initials: "DB",
  kind: "broker",
  purpose: "managing_broker",
};

export function parseStoredUser(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as AuthUser;
    if (!data?.id || !data?.kind) return null;
    return data;
  } catch {
    return null;
  }
}
