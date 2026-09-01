"use client";

import { useEffect, useRef } from "react";
import { reportListingActivity } from "@/lib/listing-activity";

/** Count a qualified listing view once per mount. Silent. Non-blocking. */
export function ListingViewBeacon({ listingId }: { listingId: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    reportListingActivity(listingId, "view");
  }, [listingId]);
  return null;
}
