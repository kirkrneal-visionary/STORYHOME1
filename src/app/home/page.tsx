"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { MyHomeView } from "@/components/home/MyHomeView";
import { canAccessPrivateApp } from "@/lib/account/assurance";

export default function MyHomePage() {
  const { isLoggedIn, user } = useAuth();

  if (!isLoggedIn || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-[calc(var(--story-safe-top)+2rem)] text-center md:px-6">
        <h1 className="type-page-title text-ink">My Home</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Your private homeowner vault — renovation history, expenses, documents,
          and consent‑based sharing. Log in to get started.
        </p>
        <Link
          href="/login?next=/home"
          className="mt-8 inline-flex h-12 items-center rounded-xl bg-gold px-6 text-sm font-bold text-navy"
        >
          Log in to continue
        </Link>
      </div>
    );
  }

  const demoSession = user.emailConfirmed === undefined;
  const ready =
    demoSession ||
    canAccessPrivateApp({ emailConfirmed: user.emailConfirmed !== false });

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-[calc(var(--story-safe-top)+2rem)] text-center md:px-6">
        <h1 className="type-page-title text-ink">Finish signing in</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Confirm your email before we open this home.
        </p>
        <Link
          href="/login?pending=email&next=/home"
          className="mt-8 inline-flex h-12 items-center rounded-xl bg-gold px-6 text-sm font-bold text-navy"
        >
          Continue
        </Link>
      </div>
    );
  }

  return <MyHomeView />;
}
