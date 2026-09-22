import { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsLoadingHint } from "@/components/settings/SettingsLoadingHint";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = {
  title: "Settings · Story Home",
};

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 pt-[calc(var(--story-safe-top)+1.5rem)]">
          <SettingsLoadingHint />
        </div>
      }
    >
      <SettingsView />
    </Suspense>
  );
}
