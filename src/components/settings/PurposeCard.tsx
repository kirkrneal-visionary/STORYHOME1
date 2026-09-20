"use client";

import Link from "next/link";
import { BadgeInfo } from "lucide-react";
import { SettingsCard } from "@/components/settings/SettingsCard";
import {
  canOpenOfficeAccount,
  mayManageBrokerage,
  mayUseStoryPro,
  purposeLabel,
} from "@/lib/account/purpose";

export function PurposeCard({
  purpose,
  kind,
  brokerageName,
}: {
  purpose?: string | null;
  kind?: string | null;
  brokerageName?: string | null;
}) {
  const office = mayManageBrokerage(purpose);
  const pro = mayUseStoryPro(purpose, kind);
  const canOpen = canOpenOfficeAccount(purpose, kind);

  return (
    <SettingsCard
      icon={BadgeInfo}
      title="What this login is for"
      subtitle={purposeLabel(purpose)}
    >
      <p className="text-sm text-ink">
        {office
          ? "This login runs the office — roster and branding. Story Pro, Archie, and Consumer view stay here too."
          : pro
            ? "This login is your own Story Pro. Office tools stay on a separate office login."
            : purpose === "other_professional"
              ? "This login is for your professional profile. Story Pro and office tools are not on this account."
              : "This login is your consumer account."}
      </p>
      {pro && !office && brokerageName && (
        <p className="mt-2 text-sm text-[var(--muted)]">
          You belong to {brokerageName}. That does not turn this login into the
          office account.
        </p>
      )}
      {office && (
        <Link
          href="/office"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gold px-4 text-sm font-bold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Open office
        </Link>
      )}
      {canOpen && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Need office tools? Open them from Brokerage / Office. Story Pro stays
          on this login.
        </p>
      )}
    </SettingsCard>
  );
}
