"use client";

import { use } from "react";
import { SuitePlayer } from "@/components/suites/SuitePlayer";
import { RequireAuth } from "@/components/RequireAuth";

type PageProps = {
  params: Promise<{ suiteId: string }>;
};

export default function SuiteDetailPage({ params }: PageProps) {
  const { suiteId } = use(params);

  return (
    <div className="min-h-dvh pt-[72px]">
      <RequireAuth
        title="Suites need an account"
        description="Log in as a buyer to open and share your Story Home Suite albums."
      >
        <SuitePlayer suiteId={suiteId} />
      </RequireAuth>
    </div>
  );
}
