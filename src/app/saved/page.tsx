import type { Metadata } from "next";
import { SuitesLibrary } from "@/components/suites/SuitesLibrary";

export const metadata: Metadata = { title: "Story Home Suites" };

export default function SavedPage() {
  return (
    <div className="min-h-dvh pt-[var(--story-header-h)]">
      <SuitesLibrary />
    </div>
  );
}
