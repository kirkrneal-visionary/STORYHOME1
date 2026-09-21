/**
 * Settings category visibility follows the account on file.
 * View as Consumer and browser clothes cannot grant categories.
 * This module has no runtime @/ imports so Node tests can load it.
 */

import {
  canOpenOfficeAccount,
  mayManageBrokerage,
  mayUseStoryPro,
} from "./purpose";

export type SettingsCapabilities = {
  account: true;
  professional: boolean;
  livingMark: boolean;
  trecLicense: boolean;
  brokerage: boolean;
  serviceCounties: boolean;
  primaryCounty: boolean;
  availability: boolean;
  office: boolean;
  officeWorkspace: boolean;
  openOffice: boolean;
};

export function settingsCapabilities(opts: {
  purpose?: string | null;
  kind?: string | null;
}): SettingsCapabilities {
  const professional =
    mayUseStoryPro(opts.purpose, opts.kind) ||
    opts.purpose === "other_professional";
  const livingMark = mayUseStoryPro(opts.purpose, opts.kind);
  const trecLicense = livingMark;
  const brokerage = livingMark;
  const realtorGeography =
    opts.purpose === "individual_pro" || opts.purpose === "managing_broker";
  const serviceCounties = realtorGeography;
  const primaryCounty = realtorGeography;
  const availability = realtorGeography;
  const officeWorkspace = mayManageBrokerage(opts.purpose);
  const openOffice = canOpenOfficeAccount(opts.purpose, opts.kind);
  return {
    account: true,
    professional,
    livingMark,
    trecLicense,
    brokerage,
    serviceCounties,
    primaryCounty,
    availability,
    office: officeWorkspace || openOffice,
    officeWorkspace,
    openOffice,
  };
}

export function maySeeLivingMarkSettings(opts: {
  purpose?: string | null;
  kind?: string | null;
}): boolean {
  return settingsCapabilities(opts).livingMark;
}
