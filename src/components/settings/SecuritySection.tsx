"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, Shield } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { MfaChallengeForm } from "@/components/auth/MfaChallengeForm";
import {
  GENERIC_AUTH_SENT,
  mfaRequired,
} from "@/lib/account/assurance";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Factor = { id: string; status: string; friendlyName?: string };

export function SecuritySection({
  purpose,
  kind,
}: {
  purpose?: string | null;
  kind?: string | null;
}) {
  const searchParams = useSearchParams();
  const setupMfa = searchParams.get("setup") === "mfa";
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
  const [notices, setNotices] = useState<
    { id: string; label: string; at: string }[]
  >([]);

  const mustMfa = mfaRequired(purpose, kind);

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
      setNewEmail("");
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

  if (!user) return null;

  const inputCls =
    "h-11 w-full rounded-xl border border-hairline bg-[var(--surface)] px-4 text-sm text-ink outline-none focus:border-gold";

  return (
    <section
      id="security"
      className={`story-surface p-5 ${setupMfa ? "ring-2 ring-gold/50" : ""}`}
    >
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-[var(--muted)]" />
        <div>
          <h2 className="type-card-title text-ink">Sign-in &amp; security</h2>
          <p className="text-xs text-[var(--muted)]">
            Email, password, authenticator, and this device.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {mustMfa && !status?.enrolled && (
          <p className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-ink">
            Realtor and office accounts need an authenticator app.
          </p>
        )}

        <div>
          <p className="text-xs font-semibold text-ink">Email on this login</p>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">{email || "—"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
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
              className="mt-2 text-xs font-semibold text-gold hover:underline"
            >
              Resend confirmation
            </button>
          )}
        </div>

        <form onSubmit={onChangeEmail} className="space-y-2">
          <label className="text-xs font-semibold text-ink" htmlFor="sec-email">
            Change email
          </label>
          <input
            id="sec-email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="New email"
            className={inputCls}
            required
          />
          <button
            type="submit"
            disabled={busy === "email"}
            className="h-10 rounded-xl border border-hairline px-4 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {busy === "email" ? "Sending…" : "Send confirmation"}
          </button>
        </form>

        <form onSubmit={onChangePassword} className="space-y-2">
          <p className="text-xs font-semibold text-ink">Change password</p>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className={inputCls}
            required
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className={inputCls}
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={busy === "password"}
            className="h-10 rounded-xl border border-hairline px-4 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {busy === "password" ? "Saving…" : "Update password"}
          </button>
        </form>

        <div>
          <p className="flex items-center gap-2 text-xs font-semibold text-ink">
            <KeyRound className="h-4 w-4" /> Authenticator
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            We use the authenticator in Supabase. We do not store backup codes.
            If you lost your phone, you still need a working code — a password
            reset does not skip this.
          </p>
          {needsStepUp && (
            <div className="mt-3 rounded-xl border border-gold/40 p-3">
              <MfaChallengeForm
                onVerified={() => {
                  setNeedsStepUp(false);
                  void refreshAssurance();
                  void loadStatus();
                }}
              />
            </div>
          )}
          {factors.filter((f) => f.status === "verified").length === 0 && !enrollQr && (
            <button
              type="button"
              onClick={() => void startEnroll()}
              disabled={busy === "enroll"}
              className="mt-3 h-10 rounded-xl bg-gold px-4 text-sm font-bold text-navy disabled:opacity-60"
            >
              {busy === "enroll" ? "Starting…" : "Set up authenticator"}
            </button>
          )}
          {enrollQr && (
            <form onSubmit={confirmEnroll} className="mt-3 space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrollQr}
                alt="Authenticator QR code"
                className="h-40 w-40 rounded-lg bg-white p-2"
              />
              {enrollSecret && (
                <p className="font-mono text-[11px] break-all text-[var(--muted)]">
                  {enrollSecret}
                </p>
              )}
              <input
                value={enrollCode}
                onChange={(e) => setEnrollCode(e.target.value)}
                placeholder="Code from the app"
                className={inputCls}
                required
              />
              <button
                type="submit"
                disabled={busy === "verify"}
                className="h-10 rounded-xl bg-gold px-4 text-sm font-bold text-navy disabled:opacity-60"
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
                className="mt-3 flex items-center justify-between rounded-xl border border-hairline px-3 py-2"
              >
                <p className="text-sm text-ink">
                  {f.friendlyName || "Authenticator"} · on
                </p>
                <button
                  type="button"
                  onClick={() => void removeFactor(f.id)}
                  disabled={busy === "unenroll"}
                  className="text-xs font-semibold text-red-300 hover:underline disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            ))}
        </div>

        <div>
          <p className="text-xs font-semibold text-ink">This device</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Last sign-in:{" "}
            {status?.lastSignInAt
              ? new Date(status.lastSignInAt).toLocaleString()
              : "this session"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Other sessions are not listed here. Use sign out everywhere to close
            them.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={logout}
              className="h-10 rounded-xl border border-hairline px-4 text-sm font-semibold text-ink"
            >
              Sign out this device
            </button>
            <button
              type="button"
              onClick={() => void signOutEverywhere()}
              className="h-10 rounded-xl border border-gold px-4 text-sm font-bold text-gold"
            >
              Sign out everywhere
            </button>
          </div>
        </div>

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

        {error && <p className="text-sm text-red-300">{error}</p>}
        {note && <p className="text-sm text-teal-soft">{note}</p>}
      </div>
    </section>
  );
}
