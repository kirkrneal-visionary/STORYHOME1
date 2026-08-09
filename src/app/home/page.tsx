"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { MyHomeView } from "@/components/home/MyHomeView";

export default function MyHomePage() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-[120px] text-center md:px-6">
        <h1 className="font-serif text-3xl font-bold text-ink">My Home</h1>
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

  return <MyHomeView />;
}
