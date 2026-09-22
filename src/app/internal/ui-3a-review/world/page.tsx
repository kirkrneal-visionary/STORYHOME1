import { notFound } from "next/navigation";
import { AgentWorldView } from "@/components/agents/AgentWorldView";
import {
  isUi3aOwnerReviewAllowed,
  ui3aOwnerReviewAgent,
} from "@/lib/ui-3a-owner-review";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "UI-3A owner review",
  robots: { index: false, follow: false },
};

export default function Ui3aOwnerReviewWorldPage() {
  if (!isUi3aOwnerReviewAllowed()) notFound();

  return (
    <>
      <p
        data-ui-3a-owner-review="world"
        className="px-4 pt-[calc(var(--story-safe-top)+0.75rem)] font-mono text-[11px] tracking-[0.14em] text-[var(--muted)] uppercase md:px-8"
      >
        Owner review fixture
      </p>
      <AgentWorldView agent={ui3aOwnerReviewAgent()} listings={[]} />
    </>
  );
}
