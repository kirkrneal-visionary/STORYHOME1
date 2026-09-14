"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { MyHomeView } from "@/components/home/MyHomeView";
import {
  canAccessPrivateApp,
  needsMfaChallenge,
  needsMfaEnrollment,
} from "@/lib/account/assurance";

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

  const demoSession =
    user.emailConfirmed === undefined && user.aal === undefined;
  const ready =
    demoSession ||
    canAccessPrivateApp({
      emailConfirmed: user.emailConfirmed !== false,
      purpose: user.purpose,
      kind: user.kind,
      enrolled: user.mfaEnrolled === true,
      currentAal: user.aal,
    });

  if (!ready) {
    const needEmail = user.emailConfirmed === false;
    const needEnroll = needsMfaEnrollment({
      purpose: user.purpose,
      kind: user.kind,
      enrolled: user.mfaEnrolled === true,
    });
    const needChallenge = needsMfaChallenge({
      purpose: user.purpose,
      kind: user.kind,
      enrolled: user.mfaEnrolled === true,
      currentAal: user.aal,
    });
    const href = needEmail
      ? "/login?pending=email&next=/home"
      : needEnroll
        ? "/settings?setup=mfa"
        : "/login?pending=mfa&next=/home";
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-[calc(var(--story-safe-top)+2rem)] text-center md:px-6">
        <h1 className="type-page-title text-ink">Finish signing in</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {needEmail
            ? "Confirm your email before we open this home."
            : needEnroll
              ? "Turn on an authenticator in settings first."
              : needChallenge
                ? "Enter your authenticator code to continue."
                : "Finish account security to continue."}
        </p>
        <Link
          href={href}
          className="mt-8 inline-flex h-12 items-center rounded-xl bg-gold px-6 text-sm font-bold text-navy"
        >
          Continue
        </Link>
      </div>
    );
  }

  return <MyHomeView />;
}
