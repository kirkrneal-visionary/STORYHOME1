import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Network",
};

export default function NetworkPage() {
  return (
    <PagePlaceholder
      title="Network"
      description="Your professional graph — agents, partners, and trusted collaborators. Visible in Pro role."
    />
  );
}
