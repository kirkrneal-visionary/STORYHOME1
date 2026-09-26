/**
 * County Stories Wave 5 accessibility readiness (server fact, not a client flag).
 */
import { captionsAreProfessionallyConfirmed } from "@/lib/county-stories/captions";

export function countyStoryMediaIsAccessibilityReady(opts: {
  captionState: string | null | undefined;
  confirmedAt: string | null | undefined;
  revision: number | null | undefined;
  confirmedRevision: number | null | undefined;
  visualInfoBasis: string | null | undefined;
  visualInfoConfirmedAt: string | null | undefined;
  accessibleDescription: string | null | undefined;
  contentDeletedAt: string | null | undefined;
}): boolean {
  if (opts.contentDeletedAt) return false;
  if (
    !captionsAreProfessionallyConfirmed({
      captionState: opts.captionState,
      confirmedAt: opts.confirmedAt,
      revision: opts.revision,
      confirmedRevision: opts.confirmedRevision,
    })
  ) {
    return false;
  }
  if (!opts.visualInfoConfirmedAt) return false;
  if (opts.visualInfoBasis === "spoken_audio") return true;
  if (opts.visualInfoBasis === "supplied_description") {
    return Boolean(opts.accessibleDescription?.trim());
  }
  return false;
}
