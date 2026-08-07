import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Referrals",
};

export default function ReferralsPage() {
  return (
    <PagePlaceholder
      title="Referrals"
      description="Track referral handoffs and reciprocity across your network. Visible in Pro role."
    />
  );
}
