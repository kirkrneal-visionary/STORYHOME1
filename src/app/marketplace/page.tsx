import type { Metadata } from "next";
import { Suspense } from "react";
import MarketplaceView from "@/components/MarketplaceView";

export const metadata: Metadata = {
  title: "Marketplace",
};

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center pt-[72px] text-sm text-[var(--muted)]">
          Loading East Texas listings…
        </div>
      }
    >
      <MarketplaceView />
    </Suspense>
  );
}
