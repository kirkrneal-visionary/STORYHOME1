import type { Metadata } from "next";
import Link from "next/link";
import { DEMO_AGENT } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6 md:pb-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] text-lg font-bold text-navy">
            {DEMO_AGENT.initials}
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">
              {DEMO_AGENT.fullName}
            </h1>
            <p className="mt-1 font-mono text-xs tracking-wider text-[var(--muted)] uppercase">
              Dual identity · Consumer + Professional
            </p>
          </div>
        </div>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
          {DEMO_AGENT.bio}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/agents/${DEMO_AGENT.id}`}
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]"
          >
            Public profile
          </Link>
          <Link
            href="/referrals"
            className="rounded-lg border border-hairline px-4 py-2.5 text-sm font-semibold text-ink"
          >
            Referral board
          </Link>
          <Link
            href="/seller"
            className="rounded-lg border border-hairline px-4 py-2.5 text-sm font-semibold text-ink"
          >
            Seller client portal
          </Link>
        </div>
      </div>
    </div>
  );
}
