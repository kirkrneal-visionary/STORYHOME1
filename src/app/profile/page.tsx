"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { accountLabel } from "@/lib/auth";

export default function ProfilePage() {
  const { user, isLoggedIn, logout } = useAuth();

  if (!isLoggedIn || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-[96px] text-center md:px-6">
        <h1 className="font-serif text-3xl font-bold text-ink">Profile</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Log in to manage your Story Home account, suites, and messages.
        </p>
        <Link
          href="/login?next=/profile"
          className="mt-8 inline-flex h-12 items-center rounded-xl bg-gold px-6 text-sm font-bold text-navy"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6 md:pb-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] text-lg font-bold text-navy">
            {user.initials}
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">
              {user.name}
            </h1>
            <p className="mt-1 font-mono text-xs tracking-wider text-[var(--muted)] uppercase">
              {accountLabel(user)}
            </p>
          </div>
        </div>

        <p className="mt-6 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
          {user.kind === "consumer"
            ? "Build Story Home Suites, save homes into albums, and message agents when you’re ready."
            : user.kind === "seller"
              ? `Seller access via passcode ${user.sellerListingCode}. Open your listing portal for analytics and boosts.`
              : "Manage your Story Pro workspace, public profile, listings, and referrals."}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {user.kind === "consumer" && (
            <>
              <Link
                href="/home"
                className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]"
              >
                My Home
              </Link>
              <Link
                href="/saved"
                className="rounded-lg border border-hairline px-4 py-2.5 text-sm font-semibold text-ink"
              >
                My Suites
              </Link>
            </>
          )}
          {(user.kind === "pro" || user.kind === "broker") && (
            <>
              <Link
                href="/portal"
                className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]"
              >
                Story Pro
              </Link>
              <Link
                href={`/agents/${user.id}`}
                className="rounded-lg border border-hairline px-4 py-2.5 text-sm font-semibold text-ink"
              >
                Public profile
              </Link>
              <Link
                href="/referrals"
                className="rounded-lg border border-hairline px-4 py-2.5 text-sm font-semibold text-ink"
              >
                Referral board
              </Link>
            </>
          )}
          {user.kind === "seller" && user.sellerListingCode && (
            <Link
              href={`/seller/portal/${user.sellerListingCode.toLowerCase()}`}
              className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]"
            >
              Seller portal
            </Link>
          )}
          <Link
            href="/messages"
            className="rounded-lg border border-hairline px-4 py-2.5 text-sm font-semibold text-ink"
          >
            Messages
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-hairline px-4 py-2.5 text-sm font-semibold text-[var(--muted)]"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
