"use client";

import { FormEvent, useState } from "react";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { signUpPublicMessage } from "@/lib/account/password-strength";

export function RecoveryPasswordForm({
  onSaved,
  updatePassword,
}: {
  onSaved: () => void;
  updatePassword: (
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Choose a longer password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.ok) {
      setError(signUpPublicMessage({ message: result.error }));
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <p className="text-sm text-[var(--muted)]">
        Choose a new password. If this account uses an authenticator, you will
        still need that code next.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        className="h-11 w-full rounded-xl border border-hairline bg-[var(--surface)] px-4 text-sm text-ink outline-none focus:border-gold"
        required
        minLength={6}
      />
      <PasswordStrengthMeter password={password} />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm new password"
        className="h-11 w-full rounded-xl border border-hairline bg-[var(--surface)] px-4 text-sm text-ink outline-none focus:border-gold"
        required
        minLength={6}
      />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="h-11 w-full rounded-xl bg-gold text-sm font-bold text-navy disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
