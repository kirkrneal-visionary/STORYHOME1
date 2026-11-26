"use client";

import { FormEvent, useState } from "react";
import { PasswordRule } from "@/components/auth/PasswordRule";
import {
  PASSWORD_MIN_LENGTH,
  meetsPasswordRule,
  passwordTooShortCopy,
} from "@/lib/account/password-rule";

export function RecoveryPasswordForm({
  onSaved,
  updatePassword,
}: {
  onSaved: () => void;
  updatePassword: (
    password: string,
  ) => Promise<
    { ok: true } | { ok: false; error: string; passwordRejected?: boolean }
  >;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPasswordError("");
    if (!meetsPasswordRule(password)) {
      setPasswordError(passwordTooShortCopy());
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
      if (result.passwordRejected) setPasswordError(result.error);
      else setError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <p className="text-sm text-[var(--muted)]">Choose a new password.</p>
      <input
        type="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setPasswordError("");
        }}
        placeholder="New password"
        autoComplete="new-password"
        className="h-11 w-full rounded-xl border border-hairline bg-[var(--surface)] px-4 text-sm text-ink outline-none focus:border-gold"
        required
        minLength={PASSWORD_MIN_LENGTH}
        aria-describedby="recovery-password-rule"
        aria-invalid={passwordError ? true : undefined}
      />
      <PasswordRule
        id="recovery-password-rule"
        password={password}
        rejected={passwordError}
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm new password"
        autoComplete="new-password"
        className="h-11 w-full rounded-xl border border-hairline bg-[var(--surface)] px-4 text-sm text-ink outline-none focus:border-gold"
        required
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
