/**
 * Seller listing activity — client beacon.
 * Never throws. Never blocks marketplace / save UX.
 */

export type ListingActivityKind = "view" | "save";

export function reportListingActivity(
  listingId: string,
  kind: ListingActivityKind,
): void {
  if (!listingId || typeof fetch === "undefined") return;
  try {
    void fetch("/api/listing-activity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, kind }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {
      /* ignore */
    });
  } catch {
    /* never break product UX */
  }
}
