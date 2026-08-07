import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/layout/PagePlaceholder";

export const metadata: Metadata = {
  title: "Messages",
};

export default function MessagesPage() {
  return (
    <PagePlaceholder
      title="Messages"
      description="Conversations between buyers, sellers, and professionals. Unread state shows as a gold dot in nav."
    />
  );
}
