import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <PagePlaceholder
      title="Profile"
      description="Account, credentials, and preference settings will live here."
    />
  );
}
