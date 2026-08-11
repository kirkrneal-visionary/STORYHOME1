import type { Metadata } from "next";
import { Suspense } from "react";
import { BrokerPortal } from "@/components/broker/BrokerPortal";

export const metadata: Metadata = {
  title: "Story Pro",
};

export default function PortalPage() {
  return (
    <Suspense fallback={null}>
      <BrokerPortal />
    </Suspense>
  );
}
