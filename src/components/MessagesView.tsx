"use client";

import { MessageSquare } from "lucide-react";
import { ShellPausedView } from "@/components/ShellPausedView";

/**
 * Messages — paused. Listing contact already lands in Story Pro leads.
 * No fake inbox or unread theater.
 */
export default function MessagesView() {
  return (
    <ShellPausedView
      eyebrow="Not shipping yet"
      title="Direct messages"
      body="Story Home does not show a live member inbox here yet. When you contact an agent on a listing, that inquiry goes to the agent’s Story Pro leads — not a fake conversation list."
      honesty="Empty boards and unread dots without real threads are shell theater. We hide that until Messages is built for real."
      icon={MessageSquare}
      primaryHref="/marketplace"
      primaryLabel="Browse listings"
      secondaryHref="/portal"
      secondaryLabel="Story Pro leads"
    />
  );
}
