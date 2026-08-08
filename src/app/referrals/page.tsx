import type { Metadata } from "next";
import ProfessionalView from "@/components/ProfessionalView";

export const metadata: Metadata = {
  title: "Referrals",
};

export default function ReferralsPage() {
  return <ProfessionalView />;
}
