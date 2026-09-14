"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { mayManageBrokerage, mayUseStoryPro } from "@/lib/account/purpose";
import { accountLabel } from "@/lib/auth";

export default function ProfilePage() {
  const { user, isLoggedIn, logout } = useAuth();

  if (!isLoggedIn || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+1.5rem)] text-center md:px-6">
        <h1 className="type-page-title text-ink">Profile</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Log in to manage your Story Home account and suites.
        </p>
        <Link
          href="/login?next=/profile"
          className="story-press mt-8 inline-flex h-12 items-center rounded-xl bg-gold px-6 text-sm font-bold text-navy"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+1.5rem)] md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] text-lg font-bold text-navy">
            {user.initials}
          </div>
          <div>
            <h1 className="type-page-title text-ink">
              {user.name}
            </h1>
            <p className="mt-1 font-mono text-xs tracking-wider text-[var(--muted)] uppercase">
              {accountLabel(user)}
            </p>
          </div>
        </div>

        <p className="mt-6 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
          {mayManageBrokerage(user.purpose)
            ? "This login is the office account. Roster and branding live here. Story Pro, Archie, and buyer view stay on this same login."
            : user.purpose === "other_professional"
              ? "This login is your professional profile. Story Pro and office tools are not on this account."
              : user.kind === "consumer"
                ? "Build Story Home Suites and save homes into albums."
                : user.kind === "seller"
                  ? `Seller access via passcode ${user.sellerListingCode}. Open your listing portal.`
                  : "Manage your Story Pro workspace, public profile, and listings."}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {mayManageBrokerage(user.purpose) && (
            <Link
              href="/office"
              className="story-press rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]"
            >
              Office
            </Link>
          )}
          {user.kind === "consumer" && !mayManageBrokerage(user.purpose) && (
            <>
              <Link
                href="/home"
                className="story-press rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]"
              >
                My Home
              </Link>
              <Link
                href="/saved"
                className="story-press rounded-[var(--radius-md)] border border-hairline px-4 py-2.5 text-sm font-semibold text-ink"
              >
                My Suites
              </Link>
            </>
          )}
          {mayUseStoryPro(user.purpose, user.kind) && (
            <>
              <Link
                href="/portal"
                className="story-press rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]"
              >
                Story Pro
              </Link>
              <Link
                href={`/agents/${user.id}`}
                className="story-press rounded-[var(--radius-md)] border border-hairline px-4 py-2.5 text-sm font-semibold text-ink"
              >
                Public profile
              </Link>
              <Link
                href="/network"
                className="story-press rounded-[var(--radius-md)] border border-hairline px-4 py-2.5 text-sm font-semibold text-ink"
              >
                Network
              </Link>
            </>
          )}
          {user.kind === "seller" && user.sellerListingCode && (
            <Link
              href={`/seller/portal/${user.sellerListingCode.toLowerCase()}`}
              className="story-press rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]"
            >
              Seller portal
            </Link>
          )}
          <button
            type="button"
            onClick={logout}
            className="story-press rounded-lg border border-hairline px-4 py-2.5 text-sm font-semibold text-[var(--muted)]"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
