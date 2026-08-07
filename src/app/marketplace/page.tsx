import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Marketplace",
};

export default function MarketplacePage() {
  return (
    <PagePlaceholder
      title="Marketplace"
      description="Browse curated homes and off-market opportunities. Listings and filters will land here next."
    />
  );
}
