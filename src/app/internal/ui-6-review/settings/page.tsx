import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, MapPin } from "lucide-react";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { SettingsCategoryRow } from "@/components/settings/SettingsCategoryRow";
import { SettingsLoadingHint } from "@/components/settings/SettingsLoadingHint";
import { SERVICE_COUNTIES } from "@/lib/markets";
import {
  UI6_REVIEW_ROLES,
  isUi6OwnerReviewAllowed,
  isUi6OwnerReviewHost,
  parseUi6ReviewPanel,
  parseUi6ReviewRole,
  ui6ReviewAccount,
  ui6ReviewCapabilities,
  ui6ReviewHref,
  type Ui6ReviewPanel,
  type Ui6ReviewRole,
} from "@/lib/ui-6-owner-review";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "UI-6 owner review",
  robots: { index: false, follow: false },
};

function chipLabel(name: string) {
  return name.replace(/ County$/i, "");
}

export default async function Ui6OwnerReviewSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; panel?: string }>;
}) {
  const host = (await headers()).get("host");
  if (!isUi6OwnerReviewAllowed() || !isUi6OwnerReviewHost(host)) notFound();

  const query = await searchParams;
  const role = parseUi6ReviewRole(query.role);
  const account = ui6ReviewAccount(role);
  const caps = ui6ReviewCapabilities(role);
  const panel = parseUi6ReviewPanel(query.panel, caps);

  return (
    <div
      data-ui-6-owner-review="settings"
      data-ui-6-role={role}
      data-ui-6-panel={panel}
      className="mx-auto max-w-3xl px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+1.5rem)] md:px-6"
    >
      <p className="font-mono text-[11px] tracking-[0.14em] text-[var(--muted)] uppercase">
        Owner review fixture
      </p>
      <nav aria-label="Review roles" className="mt-3 flex flex-wrap gap-2">
        {UI6_REVIEW_ROLES.map((next) => (
          <Link
            key={next}
            href={ui6ReviewHref(next)}
            className={
              next === role
                ? "inline-flex min-h-11 items-center rounded-lg border border-gold bg-gold/15 px-3 text-sm font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                : "inline-flex min-h-11 items-center rounded-lg border border-hairline px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            }
          >
            {ui6ReviewAccount(next).label}
          </Link>
        ))}
      </nav>
      <header className="mt-6">
        <p className="font-mono text-[11px] tracking-[0.16em] text-gold uppercase">
          Account settings
        </p>
        <h1 className="mt-2 type-page-title text-ink">{panelTitle(panel)}</h1>
        <p className="mt-2 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
          Review fixture
          <span className="rounded-full border border-hairline px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ink">
            {account.label}
          </span>
        </p>
      </header>
      <SettingsLoadingHint className="mt-4" />
      <div className="mt-6">{renderPanel(role, panel, caps)}</div>
    </div>
  );
}

function panelTitle(panel: Ui6ReviewPanel) {
  if (panel === "professional") return "Professional";
  if (panel === "primary") return "Primary County";
  if (panel === "counties") return "Service Counties";
  if (panel === "availability") return "Availability";
  if (panel === "brokerage") return "Brokerage";
  if (panel === "office") return "Brokerage / Office";
  return "Settings";
}

function renderPanel(
  role: Ui6ReviewRole,
  panel: Ui6ReviewPanel,
  caps: ReturnType<typeof ui6ReviewCapabilities>,
) {
  if (panel === "professional") {
    return (
      <div className="space-y-3">
        <SettingsCategoryRow
          href={ui6ReviewHref(role)}
          title="← Back"
          subtitle="Settings root"
        />
        <SettingsCategoryRow
          href={ui6ReviewHref(role, "professional")}
          title="Professional Identity"
          subtitle={ui6ReviewAccount(role).label}
        />
        <SettingsCategoryRow
          href={ui6ReviewHref(role, "professional")}
          title="Professional Profile"
          subtitle="Public profile"
        />
        {caps.primaryCounty ? (
          <SettingsCategoryRow
            href={ui6ReviewHref(role, "primary")}
            title="Primary County"
            subtitle="Request your primary launch county"
          />
        ) : null}
        {caps.serviceCounties ? (
          <SettingsCategoryRow
            href={ui6ReviewHref(role, "counties")}
            title="Service Counties"
            subtitle="Choose launch counties"
          />
        ) : null}
        {caps.availability ? (
          <SettingsCategoryRow
            href={ui6ReviewHref(role, "availability")}
            title="Availability"
            subtitle="Manage your work availability"
          />
        ) : null}
        {caps.livingMark ? (
          <SettingsCategoryRow
            href={ui6ReviewHref(role, "professional")}
            title="Living Mark"
            subtitle="Not set"
          />
        ) : null}
        {caps.brokerage ? (
          <SettingsCategoryRow
            href={ui6ReviewHref(role, "brokerage")}
            title="Brokerage"
            subtitle="Owner-review fixture"
          />
        ) : null}
      </div>
    );
  }

  if (panel === "primary") {
    return (
      <div className="space-y-4">
        <SettingsCategoryRow
          href={ui6ReviewHref(role, "professional")}
          title="← Back"
          subtitle="Professional"
        />
        <p className="text-sm text-[var(--muted)]">
          Request the launch county where you are primarily based. Story Home
          reviews the request. This does not change Service Counties.
        </p>
        <section className="rounded-xl border border-hairline px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Current Primary County
          </h2>
          <p className="mt-1 text-sm font-semibold text-ink">Primary County not set</p>
        </section>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Request Primary County">
          {SERVICE_COUNTIES.map((county, index) => {
            const on = index === 0;
            return (
              <span
                key={county.fips}
                className={
                  on
                    ? "inline-flex min-h-11 items-center rounded-lg border border-gold bg-gold/15 px-3 text-sm font-semibold text-ink"
                    : "inline-flex min-h-11 items-center rounded-lg border border-hairline px-3 text-sm text-ink"
                }
              >
                {chipLabel(county.name)}
              </span>
            );
          })}
        </div>
        <button
          type="button"
          disabled
          className="story-press inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy opacity-60"
        >
          Request Primary County
        </button>
      </div>
    );
  }

  if (panel === "counties") {
    return (
      <div className="space-y-4">
        <SettingsCategoryRow
          href={ui6ReviewHref(role, "professional")}
          title="← Back"
          subtitle="Professional"
        />
        <p className="text-sm text-[var(--muted)]">
          Choose the counties where you currently provide professional service.
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Service counties">
          {SERVICE_COUNTIES.map((county, index) => {
            const on = index < 2;
            return (
              <span
                key={county.fips}
                className={
                  on
                    ? "inline-flex min-h-11 items-center rounded-lg border border-gold bg-gold/15 px-3 text-sm font-semibold text-ink"
                    : "inline-flex min-h-11 items-center rounded-lg border border-hairline px-3 text-sm text-ink"
                }
              >
                {chipLabel(county.name)}
              </span>
            );
          })}
        </div>
        <button
          type="button"
          disabled
          className="story-press inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy opacity-60"
        >
          Save
        </button>
      </div>
    );
  }

  if (panel === "availability") {
    return (
      <div className="space-y-4">
        <SettingsCategoryRow
          href={ui6ReviewHref(role, "professional")}
          title="← Back"
          subtitle="Professional"
        />
        <section className="rounded-xl border border-hairline px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Current availability
          </h2>
          <p className="mt-1 text-sm font-semibold text-ink">Not configured</p>
        </section>
        <div role="radiogroup" aria-label="Availability" className="space-y-2">
          {[
            ["Available", true],
            ["Temporarily Unavailable", false],
          ].map(([title, on]) => (
            <div
              key={String(title)}
              className={
                on
                  ? "flex min-h-11 w-full flex-col items-start rounded-xl border border-gold bg-gold/15 px-4 py-3"
                  : "flex min-h-11 w-full flex-col items-start rounded-xl border border-hairline px-4 py-3"
              }
            >
              <span className="text-sm font-semibold text-ink">{title}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled
          className="story-press inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy opacity-60"
        >
          Save
        </button>
      </div>
    );
  }

  if (panel === "brokerage") {
    return (
      <div className="space-y-4">
        <SettingsCategoryRow
          href={ui6ReviewHref(role, "professional")}
          title="← Back"
          subtitle="Professional"
        />
        <SettingsCard
          icon={Building2}
          title="Current brokerage"
          subtitle="Story Home relationship on this professional account."
        >
          <p className="text-sm text-[var(--muted)]">
            Owner-review chrome only. No private brokerage history.
          </p>
        </SettingsCard>
        <p className="text-sm text-[var(--muted)]">No pending invite on this fixture.</p>
      </div>
    );
  }

  if (panel === "office") {
    return (
      <div className="space-y-3">
        <SettingsCategoryRow
          href={ui6ReviewHref(role)}
          title="← Back"
          subtitle="Settings root"
        />
        <SettingsCategoryRow
          href={ui6ReviewHref(role, "office")}
          title="Office Workspace"
          subtitle="Administer this office on /office"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SettingsCategoryRow
        href={ui6ReviewHref(role)}
        title="Account"
        subtitle="Username, profile, and sign-in"
      />
      {caps.professional ? (
        <SettingsCategoryRow
          href={ui6ReviewHref(role, "professional")}
          title="Professional"
          subtitle={ui6ReviewAccount(role).label}
        />
      ) : null}
      {caps.office ? (
        <SettingsCategoryRow
          href={ui6ReviewHref(role, "office")}
          title="Brokerage / Office"
          subtitle={caps.officeWorkspace ? "Office workspace" : "Open an office account"}
        />
      ) : null}
      <SettingsCard icon={MapPin} title="Utility empty" subtitle="Settings stays utilitarian.">
        <p className="text-sm text-[var(--muted)]">
          No public marketing empty copy on this surface.
        </p>
      </SettingsCard>
    </div>
  );
}
