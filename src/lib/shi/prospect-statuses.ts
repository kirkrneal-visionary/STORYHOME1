/** Fixed V1 prospect pipeline statuses — keep short so agents use them. */
export const SHI_PROSPECT_STATUSES = [
  "Saved",
  "Researching",
  "Watching",
  "Contacted",
  "Qualified",
  "Opportunity",
  "Closed",
  "Archived",
] as const;

export type ShiProspectStatus = (typeof SHI_PROSPECT_STATUSES)[number];

export function isShiProspectStatus(v: string): v is ShiProspectStatus {
  return (SHI_PROSPECT_STATUSES as readonly string[]).includes(v);
}
