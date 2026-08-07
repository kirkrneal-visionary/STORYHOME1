import type { Metadata } from "next";
import MarketplaceView from "@/components/MarketplaceView";

export const metadata: Metadata = {
  title: "Marketplace",
};

export default function MarketplacePage() {
  return <MarketplaceView />;
}
