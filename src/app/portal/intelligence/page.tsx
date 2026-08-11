import type { Metadata } from "next";
import { Suspense } from "react";
import { BrokerPortal } from "@/components/broker/BrokerPortal";
import { SHI_PRODUCT } from "@/lib/shi/waves";

export const metadata: Metadata = {
  title: SHI_PRODUCT.fullName,
  description: SHI_PRODUCT.positioning,
};

/**
 * Deep link into Archie's Intelligence inside Story Pro.
 * Listing-form CAD remains MLS-limited; full research lives here.
 */
export default function PortalIntelligencePage() {
  return (
    <Suspense fallback={null}>
      <BrokerPortal initialTab="intelligence" />
    </Suspense>
  );
}
