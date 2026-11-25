"use client";

import { useEffect, useState } from "react";
import { EMAIL_RESEND_WAIT_MS } from "@/lib/account/email-link";

export type CheckEmailReason = "signup" | "unconfirmed";

export function CheckEmailPanel({
  email,
  reason,
  onResend,
  onBack,
}: {
  email: string;
  reason: CheckEmailReason;
  onResend: (
    email: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onBack: () => void;
}) {
  // Sign-up just sent an email, and Supabase refuses another for a minute.
  const [resendAt, setResendAt] = useState(() =>
    reason === "signup" ? Date.now() + EMAIL_RESEND_WAIT_MS : 0,
  );
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const waitSec = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    if (resendAt <= now) return;
    const timer = window.setTimeout(() => setNow(Date.now()), 1000);
    return () => window.clearTimeout(timer);
  }, [resendAt, now]);

  async function resend() {
    setBusy(true);
    await onResend(email);
    setBusy(false);
    setNotice("We sent another email. It can take a minute to arrive.");
    const sentAt = Date.now();
    setNow(sentAt);
    setResendAt(sentAt + EMAIL_RESEND_WAIT_MS);
  }

  return (
    <section className="mt-8 space-y-3 rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
        Check your email
      </p>
      <h2 className="type-section text-ink">
        {reason === "signup"
          ? "Confirm your email to finish"
          : "Confirm your email first"}
      </h2>
      <p className="text-sm text-[var(--muted)]">
        {reason === "signup"
          ? "We sent a link to"
          : "This account isn’t confirmed yet. We sent a link to"}
      </p>
      <p className="break-all font-mono text-sm text-ink">{email}</p>
      <p className="text-sm text-[var(--muted)]">
        Open that email and tap <span className="text-ink">Confirm email</span>.
        It works on this phone or any other device. Then come back here and
        sign in.
      </p>
      <p className="text-xs text-[var(--muted)]">
        Don’t see it? Check spam or junk.
      </p>
      <button
        type="button"
        disabled={busy || waitSec > 0}
        onClick={resend}
        className="h-11 w-full rounded-xl border border-gold px-5 text-sm font-bold text-gold disabled:opacity-60"
      >
        {busy
          ? "Sending…"
          : waitSec > 0
            ? `Resend email in ${waitSec}s`
            : "Resend email"}
      </button>
      {notice && (
        <p role="status" className="text-sm text-teal-soft">
          {notice}
        </p>
      )}
      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-xs font-semibold text-gold hover:underline"
      >
        Back to sign in
      </button>
    </section>
  );
}
