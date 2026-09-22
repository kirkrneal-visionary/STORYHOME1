import {
  isUi3aOwnerReviewAllowed,
  isUi3aOwnerReviewHost,
} from "@/lib/ui-3a-owner-review";
import {
  settingsCapabilities,
  type SettingsCapabilities,
} from "@/lib/account/settings-capabilities";

export const isUi6OwnerReviewAllowed = isUi3aOwnerReviewAllowed;
export const isUi6OwnerReviewHost = isUi3aOwnerReviewHost;

export const UI6_OWNER_REVIEW_SETTINGS_PATH = "/internal/ui-6-review/settings";

export const UI6_REVIEW_ROLES = [
  "consumer",
  "realtor",
  "managing_broker",
  "other_professional",
] as const;

export type Ui6ReviewRole = (typeof UI6_REVIEW_ROLES)[number];

export const UI6_REVIEW_PANELS = [
  "root",
  "professional",
  "primary",
  "counties",
  "availability",
  "brokerage",
  "office",
] as const;

export type Ui6ReviewPanel = (typeof UI6_REVIEW_PANELS)[number];

export function parseUi6ReviewRole(value: string | undefined | null): Ui6ReviewRole {
  return UI6_REVIEW_ROLES.includes(value as Ui6ReviewRole)
    ? (value as Ui6ReviewRole)
    : "consumer";
}

export function ui6ReviewAccount(role: Ui6ReviewRole): {
  purpose: string;
  kind: string;
  label: string;
} {
  if (role === "realtor") {
    return { purpose: "individual_pro", kind: "agent", label: "Realtor" };
  }
  if (role === "managing_broker") {
    return { purpose: "managing_broker", kind: "broker", label: "Managing Broker" };
  }
  if (role === "other_professional") {
    return {
      purpose: "other_professional",
      kind: "pro",
      label: "Other Professional",
    };
  }
  return { purpose: "consumer", kind: "consumer", label: "Consumer" };
}

export function ui6ReviewCapabilities(role: Ui6ReviewRole): SettingsCapabilities {
  const account = ui6ReviewAccount(role);
  return settingsCapabilities({ purpose: account.purpose, kind: account.kind });
}

export function parseUi6ReviewPanel(
  value: string | undefined | null,
  caps: SettingsCapabilities,
): Ui6ReviewPanel {
  const panel = UI6_REVIEW_PANELS.includes(value as Ui6ReviewPanel)
    ? (value as Ui6ReviewPanel)
    : "root";
  if (panel === "professional" && !caps.professional) return "root";
  if (panel === "primary" && !caps.primaryCounty) return "root";
  if (panel === "counties" && !caps.serviceCounties) return "root";
  if (panel === "availability" && !caps.availability) return "root";
  if (panel === "brokerage" && !caps.brokerage) return "root";
  if (panel === "office" && !caps.office) return "root";
  return panel;
}

export function ui6ReviewHref(role: Ui6ReviewRole, panel: Ui6ReviewPanel = "root"): string {
  const params = new URLSearchParams({ role });
  if (panel !== "root") params.set("panel", panel);
  return `${UI6_OWNER_REVIEW_SETTINGS_PATH}?${params.toString()}`;
}
