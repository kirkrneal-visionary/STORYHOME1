"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthContext";

export function RequireAuth({
  children,
  title = "Sign in required",
  description = "This area is only available when you’re logged in.",
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-[96px] text-center md:px-6">
        <h1 className="font-serif text-3xl font-bold text-ink">{title}</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">{description}</p>
        <Link
          href="/login?next=/profile"
          className="mt-8 inline-flex h-12 items-center rounded-xl bg-gold px-6 text-sm font-bold text-navy"
        >
          Log in to continue
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
