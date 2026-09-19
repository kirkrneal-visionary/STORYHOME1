"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AtSign, BadgeCheck, Save, UserRound } from "lucide-react";
import { UsernameField } from "@/components/settings/UsernameField";
import {
  demoUsernameClient,
  liveUsernameClient,
} from "@/lib/account/username-client";
import { useApp } from "@/components/AppContext";
import { useAuth } from "@/components/AuthContext";
import { TextField, TextAreaField } from "@/components/broker/ui";
import { LivingMarkLibraryCard } from "@/components/settings/LivingMarkLibraryCard";
import { OpenOfficeCard } from "@/components/settings/OpenOfficeCard";
import { PurposeCard } from "@/components/settings/PurposeCard";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { SettingsCard } from "@/components/settings/SettingsCard";
import {
  getMyProfile,
  updateMyProfile,
  type MyProfile,
} from "@/lib/supabase/profile";
import { getBrokerageById, type Brokerage } from "@/lib/supabase/brokerage";
import {
  acceptInvite,
  myPendingInvite,
  type PendingInvite,
} from "@/lib/supabase/roster";
import {
  STORY_PRO_SETTINGS_BLOCKED,
  canAccessPrivateApp,
} from "@/lib/account/assurance";
import {
  canOpenOfficeAccount,
  mayManageBrokerage,
  mayUseStoryPro,
} from "@/lib/account/purpose";
import {
  settingsConsumerPreview,
  settingsConsumerPreviewCopy,
} from "@/lib/account/settings-preview";
import { accountLabel } from "@/lib/auth";
import { cn } from "@/lib/utils";

const toList = (s: string) =>
  s.split(",").map((x) => x.trim()).filter(Boolean);
const fromList = (a: string[]) => a.join(", ");

type SettingsTab = "you" | "security";

export function SettingsView() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const usernameFocus = searchParams.get("control") === "username";
  const initialTab: SettingsTab =
    requested === "security" || searchParams.get("setup") === "mfa"
      ? "security"
      : "you";
  const { role } = useApp();
  const { user, isLoggedIn } = useAuth();
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [brokerage, setBrokerage] = useState<Brokerage | null>(null);
  const [pending, setPending] = useState<PendingInvite | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const p = await getMyProfile(user.id);
      setProfile(p);
      if (p?.brokerageId) setBrokerage(await getBrokerageById(p.brokerageId));
      else setBrokerage(null);
      if (p?.accountPurpose === "individual_pro" && p.accountKind === "agent") {
        setPending(await myPendingInvite());
      } else setPending(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isLoggedIn || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+2rem)] text-center md:px-6">
        <h1 className="type-page-title text-ink">Settings</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Log in to manage your account.</p>
        <Link href="/login?next=/settings" className="mt-6 inline-flex h-11 items-center rounded-xl bg-gold px-5 text-sm font-bold text-navy">Log in</Link>
      </div>
    );
  }

  const purpose = profile?.accountPurpose ?? user.purpose;
  const kind = profile?.accountKind ?? user.kind;
  const isPro = mayUseStoryPro(purpose, kind);
  const isOther = purpose === "other_professional";
  const isOffice = mayManageBrokerage(purpose);
  const demoSession =
    user.emailConfirmed === undefined && user.aal === undefined;
  const securityReady =
    demoSession ||
    canAccessPrivateApp({
      emailConfirmed: user.emailConfirmed !== false,
      purpose,
      kind,
      enrolled: user.mfaEnrolled === true,
      currentAal: user.aal,
    });
  const consumerPreview = settingsConsumerPreview({
    role,
    mayUseStoryPro: isPro,
  });
  const showRealtorCards = !consumerPreview && securityReady;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+1.5rem)] md:px-6">
      <header>
        <p className="font-mono text-[11px] tracking-[0.16em] text-gold uppercase">Account settings</p>
        <h1 className="mt-2 type-page-title text-ink md:text-4xl">Settings</h1>
        <p className="mt-2 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
          {user.name}
          <span className="rounded-full border border-hairline px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ink">
            {consumerPreview ? "Consumer" : accountLabel(user)}
          </span>
        </p>
        {consumerPreview && (
          <p className="mt-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
            {settingsConsumerPreviewCopy(user.name, isOffice)}
          </p>
        )}
      </header>

      {!usernameFocus && (
      <div className="mt-6 flex gap-2">
        {(["you", "security"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "h-9 rounded-lg px-4 text-sm font-semibold",
              tab === t
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "border border-hairline text-ink",
            )}
          >
            {t === "you" ? "You" : "Security"}
          </button>
        ))}
        {isOffice && !consumerPreview && (
          <Link
            href="/office"
            className="inline-flex h-9 items-center rounded-lg border border-gold px-4 text-sm font-bold text-gold"
          >
            Office
          </Link>
        )}
      </div>
      )}

      {/* story-surface cards live in SettingsCard + office workspace */}
      {loading ? (
        <p className="mt-8 text-sm text-[var(--muted)]">Loading your settings…</p>
      ) : tab === "security" ? (
        <div className="mt-8 space-y-6">
          <Suspense fallback={null}>
            <SecuritySection purpose={purpose} kind={kind} />
          </Suspense>
        </div>
      ) : usernameFocus ? (
        <div className="mt-8 space-y-6">
          <Link
            href="/settings"
            className="inline-flex h-9 items-center text-sm font-semibold text-[var(--muted)] hover:text-ink"
          >
            ← Back
          </Link>
          <UsernameField userId={user.id} demo={demoSession} />
          <Link
            href="/settings"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-hairline px-4 text-sm font-semibold text-ink"
          >
            Done
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {pending && !consumerPreview && (
            <AgentJoinBanner pending={pending} onJoined={load} />
          )}
          <UsernameSummary />
          {!consumerPreview && (
            <PurposeCard
              purpose={purpose}
              kind={kind}
              legalFullName={profile?.legalFullName}
              brokerageName={brokerage?.name}
            />
          )}
          {!consumerPreview && (
            <LivingMarkLibraryCard
              userId={user.id}
              initials={
                profile?.fullName
                  ?.split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() ||
                user.initials ||
                "SH"
              }
              profileStillUrl={profile?.photoUrl}
              profileVideoUrl={profile?.livingMarkVideoUrl}
              onChanged={load}
            />
          )}
          {profile && <AccountSection profile={profile} onSaved={load} />}
          {(isPro || isOther) && showRealtorCards && profile && (
            <ProSection profile={profile} onSaved={load} />
          )}
          {isPro && showRealtorCards && profile && (
            <LicenseSection profile={profile} />
          )}
          {(isPro || isOther) && !consumerPreview && !securityReady && (
            <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
              {STORY_PRO_SETTINGS_BLOCKED}
            </p>
          )}
          {canOpenOfficeAccount(purpose, kind) && showRealtorCards && (
            <OpenOfficeCard />
          )}
          {canOpenOfficeAccount(purpose, kind) && !consumerPreview && !securityReady && (
            <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
              Confirm your email and authenticator before opening an office account.
            </p>
          )}
          {isOffice && !consumerPreview && !securityReady && (
            <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
              Confirm your email and authenticator before office tools.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function UsernameSummary() {
  const { user } = useAuth();
  const demoSession =
    user?.emailConfirmed === undefined && user?.aal === undefined;
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    const client = demoSession
      ? demoUsernameClient(user.id)
      : liveUsernameClient();
    void client.loadCurrent().then(setName);
  }, [user, demoSession]);
  return (
    <SettingsCard icon={AtSign} title="Username" subtitle="Public @username for this login.">
      <div className="flex items-center justify-between gap-3">
        <p className={name ? "text-sm font-semibold text-ink" : "text-sm text-[var(--muted)]"}>
          {name ? `@${name}` : "Not set"}
        </p>
        <Link
          href="/settings?control=username"
          className="inline-flex h-9 items-center rounded-lg border border-hairline px-3 text-sm font-semibold text-ink"
        >
          {name ? "Change" : "Set username"}
        </Link>
      </div>
    </SettingsCard>
  );
}

function SaveButton({ busy, note }: { busy: boolean; note: string }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <button type="submit" disabled={busy} className="story-press inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60">
        <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save"}
      </button>
      {note && <span className="text-sm text-teal-soft">{note}</span>}
    </div>
  );
}

function AccountSection({ profile, onSaved }: { profile: MyProfile; onSaved: () => void }) {
  const [f, setF] = useState({
    fullName: profile.fullName,
    phone: profile.phone ?? "",
    website: profile.website ?? "",
    bio: profile.bio ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  return (
    <SettingsCard icon={UserRound} title="Account" subtitle="Your name, contact, and public bio.">
      <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await updateMyProfile(profile.id, { ...f }); setNote("Saved."); setTimeout(() => setNote(""), 2000); onSaved(); } finally { setBusy(false); } }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField id="s-name" label="Display name" value={f.fullName} onChange={(v) => setF((p) => ({ ...p, fullName: v }))} />
          <TextField id="s-phone" label="Phone" value={f.phone} onChange={(v) => setF((p) => ({ ...p, phone: v }))} />
          <TextField id="s-web" label="Website" value={f.website} onChange={(v) => setF((p) => ({ ...p, website: v }))} />
        </div>
        {profile.legalFullName && (
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            Legal name on file (not editable here): {profile.legalFullName}
          </p>
        )}
        <p className="mt-2 text-[11px] text-[var(--muted)]">
          Display name is public. It does not change a verified license. Living Mark uploads live in the library above.
        </p>
        <div className="mt-3">
          <TextAreaField id="s-bio" label="About / bio" rows={4} value={f.bio} onChange={(v) => setF((p) => ({ ...p, bio: v }))} />
        </div>
        <SaveButton busy={busy} note={note} />
      </form>
    </SettingsCard>
  );
}

function ProSection({ profile, onSaved }: { profile: MyProfile; onSaved: () => void }) {
  const [f, setF] = useState({
    specialties: fromList(profile.specialties),
    serviceAreas: fromList(profile.serviceAreas),
    languages: fromList(profile.languages),
    designations: fromList(profile.designations),
    primaryMarketCity: profile.primaryMarketCity ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  return (
    <SettingsCard icon={BadgeCheck} title="Professional profile" subtitle="Shown on your public profile. Separate items with commas.">
      <form onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setNote("");
        try {
          const res = await fetch("/api/account/story-pro-profile", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              specialties: toList(f.specialties),
              serviceAreas: toList(f.serviceAreas),
              languages: toList(f.languages),
              designations: toList(f.designations),
              primaryMarketCity: f.primaryMarketCity,
            }),
          });
          const data = (await res.json()) as { ok?: boolean; error?: string };
          if (!res.ok || !data.ok) {
            setNote(data.error ?? STORY_PRO_SETTINGS_BLOCKED);
            return;
          }
          setNote("Saved.");
          setTimeout(() => setNote(""), 2000);
          onSaved();
        } finally {
          setBusy(false);
        }
      }}>
        <div className="grid gap-3">
          <TextField id="s-market" label="Primary market (city)" value={f.primaryMarketCity} onChange={(v) => setF((p) => ({ ...p, primaryMarketCity: v }))} />
          <TextField id="s-spec" label="Specialties" value={f.specialties} onChange={(v) => setF((p) => ({ ...p, specialties: v }))} />
          <TextField id="s-areas" label="Service areas" value={f.serviceAreas} onChange={(v) => setF((p) => ({ ...p, serviceAreas: v }))} />
          <TextField id="s-lang" label="Languages" value={f.languages} onChange={(v) => setF((p) => ({ ...p, languages: v }))} />
          <TextField id="s-desig" label="Designations / credentials" value={f.designations} onChange={(v) => setF((p) => ({ ...p, designations: v }))} />
        </div>
        <SaveButton busy={busy} note={note} />
      </form>
    </SettingsCard>
  );
}

function LicenseSection({ profile }: { profile: MyProfile }) {
  return (
    <SettingsCard icon={BadgeCheck} title="License (TREC)" subtitle="Verified from the Texas Real Estate Commission — read only.">
      {profile.trecLicense ? (
        <div className="grid gap-2 font-mono text-xs sm:grid-cols-2">
          <Fact label="License #" value={profile.trecLicense} />
          <Fact label="Status" value={profile.trecStatus ?? "—"} />
          <Fact label="Sponsoring broker" value={profile.sponsorName ?? "—"} />
          <Fact label="Sponsor license" value={profile.sponsorLicenseNumber ?? "—"} />
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">No TREC license on file for this account.</p>
      )}
    </SettingsCard>
  );
}

function AgentJoinBanner({ pending, onJoined }: { pending: PendingInvite; onJoined: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="rounded-2xl border border-gold/50 bg-gold/10 p-4">
      <p className="text-sm text-ink">
        <span className="font-semibold">{pending.brokerageName}</span> invited you to join their brokerage on Story Home.
      </p>
      {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr("");
          try {
            const ok = await acceptInvite(pending.brokerageId);
            if (ok) onJoined();
            else setErr("Could not join — the invite may have been removed.");
          } catch {
            setErr("Something went wrong joining the brokerage.");
          } finally {
            setBusy(false);
          }
        }}
        className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60"
      >
        {busy ? "Joining…" : `Join ${pending.brokerageName}`}
      </button>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="story-well px-3 py-2">
      <p className="text-[10px] uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value}</p>
    </div>
  );
}
