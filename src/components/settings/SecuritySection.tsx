"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { PasswordRule } from "@/components/auth/PasswordRule";
import { GENERIC_AUTH_SENT } from "@/lib/account/assurance";
import { DELETE_CONFIRM_WORD, deleteWarning } from "@/lib/account/delete-account";
import {
  PASSWORD_MIN_LENGTH,
  meetsPasswordRule,
  passwordTooShortCopy,
} from "@/lib/account/password-rule";

type SecurityControl = "email" | "password" | "device" | "delete";

/** Process-local inbox is a stub. Do not expose it as a Settings product. */
const NOTICES_UI = false;

export function SecuritySection({
  purpose,
  control,
}: {
  purpose?: string | null;
  control?: SecurityControl | null;
}) {
  const statusId = useId();
  const {
    user,
    logout,
    signOutEverywhere,
    resendConfirmation,
  } = useAuth();

  const [email, setEmail] = useState(user?.email ?? "");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState<{
    emailConfirmed: boolean;
    lastSignInAt: string | null;
  } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [confirmEverywhere, setConfirmEverywhere] = useState(false);
  const [notices, setNotices] = useState<
    { id: string; label: string; at: string }[]
  >([]);

  const focus = control ?? null;

  async function loadStatus() {
    try {
      const res = await fetch("/api/account/security-status");
      const data = (await res.json()) as {
        ok?: boolean;
        email?: string;
        emailConfirmed?: boolean;
        lastSignInAt?: string | null;
      };
      if (res.ok && data.ok) {
        setStatus({
          emailConfirmed: Boolean(data.emailConfirmed),
          lastSignInAt: data.lastSignInAt ?? null,
        });
        if (data.email) setEmail(data.email);
      }
    } catch {
      // keep last
    }
    if (NOTICES_UI) {
      try {
        const noticeRes = await fetch("/api/account/security-notices");
        const noticeData = (await noticeRes.json()) as {
          ok?: boolean;
          items?: { id: string; label: string; at: string }[];
        };
        if (noticeRes.ok && noticeData.ok) {
          setNotices(noticeData.items ?? []);
        }
      } catch {
        // inbox is optional
      }
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  function flash(ok: string) {
    setNote(ok);
    setError("");
    setTimeout(() => setNote(""), 4000);
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNewPasswordError("");
    if (!meetsPasswordRule(newPassword)) {
      setNewPasswordError(passwordTooShortCopy());
      return;
    }
    setBusy("password");
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
      };
      if (data.code === "password_rejected") {
        setNewPasswordError(data.error ?? passwordTooShortCopy());
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Unable to update password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      flash("Password updated. Other devices were signed out.");
    } finally {
      setBusy("");
    }
  }

  async function onChangeEmail(e: FormEvent) {
    e.preventDefault();
    setBusy("email");
    setError("");
    try {
      const res = await fetch("/api/account/change-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: newEmail, currentPassword: emailPassword }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Unable to start that email change.");
        return;
      }
      setEmailPassword("");
      flash(data.message ?? "Check the new inbox to confirm the change.");
    } finally {
      setBusy("");
    }
  }

  async function onDeleteAccount(e: FormEvent) {
    e.preventDefault();
    setBusy("delete");
    setError("");
    try {
      const res = await fetch("/api/account/delete-account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: deletePassword,
          confirm: deleteConfirm,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Unable to delete this account.");
        return;
      }
      await logout();
      window.location.assign("/");
    } finally {
      setBusy("");
    }
  }

  if (!user) return null;

  const inputCls =
    "field-input";

  const statusLine = (
    <p
      id={statusId}
      role="status"
      aria-live="polite"
      className={error ? "text-sm text-red-300" : "text-sm text-teal-soft"}
    >
      {error || note}
    </p>
  );

  return (
    <section id="security" className="mx-auto max-w-md">
      {focus === "email" ? (
        <form onSubmit={onChangeEmail} className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Current email: <span className="text-ink">{email || "—"}</span>
          </p>
          <p className="text-xs text-[var(--muted)]">
            {status?.emailConfirmed
              ? "Mailbox confirmed."
              : "Mailbox not confirmed yet."}
          </p>
          {!status?.emailConfirmed && (
            <button
              type="button"
              onClick={async () => {
                await resendConfirmation(email);
                flash(GENERIC_AUTH_SENT);
              }}
              className="min-h-11 text-sm font-semibold text-gold hover:underline"
            >
              Resend confirmation
            </button>
          )}
          <label htmlFor="sec-email" className="block">
            <span className="type-control block text-[var(--muted)]">New email</span>
            <input
              id="sec-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={`${inputCls} mt-1.5`}
              required
            />
          </label>
          <label htmlFor="sec-email-password" className="block">
            <span className="type-control block text-[var(--muted)]">Current password</span>
            <input
              id="sec-email-password"
              type="password"
              autoComplete="current-password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              className={`${inputCls} mt-1.5`}
              required
            />
          </label>
          <p className="text-xs text-[var(--muted)]">
            We keep this email until you confirm the new one.
          </p>
          <div className="sticky bottom-[var(--story-bottom-clearance)] z-10 flex flex-wrap items-center gap-3 bg-[var(--background)] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="submit"
              disabled={busy === "email"}
              aria-describedby={statusId}
              className="inline-flex min-h-11 items-center rounded-xl border border-hairline px-4 text-sm font-semibold text-ink disabled:opacity-60"
            >
              {busy === "email" ? "Sending…" : "Send confirmation"}
            </button>
            {statusLine}
          </div>
        </form>
      ) : null}

      {focus === "password" ? (
        <form onSubmit={onChangePassword} className="space-y-4">
          <label htmlFor="sec-current-password" className="block">
            <span className="type-control block text-[var(--muted)]">Current password</span>
            <input
              id="sec-current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`${inputCls} mt-1.5`}
              required
            />
          </label>
          <label htmlFor="sec-new-password" className="block">
            <span className="type-control block text-[var(--muted)]">New password</span>
            <input
              id="sec-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setNewPasswordError("");
              }}
              className={`${inputCls} mt-1.5`}
              required
              minLength={PASSWORD_MIN_LENGTH}
              aria-describedby="sec-new-password-rule"
              aria-invalid={newPasswordError ? true : undefined}
            />
          </label>
          <PasswordRule
            id="sec-new-password-rule"
            password={newPassword}
            rejected={newPasswordError}
          />
          <div className="sticky bottom-[var(--story-bottom-clearance)] z-10 flex flex-wrap items-center gap-3 bg-[var(--background)] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="submit"
              disabled={busy === "password"}
              aria-describedby={statusId}
              className="inline-flex min-h-11 items-center rounded-xl border border-hairline px-4 text-sm font-semibold text-ink disabled:opacity-60"
            >
              {busy === "password" ? "Saving…" : "Update password"}
            </button>
            {statusLine}
          </div>
        </form>
      ) : null}

      {focus === "device" ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">
            Last sign-in:{" "}
            <span className="text-ink">
              {status?.lastSignInAt
                ? new Date(status.lastSignInAt).toLocaleString()
                : "this session"}
            </span>
          </p>
          <p className="text-xs text-[var(--muted)]">
            Other sessions are not listed here. Use sign out everywhere to close
            them.
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.assign("/login");
            }}
            className="inline-flex min-h-11 items-center rounded-xl border border-hairline px-4 text-sm font-semibold text-ink"
          >
            Sign out this device
          </button>
          <div className="border-t border-hairline pt-4">
            <p className="text-xs text-[var(--muted)]">
              Sign out everywhere closes every session on this login.
            </p>
            {!confirmEverywhere ? (
              <button
                type="button"
                onClick={() => setConfirmEverywhere(true)}
                className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-gold px-4 text-sm font-bold text-gold"
              >
                Sign out everywhere…
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await signOutEverywhere();
                  window.location.assign("/login");
                }}
                className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-gold px-4 text-sm font-bold text-gold"
              >
                Sign out everywhere now
              </button>
            )}
          </div>
          {statusLine}
        </div>
      ) : null}

      {focus === "delete" ? (
        <form onSubmit={(e) => void onDeleteAccount(e)} className="space-y-4">
          <p className="text-xs font-semibold text-ink">Delete account</p>
          <p className="text-sm text-[var(--muted)]">{deleteWarning(purpose)}</p>
          <label htmlFor="sec-delete-password" className="block">
            <span className="type-control block text-[var(--muted)]">Password</span>
            <input
              id="sec-delete-password"
              type="password"
              autoComplete="current-password"
              className={`${inputCls} mt-1.5`}
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
            />
          </label>
          <label htmlFor="sec-delete-confirm" className="block">
            <span className="type-control block text-[var(--muted)]">
              Type {DELETE_CONFIRM_WORD} to confirm
            </span>
            <input
              id="sec-delete-confirm"
              type="text"
              autoComplete="off"
              className={`${inputCls} mt-1.5`}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              required
            />
          </label>
          <div className="sticky bottom-[var(--story-bottom-clearance)] z-10 flex flex-wrap items-center gap-3 bg-[var(--background)] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="submit"
              disabled={busy === "delete"}
              aria-describedby={statusId}
              className="inline-flex min-h-11 items-center rounded-xl border border-red-400/60 px-4 text-sm font-semibold text-red-300 disabled:opacity-60"
            >
              {busy === "delete" ? "Deleting…" : "Delete this account"}
            </button>
            {statusLine}
          </div>
        </form>
      ) : null}

      {NOTICES_UI ? (
        <div>
          <p className="text-xs font-semibold text-ink">Security notices</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            This list is on this server only. Live email is not sent from here.
          </p>
          {notices.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--muted)]">No notices yet.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {notices.slice(0, 8).map((n) => (
                <li key={n.id} className="text-xs text-ink">
                  {n.label}
                  <span className="ml-2 font-mono text-[10px] text-[var(--muted)]">
                    {new Date(n.at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
