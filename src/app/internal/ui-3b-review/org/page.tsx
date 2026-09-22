import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BrokeragePublicView } from "@/components/brokerage/BrokeragePublicView";
import {
  isUi3bOwnerReviewAllowed,
  isUi3bOwnerReviewHost,
  ui3bOwnerReviewFixture,
} from "@/lib/ui-3b-owner-review";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "UI-3B owner review",
  robots: { index: false, follow: false },
};

export default async function Ui3bOwnerReviewOrgPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const host = (await headers()).get("host");
  if (!isUi3bOwnerReviewAllowed() || !isUi3bOwnerReviewHost(host)) notFound();
  const empty = (await searchParams).empty === "1";
  const fixture = ui3bOwnerReviewFixture();

  return (
    <>
      <p
        data-ui-3b-owner-review={empty ? "empty" : "org"}
        className="px-4 pt-[calc(var(--story-safe-top)+0.75rem)] font-mono text-[11px] tracking-[0.14em] text-[var(--muted)] uppercase md:px-8"
      >
        Owner review fixture
      </p>
      <BrokeragePublicView
        fixture={empty ? { ...fixture, agents: [] } : fixture}
      />
    </>
  );
}
