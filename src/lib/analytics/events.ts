/**
 * Story Home product analytics — event catalog.
 *
 * Props policy: enums, ids, FIPS only.
 * Never: email, name, owner, address, notes, passcodes, CAD free text.
 */

export const ANALYTICS_EVENTS = [
  "marketplace_viewed",
  "listing_opened",
  "listing_inquire_submitted",
  "auth_login_succeeded",
  "portal_tab_opened",
  "archie_opened",
  "archie_module_selected",
  "archie_parcel_opened",
  "archie_study_reopened",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export type AccountKindProp =
  | "consumer"
  | "agent"
  | "broker"
  | "seller"
  | "unknown";

export type ArchieModuleProp =
  | "research"
  | "corridors"
  | "prospects"
  | "farms"
  | "vault";

export type PortalTabProp =
  | "tools"
  | "listings"
  | "buyers"
  | "sellers"
  | "intelligence"
  | "community"
  | "other";

/** Allowed props per event — keep narrow for privacy review. */
export type AnalyticsPropsMap = {
  marketplace_viewed: { network: "marketplace" };
  listing_opened: { listing_id: string };
  listing_inquire_submitted: { listing_id: string };
  auth_login_succeeded: { account_kind: AccountKindProp };
  portal_tab_opened: { tab: PortalTabProp };
  archie_opened: { network: "archie" };
  archie_module_selected: { module: ArchieModuleProp };
  archie_parcel_opened: { county_fips: string };
  archie_study_reopened: { has_folder: boolean };
};

/** Keys that must never appear on any event payload. */
export const ANALYTICS_FORBIDDEN_PROP_KEYS = [
  "email",
  "name",
  "owner",
  "owner_name",
  "address",
  "passcode",
  "password",
  "phone",
  "notes",
  "message",
  "legal_description",
  "cad_owner_id",
  "prop_id",
] as const;
