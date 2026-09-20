"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Building2 } from "lucide-react";
import { UsernameField } from "@/components/settings/UsernameField";
import {
  demoUsernameClient,
  liveUsernameClient,
} from "@/lib/account/username-client";
import { useApp } from "@/components/AppContext";
import { useAuth } from "@/components/AuthContext";
import { PurposeCard } from "@/components/settings/PurposeCard";
import { ProfileControl } from "@/components/settings/ProfileControl";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { SettingsCategoryRow } from "@/components/settings/SettingsCategoryRow";

const settingsFallback = (
  <p className="text-sm text-[var(--muted)]">Loading…</p>
);
const LivingMarkLibraryCard = dynamic(
  () =>
    import("@/components/settings/LivingMarkLibraryCard").then((m) => m.LivingMarkLibraryCard),
  { loading: () => settingsFallback },
);
const OpenOfficeCard = dynamic(
  () =>
    import("@/components/settings/OpenOfficeCard").then((m) => m.OpenOfficeCard),
  { loading: () => settingsFallback },
);
const ProfessionalProfileControl = dynamic(
  () =>
    import("@/components/settings/ProfessionalProfileControl").then(
      (m) => m.ProfessionalProfileControl,
    ),
  { loading: () => settingsFallback },
);
const ServiceCountiesControl = dynamic(
  () =>
    import("@/components/settings/ServiceCountiesControl").then(
      (m) => m.ServiceCountiesControl,
    ),
  { loading: () => settingsFallback },
);
const PrimaryCountyControl = dynamic(
  () =>
    import("@/components/settings/PrimaryCountyControl").then(
      (m) => m.PrimaryCountyControl,
    ),
  { loading: () => settingsFallback },
);
const AvailabilityControl = dynamic(
  () =>
    import("@/components/settings/AvailabilityControl").then(
      (m) => m.AvailabilityControl,
    ),
  { loading: () => settingsFallback },
);
const SecuritySection = dynamic(
  () =>
    import("@/components/settings/SecuritySection").then((m) => m.SecuritySection),
  { loading: () => settingsFallback },
);
import {
  getMyProfile,
  type MyProfile,
} from "@/lib/supabase/profile";
import { getBrokerageById, type Brokerage } from "@/lib/supabase/brokerage";
import {
  acceptInvite,
  myPendingInvite,
  ownBrokerageHistory,
  type BrokerageHistoryItem,
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
  professionalTypeLabel,
} from "@/lib/account/purpose";
import {
  settingsConsumerPreview,
  settingsConsumerPreviewCopy,
} from "@/lib/account/settings-preview";
import { accountLabel } from "@/lib/auth";

export function SettingsView() {
  const searchParams = useSearchParams();
  const parsed = parseSettingsSearch(searchParams);
  const { role } = useApp();
  const { user, isLoggedIn } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [brokerage, setBrokerage] = useState<Brokerage | null>(null);
  const [pending, setPending] = useState<PendingInvite | null>(null);
  const [history, setHistory] = useState<BrokerageHistoryItem[]>([]);
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
  const professionalRole = profile?.professionalRole ?? user?.proRole;
  const typeLabel = professionalTypeLabel({ purpose, kind, professionalRole });
  const caps = settingsCapabilities({ purpose, kind });
  const location = resolveSettingsLocation(parsed, caps);
  const from = origin ?? parsed.from;

  useEffect(() => {
    if (!user || !profile) return;
    if (location.category !== "professional") {
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
      const nextHistory = caps.brokerage ? await ownBrokerageHistory() : [];
      if (cancelled) return;
      setBrokerage(nextBrokerage);
      setPending(nextPending);
      setHistory(nextHistory);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile, location.category, caps.brokerage]);

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
  const professionalHref = buildSettingsHref({
    category: "professional",
    from,
  });
  const identityHref = buildSettingsHref({
    category: "professional",
    control: "identity",
    from,
  });
  const licenseHref = buildSettingsHref({
    category: "professional",
    control: "license",
    from,
  });
  const proProfileHref = buildSettingsHref({
    category: "professional",
    control: "profile",
    from,
  });
  const countiesHref = buildSettingsHref({
    category: "professional",
    control: "counties",
    from,
  });
  const primaryHref = buildSettingsHref({
    category: "professional",
    control: "primary",
    from,
  });
  const availabilityHref = buildSettingsHref({
    category: "professional",
    control: "availability",
    from,
  });
  const livingHref = buildSettingsHref({
    category: "professional",
    control: "living",
    from,
  });
  const brokerageHref = buildSettingsHref({
    category: "professional",
    control: "brokerage",
    from,
  });
  const officeHref = buildSettingsHref({ category: "office", from });
  const openOfficeHref = buildSettingsHref({
    category: "office",
    control: "open",
    from,
  });
  const workspaceHref = buildSettingsHref({
    category: "office",
    control: "workspace",
    from,
  });
  const authenticatorHref = buildSettingsHref({
    setup: "mfa",
    from,
  });
  const showBrokerageRow =
    caps.brokerage &&
    !consumerPreview &&
    Boolean(brokerage?.name || pending);

  function markFocus(id: string) {
    lastFocusRef.current = id;
  }

  const backLink = (href: string, label = "← Back") => (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      {label}
    </Link>
  );
  const doneLink = (
    <Link
      href={closeHref}
      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-hairline px-4 text-sm font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      Done
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
                ? location.category === "professional"
                  ? "Professional Profile"
                  : "Profile"
                : location.control === "email"
                  ? "Email"
                  : location.control === "password"
                    ? "Password"
                    : location.control === "authenticator"
                      ? "Authenticator"
                      : location.control === "device"
                        ? "This Device"
                        : location.control === "delete"
                          ? "Delete Account"
                          : location.control === "identity"
                            ? "Professional Identity"
                            : location.control === "license"
                              ? "License"
                              : location.control === "counties"
                                ? "Service Counties"
                              : location.control === "primary"
                                ? "Primary County"
                              : location.control === "availability"
                                ? "Availability"
                              : location.control === "living"
                                ? "Living Mark"
                                : location.control === "brokerage"
                                  ? "Brokerage"
                                  : location.control === "open"
                                    ? "Open Office"
                                    : location.control === "workspace"
                                      ? "Office Workspace"
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
              subtitle={typeLabel}
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
          <div className="mt-4">{doneLink}</div>
        </div>
      ) : location.control === "username" ? (
        <div className="mt-8 space-y-6">
          {backLink(accountHref)}
          <UsernameField userId={user.id} demo={demoSession} />
          {doneLink}
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
          <SettingsCategoryRow
            id="settings-row-device"
            href={buildSettingsHref({ category: "security", control: "device", from })}
            title="This Device"
            subtitle="This session"
            onClick={() => markFocus("settings-row-device")}
          />
          <div className="pt-4">
            <SettingsCategoryRow
              id="settings-row-delete"
              href={buildSettingsHref({ category: "security", control: "delete", from })}
              title="Delete Account"
              subtitle="Remove this login"
              tone="danger"
              onClick={() => markFocus("settings-row-delete")}
            />
          </div>
        </div>
      ) : location.category === "security" ? (
        <div className="mt-8 space-y-6">
          {backLink(location.setupMfa ? closeHref : securityHref)}
          <SecuritySection
            purpose={purpose}
            kind={kind}
            control={
              location.control === "email" ||
              location.control === "password" ||
              location.control === "authenticator" ||
              location.control === "device" ||
              location.control === "delete"
                ? location.control
                : "authenticator"
            }
          />
          {doneLink}
        </div>
      ) : location.category === "professional" &&
        location.control === "profile" ? (
        <div className="mt-8 space-y-6">
          {backLink(professionalHref)}
          <ProfessionalProfileControl
            specialties={profile?.specialties ?? []}
            serviceAreas={profile?.serviceAreas ?? []}
            languages={profile?.languages ?? []}
            designations={profile?.designations ?? []}
            primaryMarketCity={profile?.primaryMarketCity ?? ""}
            canEdit={securityReady}
            onSaved={load}
          />
          {doneLink}
        </div>
      ) : location.control === "identity" ? (
        <div className="mt-8 space-y-6">
          {backLink(professionalHref)}
          <PurposeCard
            purpose={purpose}
            kind={kind}
            brokerageName={brokerage?.name}
          />
          <IdentityFacts
            typeLabel={typeLabel}
            legalFullName={profile?.legalFullName}
          />
          {doneLink}
        </div>
      ) : location.control === "license" ? (
        <div className="mt-8 space-y-6">
          {backLink(professionalHref)}
          <LicenseSection profile={profile} />
          {doneLink}
        </div>
      ) : location.control === "counties" ? (
        <div className="mt-8 space-y-6">
          {backLink(professionalHref)}
          <ServiceCountiesControl canEdit={securityReady} />
          {doneLink}
        </div>
      ) : location.control === "primary" ? (
        <div className="mt-8 space-y-6">
          {backLink(professionalHref)}
          <PrimaryCountyControl canEdit={securityReady} />
          {doneLink}
        </div>
      ) : location.control === "availability" ? (
        <div className="mt-8 space-y-6">
          {backLink(professionalHref)}
          <AvailabilityControl canEdit={securityReady} />
          {doneLink}
        </div>
      ) : location.control === "living" ? (
        <div className="mt-8 space-y-6">
          {backLink(professionalHref)}
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
          {doneLink}
        </div>
      ) : location.control === "brokerage" ? (
        <div className="mt-8 space-y-6">
          {backLink(professionalHref)}
          <BrokerageRelationship
            brokerageName={brokerage?.name ?? null}
            typeLabel={typeLabel}
            pending={pending}
            history={history}
            onJoined={load}
          />
          {doneLink}
        </div>
      ) : location.category === "professional" ? (
        <div className="mt-8 space-y-6">
          {backLink(rootHref)}
          <div className="space-y-3">
            <SettingsCategoryRow
              id="settings-row-identity"
              href={identityHref}
              title="Professional Identity"
              subtitle={typeLabel}
              onClick={() => markFocus("settings-row-identity")}
            />
            <SettingsCategoryRow
              id="settings-row-pro-profile"
              href={proProfileHref}
              title="Professional Profile"
              subtitle="Public profile"
              onClick={() => markFocus("settings-row-pro-profile")}
            />
            {caps.primaryCounty && !consumerPreview && (
              <SettingsCategoryRow
                id="settings-row-primary"
                href={primaryHref}
                title="Primary County"
                subtitle="Request your primary launch county"
                onClick={() => markFocus("settings-row-primary")}
              />
            )}
            {caps.serviceCounties && !consumerPreview && (
              <SettingsCategoryRow
                id="settings-row-counties"
                href={countiesHref}
                title="Service Counties"
                subtitle="Choose launch counties"
                onClick={() => markFocus("settings-row-counties")}
              />
            )}
            {caps.availability && !consumerPreview && (
              <SettingsCategoryRow
                id="settings-row-availability"
                href={availabilityHref}
                title="Availability"
                subtitle="Manage your work availability"
                onClick={() => markFocus("settings-row-availability")}
              />
            )}
            {caps.trecLicense && (
              <SettingsCategoryRow
                id="settings-row-license"
                href={licenseHref}
                title="License"
                subtitle={profile?.trecLicense ? "On file" : "Not on file"}
                onClick={() => markFocus("settings-row-license")}
              />
            )}
            {caps.livingMark && !consumerPreview && (
              <SettingsCategoryRow
                id="settings-row-living"
                href={livingHref}
                title="Living Mark"
                subtitle={
                  profile?.photoUrl || profile?.livingMarkVideoUrl
                    ? "Set"
                    : "Not set"
                }
                onClick={() => markFocus("settings-row-living")}
              />
            )}
            {showBrokerageRow && (
              <SettingsCategoryRow
                id="settings-row-brokerage"
                href={brokerageHref}
                title="Brokerage"
                subtitle={
                  pending
                    ? brokerage?.name
                      ? `${brokerage.name} · Invitation pending`
                      : "Invitation pending"
                    : brokerage?.name ?? ""
                }
                onClick={() => markFocus("settings-row-brokerage")}
              />
            )}
          </div>
          {(isPro || isOther) && !consumerPreview && !securityReady && (
            <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
              {STORY_PRO_SETTINGS_BLOCKED}
            </p>
          )}
        </div>
      ) : location.control === "open" ? (
        <div className="mt-8 space-y-6">
          {backLink(officeHref)}
          {caps.openOffice && showRealtorCards && (
            <OpenOfficeCard authenticatorHref={authenticatorHref} />
          )}
          {canOpenOfficeAccount(purpose, kind) && !consumerPreview && !securityReady && (
            <div className="space-y-3">
              <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
                Confirm your email and authenticator before opening an office account.
              </p>
              <Link
                href={authenticatorHref}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Set up authenticator
              </Link>
            </div>
          )}
          {doneLink}
        </div>
      ) : location.control === "workspace" ? (
        <div className="mt-8 space-y-6">
          {backLink(officeHref)}
          {isOffice && !consumerPreview && !securityReady && (
            <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
              Confirm your email and authenticator before office tools.
            </p>
          )}
          <OfficeWorkspaceHandoff />
          {doneLink}
        </div>
      ) : location.category === "office" ? (
        <div className="mt-8 space-y-6">
          {backLink(rootHref)}
          <div className="space-y-3">
            {caps.openOffice && (
              <SettingsCategoryRow
                id="settings-row-open-office"
                href={openOfficeHref}
                title="Open Office"
                subtitle="This login becomes the office"
                onClick={() => markFocus("settings-row-open-office")}
              />
            )}
            {caps.officeWorkspace && (
              <SettingsCategoryRow
                id="settings-row-office-workspace"
                href={workspaceHref}
                title="Office Workspace"
                subtitle="Administer this office on /office"
                onClick={() => markFocus("settings-row-office-workspace")}
              />
            )}
          </div>
        </div>
      ) : location.control === "profile" ? (
        <div className="mt-8 space-y-6">
          {backLink(accountHref)}
          <ProfileControl
            userId={user.id}
            fullName={profile?.fullName || user.name}
            phone={profile?.phone ?? ""}
            website={profile?.website ?? ""}
            bio={profile?.bio ?? ""}
            onSaved={load}
          />
          {doneLink}
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

function IdentityFacts({
  typeLabel,
  legalFullName,
}: {
  typeLabel: string;
  legalFullName?: string | null;
}) {
  return (
    <SettingsCard
      icon={BadgeCheck}
      title="On file"
      subtitle="Verified account information. Not editable here."
    >
      <dl className="grid gap-2">
        <Fact label="Professional type" value={typeLabel} />
        {legalFullName ? <Fact label="Legal name" value={legalFullName} /> : null}
      </dl>
    </SettingsCard>
  );
}

function OfficeWorkspaceHandoff() {
  return (
    <SettingsCard
      icon={Building2}
      title="Office workspace"
      subtitle="Roster, branding, and office tools stay on /office."
    >
      <p className="text-sm text-[var(--muted)]">
        Settings does not administer the office here.
      </p>
      <Link
        href="/office"
        className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-gold px-4 text-sm font-bold text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        Open office
      </Link>
    </SettingsCard>
  );
}

function LicenseSection({ profile }: { profile: MyProfile | null }) {
  return (
    <SettingsCard icon={BadgeCheck} title="License (TREC)" subtitle="On file from the Texas Real Estate Commission.">
      {profile?.trecLicense ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          <Fact label="License number" value={profile.trecLicense} />
          <Fact label="Status" value={profile.trecStatus ?? "—"} />
          <Fact label="Sponsoring broker" value={profile.sponsorName ?? "—"} />
          <Fact label="Sponsor license" value={profile.sponsorLicenseNumber ?? "—"} />
        </dl>
      ) : (
        <p className="text-sm text-[var(--muted)]">No TREC license on file for this account.</p>
      )}
    </SettingsCard>
  );
}

function historyWhen(row: BrokerageHistoryItem) {
  const from = new Date(row.effectiveFrom).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  if (row.recorded) return `Recorded since ${from}`;
  if (!row.current && row.effectiveEnd) {
    const to = new Date(row.effectiveEnd).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    return `${from} – ${to}`;
  }
  return null;
}

function BrokerageRelationship({
  brokerageName,
  typeLabel,
  pending,
  history,
  onJoined,
}: {
  brokerageName: string | null;
  typeLabel: string;
  pending: PendingInvite | null;
  history: BrokerageHistoryItem[];
  onJoined: () => void;
}) {
  return (
    <div className="space-y-4">
      {brokerageName ? (
        <SettingsCard
          icon={Building2}
          title="Current brokerage"
          subtitle="Story Home relationship on this professional account."
        >
          <dl className="grid gap-2">
            <Fact label="Brokerage" value={brokerageName} />
            <Fact label="Account" value={typeLabel} />
          </dl>
        </SettingsCard>
      ) : pending ? null : (
        <p className="text-sm text-[var(--muted)]">
          No brokerage relationship on this account.
        </p>
      )}
      {pending ? <AgentJoinBanner pending={pending} onJoined={onJoined} /> : null}
      {history.length ? (
        <SettingsCard icon={Building2} title="Brokerage history">
          <ul className="space-y-2">
            {history.map((row) => (
              <li key={`${row.brokerageName}-${row.effectiveFrom}`} className="story-well px-3 py-2">
                <p className="break-words text-sm text-ink">{row.brokerageName}</p>
                <p className="text-xs text-[var(--muted)]">
                  {row.current ? "Current" : "Previous"}
                  {historyWhen(row) ? ` · ${historyWhen(row)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </SettingsCard>
      ) : null}
    </div>
  );
}

function AgentJoinBanner({ pending, onJoined }: { pending: PendingInvite; onJoined: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="rounded-xl border border-gold/50 bg-gold/10 px-4 py-3">
      <p className="break-words text-sm text-ink">
        <span className="font-semibold">{pending.brokerageName}</span> invited you
        to join their brokerage on Story Home.
      </p>
      <p role="status" aria-live="polite" className="mt-1 min-h-4 text-xs text-red-300">
        {err}
      </p>
      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        aria-label={`Accept invitation from ${pending.brokerageName}`}
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
        className="mt-2 inline-flex min-h-11 max-w-full items-center rounded-lg bg-gold px-5 text-sm font-bold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60"
      >
        <span className="break-words text-left">
          {busy ? "Joining…" : `Join ${pending.brokerageName}`}
        </span>
      </button>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="story-well px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink">{value}</dd>
    </div>
  );
}
