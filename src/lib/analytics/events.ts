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
  "living_mark_play_started",
  "living_mark_play_completed",
  "living_mark_play_dropped",
  "agent_world_viewed",
  "agent_world_cta_clicked",
  "agent_world_shared",
  "story_walk_exported",
  "story_walk_shared",
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

export type LivingMarkAudienceProp = "guest" | "account" | "own";

export type AgentWorldCtaProp = "listings" | "inventory" | "find_agents";

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
  living_mark_play_started: {
    agent_id: string;
    audience: LivingMarkAudienceProp;
  };
  living_mark_play_completed: {
    agent_id: string;
    audience: LivingMarkAudienceProp;
  };
  living_mark_play_dropped: {
    agent_id: string;
    audience: LivingMarkAudienceProp;
  };
  agent_world_viewed: {
    agent_id: string;
    audience: LivingMarkAudienceProp;
  };
  agent_world_cta_clicked: {
    agent_id: string;
    cta: AgentWorldCtaProp;
  };
  agent_world_shared: {
    agent_id: string;
    method: "native" | "clipboard";
  };
  story_walk_exported: {
    agent_id: string;
    listing_count: number;
  };
  story_walk_shared: {
    agent_id: string;
    method: "native-file" | "native-link" | "clipboard";
  };
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
