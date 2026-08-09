import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Following" };

export default function FollowingPage() {
  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6 md:pb-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-serif text-3xl font-bold text-ink">Following</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Homes from agents you follow.
        </p>

        <div className="mt-8 rounded-xl border border-dashed border-hairline bg-[var(--surface)] p-10 text-center">
          <p className="font-serif text-xl font-bold text-ink">
            You&rsquo;re not following anyone yet
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Browse the marketplace and follow agents to see their new listings
            here.
          </p>
          <Link
            href="/marketplace"
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-gold px-6 text-sm font-bold text-navy"
          >
            Browse the marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
