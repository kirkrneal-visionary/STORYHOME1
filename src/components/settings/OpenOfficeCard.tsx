"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { SettingsCard } from "@/components/settings/SettingsCard";

export function OpenOfficeCard({
  authenticatorHref,
}: {
  authenticatorHref?: string;
}) {
  const router = useRouter();
  const { refreshAssurance } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);

  async function openOffice() {
    setBusy(true);
    setError("");
    setNeedsMfa(false);
    try {
      const res = await fetch("/api/account/open-office", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
      };
      if (data.code === "needs_mfa") {
        setNeedsMfa(true);
        setError(data.error ?? "Confirm your authenticator code first.");
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Unable to open the office account.");
        return;
      }
      await refreshAssurance();
      router.push("/office");
      router.refresh();
    } catch {
      setError("Unable to open the office account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard
      icon={Building2}
      title="Open office account"
      subtitle="This login becomes the office. Story Pro, Archie, and Consumer view stay here."
    >
      <p className="text-sm text-[var(--muted)]">
        Roster and branding are added to this login. You keep Story Pro on the same account.
      </p>
      {!confirm ? (
        <button
          type="button"
          aria-label="Continue opening an office account"
          onClick={() => setConfirm(true)}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-gold px-4 text-sm font-bold text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          I understand — continue
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          aria-busy={busy}
          aria-label="Turn this login into the office account"
          onClick={() => void openOffice()}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gold px-4 text-sm font-bold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60"
        >
          {busy ? "Opening…" : "Turn this login into the office account"}
        </button>
      )}
      <p role="status" aria-live="polite" className="mt-2 min-h-4 text-sm text-red-300">
        {error}
      </p>
      {needsMfa && authenticatorHref ? (
        <Link
          href={authenticatorHref}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-gold"
        >
          Set up authenticator
        </Link>
      ) : null}
    </SettingsCard>
  );
}
