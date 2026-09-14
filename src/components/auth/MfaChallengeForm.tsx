"use client";

import { FormEvent, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function MfaChallengeForm({
  onVerified,
}: {
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Auth is not configured.");
      return;
    }
    setBusy(true);
    try {
      const { data: factors, error: listError } =
        await supabase.auth.mfa.listFactors();
      if (listError) {
        setError("Unable to open authenticator check.");
        return;
      }
      const totp = factors?.totp?.find((f) => f.status === "verified");
      if (!totp) {
        setError("No authenticator is on this account yet.");
        return;
      }
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (challengeError || !challenge) {
        setError("Unable to start authenticator check.");
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totp.id,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verifyError) {
        setError("That code did not work. Try again.");
        return;
      }
      onVerified();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <p className="text-sm text-[var(--muted)]">
        Enter the 6-digit code from your authenticator app. A password reset
        does not skip this step.
      </p>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="123456"
        className="h-11 w-full rounded-xl border border-hairline bg-[var(--surface)] px-4 font-mono text-sm text-ink outline-none focus:border-gold"
        required
      />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="h-11 w-full rounded-xl bg-gold text-sm font-bold text-navy disabled:opacity-60"
      >
        {busy ? "Checking…" : "Verify code"}
      </button>
    </form>
  );
}
