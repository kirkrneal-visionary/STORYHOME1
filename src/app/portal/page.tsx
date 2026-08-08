import type { Metadata } from "next";
import { BrokerPortal } from "@/components/broker/BrokerPortal";

export const metadata: Metadata = {
  title: "Broker Portal",
};

export default function PortalPage() {
  return <BrokerPortal />;
}
