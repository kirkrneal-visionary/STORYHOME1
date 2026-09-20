"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { MfaChallengeForm } from "@/components/auth/MfaChallengeForm";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import {
  GENERIC_AUTH_SENT,
  mfaRequired,
} from "@/lib/account/assurance";
import { DELETE_CONFIRM_WORD, deleteWarning } from "@/lib/account/delete-account";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Factor = { id: string; status: string; friendlyName?: string };
type SecurityControl =
  | "email"
  | "password"
  | "authenticator"
  | "device"
  | "delete";

/** Process-local inbox is a stub. Do not expose it as a Settings product. */
const NOTICES_UI = false;

export function SecuritySection({
  purpose,
  kind,
  control,
}: {
  purpose?: string | null;
  kind?: string | null;
  control?: SecurityControl | null;
}) {
  const searchParams = useSearchParams();
  const setupMfa = searchParams.get("setup") === "mfa";
  const statusId = useId();
  const {
    user,
    logout,
    signOutEverywhere,
    refreshAssurance,
    resendConfirmation,
  } = useAuth();

  const [email, setEmail] = useState(user?.email ?? "");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState<{
    emailConfirmed: boolean;
    enrolled: boolean;
    currentAal: string | null;
    mfaRequired: boolean;
    lastSignInAt: string | null;
  } | null>(null);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollQr, setEnrollQr] = useState<string | null>(null);
  const [enrollSecret, setEnrollSecret] = useState<string | null>(null);
  const [enrollId, setEnrollId] = useState<string | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [needsStepUp, setNeedsStepUp] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [confirmEverywhere, setConfirmEverywhere] = useState(false);
  const [notices, setNotices] = useState<
    { id: string; label: string; at: string }[]
  >([]);

  const mustMfa = mfaRequired(purpose, kind);
  const focus = control ?? (setupMfa ? "authenticator" : null);

  async function loadStatus() {
    try {
      const res = await fetch("/api/account/security-status");
      const data = (await res.json()) as {
        ok?: boolean;
        email?: string;
        emailConfirmed?: boolean;
        enrolled?: boolean;
        currentAal?: string | null;
        mfaRequired?: boolean;
        lastSignInAt?: string | null;
      };
      if (res.ok && data.ok) {
        setStatus({
          emailConfirmed: Boolean(data.emailConfirmed),
          enrolled: Boolean(data.enrolled),
          currentAal: data.currentAal ?? null,
          mfaRequired: Boolean(data.mfaRequired),
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
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { data: listed } = await supabase.auth.mfa.listFactors();
    setFactors(
      (listed?.totp ?? []).map((f) => ({
        id: f.id,
        status: f.status,
        friendlyName: f.friendly_name ?? undefined,
      })),
    );
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
    setBusy("password");
    setError("");
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
      if (data.code === "needs_mfa") {
        setNeedsStepUp(true);
        setError(data.error ?? "Confirm your authenticator code first.");
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
        body: JSON.stringify({ email: newEmail }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
        message?: string;
      };
      if (data.code === "needs_mfa") {
        setNeedsStepUp(true);
        setError(data.error ?? "Confirm your authenticator code first.");
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Unable to start that email change.");
        return;
      }
      flash(data.message ?? "Check the new inbox to confirm the change.");
    } finally {
      setBusy("");
    }
  }

  async function startEnroll() {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy("enroll");
    setError("");
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator",
      });
      if (enrollError || !data) {
        setError("Unable to start authenticator setup.");
        return;
      }
      setEnrollId(data.id);
      setEnrollQr(data.totp.qr_code);
      setEnrollSecret(data.totp.secret);
    } finally {
      setBusy("");
    }
  }

  async function confirmEnroll(e: FormEvent) {
    e.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase || !enrollId) return;
    setBusy("verify");
    setError("");
    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: enrollId });
      if (challengeError || !challenge) {
        setError("Unable to confirm that authenticator.");
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollId,
        challengeId: challenge.id,
        code: enrollCode.trim(),
      });
      if (verifyError) {
        setError("That code did not work. Try again.");
        return;
      }
      setEnrollQr(null);
      setEnrollSecret(null);
      setEnrollId(null);
      setEnrollCode("");
      await fetch("/api/account/security-notices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "mfa_enrolled" }),
      });
      await refreshAssurance();
      await loadStatus();
      flash("Authenticator is on.");
    } finally {
      setBusy("");
    }
  }

  async function removeFactor(factorId: string) {
    setBusy("unenroll");
    setError("");
    try {
      const res = await fetch("/api/account/mfa/unenroll", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ factorId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
      };
      if (data.code === "needs_mfa") {
        setNeedsStepUp(true);
        setError(data.error ?? "Confirm your authenticator code first.");
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Unable to remove that authenticator.");
        return;
      }
      await refreshAssurance();
      await loadStatus();
      flash("Authenticator removed.");
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
        code?: string;
      };
      if (data.code === "needs_mfa") {
        setNeedsStepUp(true);
        setError(data.error ?? "Confirm your authenticator code first.");
        return;
      }
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
  const enrolled =
    status?.enrolled === true ||
    factors.some((f) => f.status === "verified") ||
    user.mfaEnrolled === true;

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

  const stepUp = needsStepUp ? (
    <div className="rounded-xl border border-gold/40 p-3">
      <MfaChallengeForm
        onVerified={() => {
          setNeedsStepUp(false);
          void refreshAssurance();
          void loadStatus();
        }}
      />
    </div>
  ) : null;

  return (
    <section
      id="security"
      className={`mx-auto max-w-md ${setupMfa ? "ring-2 ring-gold/50 rounded-2xl p-4" : ""}`}
    >
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
          <p className="text-xs text-[var(--muted)]">
            We keep this email until you confirm the new one.
          </p>
          {stepUp}
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
              onChange={(e) => setNewPassword(e.target.value)}
              className={`${inputCls} mt-1.5`}
              required
              minLength={6}
            />
          </label>
          <PasswordStrengthMeter password={newPassword} email={email} />
          {stepUp}
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

      {focus === "authenticator" ? (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <KeyRound className="h-4 w-4" /> Authenticator
          </p>
          {mustMfa && !enrolled && (
            <p className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-ink">
              Realtor and office accounts need an authenticator app.
            </p>
          )}
          <p className="text-xs text-[var(--muted)]">
            We use the authenticator in Supabase. We do not store backup codes.
            If you lost your phone, you still need a working code — a password
            reset does not skip this.
          </p>
          {stepUp}
          {factors.filter((f) => f.status === "verified").length === 0 && !enrollQr && (
            <button
              type="button"
              onClick={() => void startEnroll()}
              disabled={busy === "enroll"}
              className="inline-flex min-h-11 items-center rounded-xl bg-gold px-4 text-sm font-bold text-navy disabled:opacity-60"
            >
              {busy === "enroll" ? "Starting…" : "Set up authenticator"}
            </button>
          )}
          {enrollQr && (
            <form onSubmit={confirmEnroll} className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollQr}
                alt="Authenticator QR code. Enter the secret below if you cannot scan."
                className="h-40 w-40 rounded-lg bg-white p-2"
              />
              {enrollSecret && (
                <p className="font-mono text-[11px] break-all text-[var(--muted)]">
                  {enrollSecret}
                </p>
              )}
              <label htmlFor="sec-enroll-code" className="block">
                <span className="type-control block text-[var(--muted)]">Code from the app</span>
                <input
                  id="sec-enroll-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value)}
                  className={`${inputCls} mt-1.5`}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={busy === "verify"}
                className="inline-flex min-h-11 items-center rounded-xl bg-gold px-4 text-sm font-bold text-navy disabled:opacity-60"
              >
                {busy === "verify" ? "Checking…" : "Confirm authenticator"}
              </button>
            </form>
          )}
          {factors
            .filter((f) => f.status === "verified")
            .map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-xl border border-hairline px-3 py-2"
              >
                <p className="text-sm text-ink">
                  {f.friendlyName || "Authenticator"} · on
                </p>
                <button
                  type="button"
                  onClick={() => void removeFactor(f.id)}
                  disabled={busy === "unenroll"}
                  className="min-h-11 text-sm font-semibold text-red-300 hover:underline disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            ))}
          {statusLine}
        </div>
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
          {stepUp}
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
