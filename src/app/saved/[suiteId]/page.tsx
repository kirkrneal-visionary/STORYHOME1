"use client";

import { use } from "react";
import { SuitePlayer } from "@/components/suites/SuitePlayer";

type PageProps = {
  params: Promise<{ suiteId: string }>;
};

export default function SuiteDetailPage({ params }: PageProps) {
  const { suiteId } = use(params);

  return (
    <div className="min-h-dvh pt-[var(--story-safe-top)]">
      <SuitePlayer suiteId={suiteId} />
    </div>
  );
}
