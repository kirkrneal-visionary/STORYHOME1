import type { Metadata } from "next";
import MessagesView from "@/components/MessagesView";

export const metadata: Metadata = {
  title: "Messages",
};

/** Honest pause landing — no login wall for a non-shipping inbox. */
export default function MessagesPage() {
  return <MessagesView />;
}
