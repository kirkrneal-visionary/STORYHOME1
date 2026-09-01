import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Following" };

export default function FollowingPage() {
  return (
    <div className="min-h-dvh px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+1.5rem)] md:px-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-serif text-3xl font-bold text-ink">Following</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Agent following is not available yet.
        </p>

        <div className="story-well mt-8 border-dashed p-10 text-center">
          <p className="font-serif text-xl font-bold text-ink">
            Not shipping yet
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This room is reserved. Story Home will not pretend you follow
            agents until following actually saves.
          </p>
          <Link
            href="/marketplace"
            className="story-press mt-6 inline-flex h-11 items-center rounded-xl bg-gold px-6 text-sm font-bold text-navy"
          >
            Browse the marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
