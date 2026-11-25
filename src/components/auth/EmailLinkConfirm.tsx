"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { RecoveryPasswordForm } from "@/components/auth/RecoveryPasswordForm";
import {
  emailLinkFailure,
  type EmailLink,
  type EmailLinkFailure,
} from "@/lib/account/email-link";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Step =
  | "ready"
  | "checking"
  | "new-password"
  | "password-saved"
  | "confirmed"
  | EmailLinkFailure;

const COPY = {
  email: {
    eyebrow: "Confirm your email",
    title: "Finish creating your account",
    body: "Tap Confirm email to confirm this address and open your Story Home account.",
    action: "Confirm email",
    expired:
      "It may have been used already. If you confirmed your email, you can sign in now. If not, sign in and we’ll offer to send a new link.",
    expiredAction: "Go to sign in",
    expiredHref: "/login",
  },
  recovery: {
    eyebrow: "Password reset",
    title: "Reset your password",
    body: "Tap Continue to choose a new password for your Story Home account.",
    action: "Continue",
    expired:
      "Reset links work once and expire soon. Ask for a new one, then open the newest email.",
    expiredAction: "Send a new link",
    expiredHref: "/login?mode=reset",
  },
} as const;

const primaryCls =
  "mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60";

function Shell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-[calc(var(--story-safe-top)+1.5rem)] md:px-6">
      <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
        {eyebrow}
      </p>
      <h1 className="type-page-title mt-2 text-ink">{title}</h1>
      {children}
    </div>
  );
}

export function EmailLinkConfirm({ link }: { link: EmailLink | null }) {
  const { updatePassword } = useAuth();
  const [step, setStep] = useState<Step>("ready");

  async function confirmLink() {
    if (!link) return;
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setStep("network");
      return;
    }
    setStep("checking");
    const { error } = await supabase.auth.verifyOtp({
      token_hash: link.tokenHash,
      type: link.type,
    });
    if (error) {
      setStep(emailLinkFailure(error));
      return;
    }
    setStep(link.type === "recovery" ? "new-password" : "confirmed");
  }

  if (!link) {
    return (
      <Shell eyebrow="Story Home" title="This link is incomplete">
        <p className="mt-3 text-sm text-[var(--muted)]">
          Open the newest email from Story Home and tap its button again. If
          you copied the link, make sure you copied all of it.
        </p>
        <Link href="/login" className={primaryCls}>
          Go to sign in
        </Link>
      </Shell>
    );
  }

  const copy = COPY[link.type];

  if (step === "new-password") {
    return (
      <Shell eyebrow={copy.eyebrow} title="Set a new password">
        <RecoveryPasswordForm
          updatePassword={updatePassword}
          onSaved={() => setStep("password-saved")}
        />
      </Shell>
    );
  }

  if (step === "password-saved") {
    return (
      <Shell eyebrow={copy.eyebrow} title="Your password is updated">
        <p className="mt-3 text-sm text-[var(--muted)]">
          Use your new password the next time you sign in, in the Story Home
          app or on the web.
        </p>
        <Link href="/login" className={primaryCls}>
          Continue
        </Link>
      </Shell>
    );
  }

  if (step === "confirmed") {
    return (
      <Shell eyebrow={copy.eyebrow} title="Your email is confirmed">
        <p className="mt-3 text-sm text-[var(--muted)]">
          Your Story Home account is ready, and you’re signed in on this
          browser. If you started in the Story Home app, go back to the app and
          sign in there.
        </p>
        <Link href="/login" className={primaryCls}>
          Continue
        </Link>
      </Shell>
    );
  }

  if (step === "expired") {
    return (
      <Shell eyebrow={copy.eyebrow} title="This link no longer works">
        <p className="mt-3 text-sm text-[var(--muted)]">{copy.expired}</p>
        <Link href={copy.expiredHref} className={primaryCls}>
          {copy.expiredAction}
        </Link>
      </Shell>
    );
  }

  return (
    <Shell eyebrow={copy.eyebrow} title={copy.title}>
      <p className="mt-3 text-sm text-[var(--muted)]">{copy.body}</p>
      <button
        type="button"
        onClick={confirmLink}
        disabled={step === "checking"}
        className={primaryCls}
      >
        {step === "checking" ? "Checking…" : copy.action}
      </button>
      {step === "network" && (
        <p className="mt-3 text-sm text-red-300" role="alert">
          We couldn’t reach Story Home. Check your connection and try again.
        </p>
      )}
    </Shell>
  );
}
