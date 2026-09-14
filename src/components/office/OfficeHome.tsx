"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { OfficeWorkspace } from "@/components/office/OfficeWorkspace";
import { mayManageBrokerage } from "@/lib/account/purpose";
import {
  getBrokerageById,
  type Brokerage,
} from "@/lib/supabase/brokerage";
import { getMyProfile, type MyProfile } from "@/lib/supabase/profile";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function OfficeHome() {
  const { user, isLoggedIn } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [brokerage, setBrokerage] = useState<Brokerage | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const p = await getMyProfile(user.id);
      setProfile(p);
      if (p?.brokerageId) setBrokerage(await getBrokerageById(p.brokerageId));
      else setBrokerage(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    void load();
  }, [load]);

  if (!isLoggedIn || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+2rem)] text-center md:px-6">
        <h1 className="type-page-title text-ink">Office</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Log in with the office account to manage the brokerage.
        </p>
        <Link
          href="/login?next=/office"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-gold px-5 text-sm font-bold text-navy"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (!mayManageBrokerage(profile?.accountPurpose ?? user.purpose)) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+2rem)] text-center md:px-6">
        <h1 className="type-page-title text-ink">Office account</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Office tools live on the managing-broker login. Open an office
          account from settings if this login is a Story Pro broker.
        </p>
        <Link
          href="/settings"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-gold px-5 text-sm font-bold text-navy"
        >
          Open settings
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+1.5rem)] md:px-6">
      <header>
        <p className="font-mono text-[11px] tracking-[0.16em] text-gold uppercase">
          Office
        </p>
        <h1 className="mt-2 type-page-title text-ink md:text-4xl">
          Brokerage office
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Roster and branding for this office. Story Pro, Archie, and buyer
          view stay on this login.
        </p>
      </header>
      {loading ? (
        <p className="mt-8 text-sm text-[var(--muted)]">Loading office…</p>
      ) : (
        <div className="mt-8 space-y-6">
          <OfficeWorkspace
            brokerId={user.id}
            brokerTrecLicense={profile?.trecLicense ?? null}
            brokerage={brokerage}
            onSaved={load}
          />
        </div>
      )}
    </div>
  );
}
