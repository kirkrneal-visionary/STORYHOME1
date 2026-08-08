import type { Metadata } from "next";
import MessagesView from "@/components/MessagesView";
import { RequireAuth } from "@/components/RequireAuth";

export const metadata: Metadata = {
  title: "Messages",
};

export default function MessagesPage() {
  return (
    <RequireAuth
      title="Messages are for members"
      description="Log in as a Pro, Buyer, or Seller to open your inbox."
    >
      <MessagesView />
    </RequireAuth>
  );
}
