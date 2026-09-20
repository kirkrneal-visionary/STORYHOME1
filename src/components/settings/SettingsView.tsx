"use client";

import { Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Save } from "lucide-react";
import { UsernameField } from "@/components/settings/UsernameField";
import {
  demoUsernameClient,
  liveUsernameClient,
} from "@/lib/account/username-client";
import { useApp } from "@/components/AppContext";
import { useAuth } from "@/components/AuthContext";
import { TextField } from "@/components/broker/ui";
import { LivingMarkLibraryCard } from "@/components/settings/LivingMarkLibraryCard";
import { OpenOfficeCard } from "@/components/settings/OpenOfficeCard";
import { PurposeCard } from "@/components/settings/PurposeCard";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { ProfileControl } from "@/components/settings/ProfileControl";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { SettingsCategoryRow } from "@/components/settings/SettingsCategoryRow";
import {
  getMyProfile,
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
  mfaRequired,
} from "@/lib/account/assurance";
import { settingsCapabilities } from "@/lib/account/settings-capabilities";
import {
  buildSettingsHref,
  fallbackSettingsOrigin,
  parseSettingsSearch,
  readRememberedSettingsOrigin,
  rememberSettingsOrigin,
  resolveSettingsLocation,
  sameOriginReferrerPath,
  sanitizeSettingsOrigin,
} from "@/lib/account/settings-nav";
import {
  canOpenOfficeAccount,
  mayManageBrokerage,
  mayUseStoryPro,
  purposeLabel,
} from "@/lib/account/purpose";
import {
  settingsConsumerPreview,
  settingsConsumerPreviewCopy,
} from "@/lib/account/settings-preview";
import { accountLabel } from "@/lib/auth";

const toList = (s: string) =>
  s.split(",").map((x) => x.trim()).filter(Boolean);
const fromList = (a: string[]) => a.join(", ");

export function SettingsView() {
  const searchParams = useSearchParams();
  const parsed = parseSettingsSearch(searchParams);
  const { role } = useApp();
  const { user, isLoggedIn } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [brokerage, setBrokerage] = useState<Brokerage | null>(null);
  const [pending, setPending] = useState<PendingInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState<string | null>(null);
  const panelTitleId = useId();
  const lastFocusRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const p = await getMyProfile(user.id);
      setProfile(p);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const next =
      rememberSettingsOrigin(parsed.from) ??
      readRememberedSettingsOrigin() ??
      sameOriginReferrerPath();
    setOrigin(next);
  }, [parsed.from]);

  const purpose = profile?.accountPurpose ?? user?.purpose;
  const kind = profile?.accountKind ?? user?.kind;
  const caps = settingsCapabilities({ purpose, kind });
  const location = resolveSettingsLocation(parsed, caps);
  const from = origin ?? parsed.from;

  useEffect(() => {
    if (!user || !profile) return;
    if (location.category !== "professional" && location.category !== "office") {
      return;
    }
    let cancelled = false;
    void (async () => {
      const nextBrokerage = profile.brokerageId
        ? await getBrokerageById(profile.brokerageId)
        : null;
      const nextPending =
        profile.accountPurpose === "individual_pro" &&
        profile.accountKind === "agent"
          ? await myPendingInvite()
          : null;
      if (cancelled) return;
      setBrokerage(nextBrokerage);
      setPending(nextPending);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile, location.category]);

  useEffect(() => {
    if (location.screen === "root") {
      const id = lastFocusRef.current;
      if (id) {
        document.getElementById(id)?.focus();
      }
      return;
    }
    document.getElementById(panelTitleId)?.focus();
  }, [location.screen, location.category, location.control, panelTitleId]);

  if (!isLoggedIn || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+2rem)] text-center md:px-6">
        <h1 className="type-page-title text-ink">Settings</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Log in to manage your account.</p>
        <Link href="/login?next=/settings" className="mt-6 inline-flex h-11 items-center rounded-xl bg-gold px-5 text-sm font-bold text-navy">Log in</Link>
      </div>
    );
  }

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
  const closeHref =
    sanitizeSettingsOrigin(from) ??
    fallbackSettingsOrigin({ kind: user.kind, purpose });
  const rootHref = buildSettingsHref({ from });
  const accountHref = buildSettingsHref({ category: "account", from });
  const securityHref = buildSettingsHref({ category: "security", from });
  const usernameHref = buildSettingsHref({
    category: "account",
    control: "username",
    from,
  });
  const profileHref = buildSettingsHref({
    category: "account",
    control: "profile",
    from,
  });

  function markFocus(id: string) {
    lastFocusRef.current = id;
  }

  const backLink = (href: string, label = "← Back") => (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)] hover:text-ink"
    >
      {label}
    </Link>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+1.5rem)] md:px-6">
      <header>
        <p className="font-mono text-[11px] tracking-[0.16em] text-gold uppercase">Account settings</p>
        <h1
          id={panelTitleId}
          tabIndex={-1}
          className="mt-2 type-page-title text-ink outline-none md:text-4xl"
        >
          {location.screen === "root"
            ? "Settings"
            : location.control === "username"
              ? "Username"
              : location.control === "profile"
                ? "Profile"
                : location.control === "email"
                  ? "Email"
                  : location.control === "password"
                    ? "Password"
                    : location.control === "authenticator"
                      ? "Authenticator"
                      : location.category === "security"
                        ? "Security"
                  : location.category === "professional"
                    ? "Professional"
                    : location.category === "office"
                      ? "Brokerage / Office"
                      : "Account"}
        </h1>
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

      {loading ? (
        <p className="mt-8 text-sm text-[var(--muted)]">Loading your settings…</p>
      ) : location.screen === "root" ? (
        <div className="mt-8 space-y-3">
          <SettingsCategoryRow
            id="settings-row-account"
            href={accountHref}
            title="Account"
            subtitle="Username, profile, and sign-in"
            onClick={() => markFocus("settings-row-account")}
          />
          {caps.professional && (
            <SettingsCategoryRow
              id="settings-row-professional"
              href={buildSettingsHref({ category: "professional", from })}
              title="Professional"
              subtitle={purposeLabel(purpose)}
              onClick={() => markFocus("settings-row-professional")}
            />
          )}
          {caps.office && (
            <SettingsCategoryRow
              id="settings-row-office"
              href={buildSettingsHref({ category: "office", from })}
              title="Brokerage / Office"
              subtitle={
                caps.officeWorkspace
                  ? "Office workspace"
                  : "Open an office account"
              }
              onClick={() => markFocus("settings-row-office")}
            />
          )}
          <Link
            href={closeHref}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-hairline px-4 text-sm font-semibold text-ink"
          >
            Done
          </Link>
        </div>
      ) : location.control === "username" ? (
        <div className="mt-8 space-y-6">
          {backLink(accountHref)}
          <UsernameField userId={user.id} demo={demoSession} />
          <Link
            href={closeHref}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-hairline px-4 text-sm font-semibold text-ink"
          >
            Done
          </Link>
        </div>
      ) : location.category === "security" && !location.control ? (
        <div className="mt-8 space-y-3">
          {backLink(accountHref)}
          {mfaRequired(purpose, kind) && user.mfaEnrolled !== true && (
            <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
              Realtor and office accounts need an authenticator app.
            </p>
          )}
          <SettingsCategoryRow
            id="settings-row-email"
            href={buildSettingsHref({ category: "security", control: "email", from })}
            title="Email"
            subtitle={user.email || "Not set"}
            onClick={() => markFocus("settings-row-email")}
          />
          <SettingsCategoryRow
            id="settings-row-password"
            href={buildSettingsHref({ category: "security", control: "password", from })}
            title="Password"
            subtitle="Current password required"
            onClick={() => markFocus("settings-row-password")}
          />
          <SettingsCategoryRow
            id="settings-row-authenticator"
            href={buildSettingsHref({
              category: "security",
              control: "authenticator",
              from,
            })}
            title="Authenticator"
            subtitle={user.mfaEnrolled === true ? "On" : "Not set up"}
            onClick={() => markFocus("settings-row-authenticator")}
          />
        </div>
      ) : location.category === "security" ? (
        <div className="mt-8 space-y-6">
          {backLink(location.setupMfa ? closeHref : securityHref)}
          <Suspense fallback={null}>
            <SecuritySection
              purpose={purpose}
              kind={kind}
              control={
                location.control === "email" ||
                location.control === "password" ||
                location.control === "authenticator"
                  ? location.control
                  : "authenticator"
              }
            />
          </Suspense>
          <Link
            href={closeHref}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-hairline px-4 text-sm font-semibold text-ink"
          >
            Done
          </Link>
        </div>
      ) : location.category === "professional" ? (
        <div className="mt-8 space-y-6">
          {backLink(rootHref)}
          {pending && !consumerPreview && (
            <AgentJoinBanner pending={pending} onJoined={load} />
          )}
          {!consumerPreview && (
            <PurposeCard
              purpose={purpose}
              kind={kind}
              legalFullName={profile?.legalFullName}
              brokerageName={brokerage?.name}
            />
          )}
          {caps.livingMark && !consumerPreview && (
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
        </div>
      ) : location.category === "office" ? (
        <div className="mt-8 space-y-6">
          {backLink(rootHref)}
          {caps.officeWorkspace && !consumerPreview && (
            <Link
              href="/office"
              className="inline-flex min-h-11 items-center rounded-lg border border-gold px-4 text-sm font-bold text-gold"
            >
              Open office
            </Link>
          )}
          {caps.openOffice && showRealtorCards && <OpenOfficeCard />}
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
      ) : location.control === "profile" ? (
        <div className="mt-8 space-y-6">
          {backLink(accountHref)}
          <AccountSection
            userId={user.id}
            fullName={profile?.fullName || user.name}
            phone={profile?.phone ?? ""}
            website={profile?.website ?? ""}
            bio={profile?.bio ?? ""}
            legalFullName={profile?.legalFullName}
            onSaved={load}
          />
          <Link
            href={closeHref}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-hairline px-4 text-sm font-semibold text-ink"
          >
            Done
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {backLink(rootHref)}
          <UsernameSummary
            href={usernameHref}
            onOpen={() => markFocus("settings-row-username")}
          />
          <SettingsCategoryRow
            id="settings-row-profile"
            href={profileHref}
            title="Profile"
            subtitle={profile?.fullName || user.name || "Display name, phone, and bio"}
            onClick={() => markFocus("settings-row-profile")}
          />
          <SettingsCategoryRow
            id="settings-row-security"
            href={securityHref}
            title="Security"
            subtitle="Sign-in and account protection"
            onClick={() => markFocus("settings-row-security")}
          />
        </div>
      )}
    </div>
  );
}

function UsernameSummary({
  href,
  onOpen,
}: {
  href?: string;
  onOpen?: () => void;
}) {
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
    <SettingsCategoryRow
      id="settings-row-username"
      href={href ?? "/settings?control=username"}
      title="Username"
      subtitle={name ? `@${name}` : "Not set"}
      onClick={onOpen}
    />
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

function AccountSection({
  userId,
  fullName,
  phone,
  website,
  bio,
  legalFullName,
  onSaved,
}: {
  userId: string;
  fullName: string;
  phone: string;
  website: string;
  bio: string;
  legalFullName?: string | null;
  onSaved?: () => void;
}) {
  return (
    <ProfileControl
      userId={userId}
      fullName={fullName}
      phone={phone}
      website={website}
      bio={bio}
      legalFullName={legalFullName}
      onSaved={onSaved}
    />
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
