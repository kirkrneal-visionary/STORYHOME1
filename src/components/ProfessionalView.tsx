"use client";

import { GitBranch } from "lucide-react";
import { ShellPausedView } from "@/components/ShellPausedView";

/**
 * Referrals — paused. No fake kanban, metrics, or post button.
 */
export default function ProfessionalView() {
  return (
    <ShellPausedView
      eyebrow="Not shipping yet"
      title="Referral board"
      body="The B2B referral board is not live yet. Posting, claiming, and open-lead counts would be theater until agents can move real referrals end to end."
      honesty="Tables may exist in the database, but this surface stays honest: no fake reputation score, no unread badge, no empty columns pretending to be a market."
      icon={GitBranch}
      primaryHref="/portal"
      primaryLabel="Open Story Pro"
      secondaryHref="/network"
      secondaryLabel="Find agents"
    />
  );
}
