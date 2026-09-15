"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { MfaChallengeForm } from "@/components/auth/MfaChallengeForm";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { PendingEmailPanel } from "@/components/auth/PendingEmailPanel";
import { RecoveryPasswordForm } from "@/components/auth/RecoveryPasswordForm";
import {
  DEMO_ACCOUNTS,
  DEMO_BROKER,
  PRO_ROLE_LABELS,
  type ProRole,
} from "@/lib/auth";
import {
  GENERIC_AUTH_SENT,
  needsMfaChallenge,
  needsMfaEnrollment,
  shouldStayOnLogin,
} from "@/lib/account/assurance";
import {
  draftAfterModeChange,
  readStashedLoginEmail,
  type AuthFormMode,
} from "@/lib/account/auth-form-fields";
import { destForUser } from "@/lib/account/purpose";
import { cn } from "@/lib/utils";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const pendingParam = searchParams.get("pending");
  const recoveryMode =
    searchParams.get("mode") === "recovery" ||
    searchParams.get("type") === "recovery";
  const {
    loginAs,
    loginSellerWithCode,
    isLoggedIn,
    user,
    logout,
    supabaseConfigured,
    signInWithPassword,
    signUp,
    resetPasswordForEmail,
    resendConfirmation,
    updatePassword,
    refreshAssurance,
  } = useAuth();
  const [sellerCode, setSellerCode] = useState("");
  const [error, setError] = useState("");
  const [recoverySaved, setRecoverySaved] = useState(false);

  const demoSession =
    !!user &&
    user.emailConfirmed === undefined &&
    user.aal === undefined;
  const pendingEmail =
    pendingParam === "email" ||
    (isLoggedIn && !demoSession && user?.emailConfirmed === false);
  const pendingMfa =
    pendingParam === "mfa" ||
    (isLoggedIn &&
      !demoSession &&
      !!user &&
      (needsMfaChallenge({
        purpose: user.purpose,
        kind: user.kind,
        enrolled: user.mfaEnrolled === true,
        currentAal: user.aal,
      }) ||
        needsMfaEnrollment({
          purpose: user.purpose,
          kind: user.kind,
          enrolled: user.mfaEnrolled === true,
        })));

  const stay = shouldStayOnLogin({
    recoveryMode: recoveryMode && !recoverySaved,
    pendingEmail,
    pendingMfa: pendingMfa && !needsMfaEnrollment({
      purpose: user?.purpose,
      kind: user?.kind,
      enrolled: user?.mfaEnrolled === true,
    }),
  });

  const enrollMfa =
    isLoggedIn &&
    !demoSession &&
    !!user &&
    needsMfaEnrollment({
      purpose: user.purpose,
      kind: user.kind,
      enrolled: user.mfaEnrolled === true,
    });

  const continueTo = useMemo(() => {
    if (!user) return next !== "/" ? next : "/";
    return next !== "/" ? next : destForUser(user);
  }, [next, user]);

  // Route to the correct home once signed in — never hijack pending email,
  // MFA, or password-recovery.
  useEffect(() => {
    if (enrollMfa) {
      router.replace("/settings?setup=mfa");
      return;
    }
    if (isLoggedIn && user && user.kind !== "seller" && !stay) {
      router.replace(continueTo);
    }
  }, [isLoggedIn, user, stay, enrollMfa, continueTo, router]);

  function goNext() {
    if (enrollMfa) {
      router.push("/settings?setup=mfa");
      return;
    }
    if (!user) return;
    router.push(continueTo);
  }

  async function onSellerSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await loginSellerWithCode(sellerCode);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/seller/portal/${sellerCode.trim().toLowerCase()}`);
  }

  if (isLoggedIn && user && (stay || enrollMfa || recoveryMode)) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-[calc(var(--story-safe-top)+1.5rem)] md:px-6">
        <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
          Finish signing in
        </p>
        <h1 className="type-page-title mt-2 text-ink">
          {recoveryMode && !recoverySaved
            ? "Set a new password"
            : pendingEmail
              ? "Confirm your email"
              : enrollMfa
                ? "Turn on authenticator"
                : "Authenticator check"}
        </h1>
        {recoveryMode && !recoverySaved && (
          <RecoveryPasswordForm
            updatePassword={updatePassword}
            onSaved={() => {
              setRecoverySaved(true);
              void refreshAssurance();
            }}
          />
        )}
        {(!recoveryMode || recoverySaved) && pendingEmail && (
          <PendingEmailPanel
            email={user.email}
            onResend={resendConfirmation}
          />
        )}
        {(!recoveryMode || recoverySaved) && !pendingEmail && enrollMfa && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--muted)]">
              Realtor and office accounts need an authenticator app. Settings
              stays open so you can finish this.
            </p>
            <Link
              href="/settings?setup=mfa"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gold px-5 text-sm font-bold text-navy"
            >
              Open settings
            </Link>
          </div>
        )}
        {(!recoveryMode || recoverySaved) &&
          !pendingEmail &&
          !enrollMfa &&
          pendingMfa && (
            <MfaChallengeForm
              onVerified={() => {
                void refreshAssurance().then(() => goNext());
              }}
            />
          )}
        <button
          type="button"
          onClick={logout}
          className="mt-6 h-11 rounded-xl border border-hairline px-5 text-sm font-semibold text-ink"
        >
          Log out
        </button>
      </div>
    );
  }

  if (isLoggedIn && user) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-[calc(var(--story-safe-top)+1.5rem)] md:px-6">
        <h1 className="type-page-title text-ink">
          You’re signed in
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {user.name} · {user.kind}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={goNext}
            className="h-11 rounded-xl bg-gold px-5 text-sm font-bold text-navy"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={logout}
            className="h-11 rounded-xl border border-hairline px-5 text-sm font-semibold text-ink"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-[calc(var(--story-safe-top)+1.5rem)] md:px-6">
      <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
        Story Home access
      </p>
      <h1 className="type-hero mt-2 text-ink">
        Log in to continue
      </h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        {supabaseConfigured
          ? "Sign in or create your account. Your data syncs across devices."
          : "Demo mode — pick an account type. Buyers get Story Home Suites."}
      </p>

      {supabaseConfigured &&
        process.env.NODE_ENV !== "production" &&
        process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true" && (
          <div className="mt-6 rounded-2xl border border-gold/40 bg-gold/10 p-4">
            <p className="font-mono text-[11px] font-bold tracking-wider text-gold uppercase">
              Quick test login
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              One click, no typing — for testing only.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  const r = await signInWithPassword(
                    "storyhome.test.owner@gmail.com",
                    "DevPass123!",
                  );
                  if (r.ok) goNext();
                  else setError(r.error);
                }}
                className="h-10 rounded-lg bg-gold px-4 text-sm font-bold text-navy"
              >
                Test Homeowner (consumer)
              </button>
              <button
                type="button"
                onClick={async () => {
                  const r = await signInWithPassword(
                    "storyhome.test.agent@gmail.com",
                    "DevPass123!",
                  );
                  if (r.ok) goNext();
                  else setError(r.error);
                }}
                className="h-10 rounded-lg border border-gold px-4 text-sm font-bold text-gold"
              >
                Test Agent (pro)
              </button>
            </div>
          </div>
        )}

      {supabaseConfigured && (
        <RealAuthForm
          signInWithPassword={signInWithPassword}
          signUp={signUp}
          resetPasswordForEmail={resetPasswordForEmail}
          onDone={goNext}
        />
      )}

      {!supabaseConfigured && (
        <>
      <section className="mt-10">
        <h2 className="type-section text-ink">
          Consumer (Buyer)
        </h2>
        <button
          type="button"
          onClick={() => {
            loginAs(DEMO_ACCOUNTS[0]);
            goNext();
          }}
          className="mt-3 h-12 w-full rounded-xl bg-gold text-sm font-bold text-navy"
        >
          Continue as Buyer — Jordan Hale
        </button>
      </section>

      <section className="mt-8">
        <h2 className="type-section text-ink">Pro accounts</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            ["realtor_broker", "inspector", "appraiser", "lender"] as ProRole[]
          ).map((role) => {
            const account = DEMO_ACCOUNTS.find((a) => a.proRole === role)!;
            return (
              <button
                key={role}
                type="button"
                onClick={() => {
                  loginAs(account);
                  goNext();
                }}
                className="rounded-xl border border-hairline bg-[var(--surface)] px-4 py-3 text-left hover:border-gold/40"
              >
                <p className="text-sm font-semibold text-ink">{account.name}</p>
                <p className="font-mono text-[10px] text-[var(--muted)] uppercase">
                  {PRO_ROLE_LABELS[role]}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="type-section text-ink">
          The Brokerage (Broker of Record)
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Org admin — manages the roster, authorizes teams, and curates the
          brokerage community &amp; knowledge library.
        </p>
        <button
          type="button"
          onClick={() => {
            loginAs(DEMO_BROKER);
            goNext();
          }}
          className="mt-3 rounded-xl border border-gold bg-[var(--surface)] px-4 py-3 text-left hover:border-gold/60"
        >
          <p className="text-sm font-semibold text-ink">
            Continue as Brokerage — {DEMO_BROKER.name}
          </p>
          <p className="font-mono text-[10px] text-[var(--muted)] uppercase">
            Broker of Record · Story Home Realty
          </p>
        </button>
      </section>
        </>
      )}

      <section className="mt-8">
        <h2 className="type-section text-ink">
          Seller (realtor passcode)
        </h2>
        {!supabaseConfigured ? (
          <p className="mt-1 text-xs text-[var(--muted)]">
            Local demo only — not used in production.
          </p>
        ) : (
          <p className="mt-1 text-xs text-[var(--muted)]">
            Enter the access code from your realtor.
          </p>
        )}
        <form
          onSubmit={onSellerSubmit}
          className="mt-3 flex flex-col gap-3 sm:flex-row"
        >
          <input
            value={sellerCode}
            onChange={(e) => {
              setSellerCode(e.target.value.toUpperCase());
              setError("");
            }}
            placeholder="Listing access code"
            className="h-12 flex-1 rounded-xl border border-hairline bg-[var(--surface)] px-4 font-mono text-sm text-ink outline-none focus:border-gold"
          />
          <button
            type="submit"
            className="h-12 rounded-xl border border-gold px-5 text-sm font-bold text-gold"
          >
            Enter seller portal
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
      </section>

      <p className="mt-10 text-center text-xs text-[var(--muted)]">
        <Link href="/" className="text-gold hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}

type AuthResult =
  | { ok: true; needsMfa?: boolean; emailUnconfirmed?: boolean }
  | { ok: false; error: string; emailUnconfirmed?: boolean };

type TrecResult = {
  found: boolean;
  approved: boolean;
  licenseNumber: string | null;
  licenseType: string | null;
  accountKind: "broker" | "agent" | null;
  fullName: string | null;
  status: string | null;
  sponsorLicenseNumber: string | null;
  sponsorName: string | null;
  reason: string | null;
};

function RealAuthForm({
  signInWithPassword,
  signUp,
  resetPasswordForEmail,
  onDone,
}: {
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    opts: {
      fullName: string;
      accountKind: "consumer" | "pro" | "broker";
      professionalRole?: ProRole;
      trecLicense?: string;
      trecStatus?: string;
      sponsorLicenseNumber?: string;
      sponsorName?: string;
    },
  ) => Promise<AuthResult>;
  resetPasswordForEmail: (email: string) => Promise<AuthResult>;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<AuthFormMode>("signin");
  const [signInEmail, setSignInEmail] = useState(readStashedLoginEmail);
  const [email, setEmail] = useState(signInEmail);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [accountKind, setAccountKind] = useState<"consumer" | "pro" | "broker">(
    "consumer",
  );
  const [proRole, setProRole] = useState<ProRole>("realtor_broker");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // TREC license verification (realtors + brokers)
  const [license, setLicense] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<TrecResult | null>(null);

  // Realtors and brokers must verify an active TREC license to be approved.
  const requiresLicense =
    accountKind === "broker" ||
    (accountKind === "pro" && proRole === "realtor_broker");

  async function verifyLicense() {
    setVerified(null);
    setError("");
    if (!license.trim()) {
      setError("Enter your TREC license number to verify.");
      return;
    }
    setVerifying(true);
    try {
      const lastName = fullName.trim().split(/\s+/).slice(-1)[0] ?? "";
      const res = await fetch(
        `/api/verify-trec?license=${encodeURIComponent(license.trim())}` +
          (lastName ? `&lastName=${encodeURIComponent(lastName)}` : ""),
      );
      const data = (await res.json()) as TrecResult & { error?: string };
      if (data.error) {
        setError(data.error);
        return;
      }
      setVerified(data);
    } catch {
      setError("Couldn't reach the TREC verification service. Try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (mode === "reset") {
      setBusy(true);
      await resetPasswordForEmail(email);
      setBusy(false);
      setNotice(GENERIC_AUTH_SENT);
      return;
    }

    if (mode === "signup" && requiresLicense && !verified?.approved) {
      setError(
        "Please verify an ACTIVE TREC license before creating a pro account.",
      );
      return;
    }

    setBusy(true);
    // TREC is the source of truth for realtor/broker classification.
    const resolvedKind =
      mode === "signup" && requiresLicense && verified?.accountKind
        ? verified.accountKind === "broker"
          ? "broker"
          : "pro"
        : accountKind;
    const result =
      mode === "signin"
        ? await signInWithPassword(email, password)
        : await signUp(email, password, {
            fullName,
            accountKind: resolvedKind,
            professionalRole:
              resolvedKind === "pro" ? proRole : undefined,
            trecLicense: verified?.licenseNumber ?? undefined,
            sponsorLicenseNumber: verified?.sponsorLicenseNumber ?? undefined,
            sponsorName: verified?.sponsorName ?? undefined,
          });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      if (result.emailUnconfirmed) {
        setNotice("Confirm your email to continue. Check your inbox for the link.");
      }
      return;
    }
    if (mode === "signup" || result.emailUnconfirmed) {
      setNotice(
        "Check your email to confirm this account. We will not open your home until that mailbox is confirmed.",
      );
      setSignInEmail(email.trim());
      setPassword("");
      setFullName("");
      setLicense("");
      setVerified(null);
      setMode("signin");
      return;
    }
    onDone();
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-hairline bg-[var(--surface)] px-4 text-sm text-ink outline-none focus:border-gold";

  function switchMode(next: AuthFormMode) {
    const nextState = draftAfterModeChange({
      next,
      leaving: mode,
      draft: { email, password, fullName, license },
      signInEmail,
    });
    setSignInEmail(nextState.signInEmail);
    setEmail(nextState.draft.email);
    setPassword(nextState.draft.password);
    setFullName(nextState.draft.fullName);
    setLicense(nextState.draft.license);
    setVerified(null);
    setAccountKind("consumer");
    setProRole("realtor_broker");
    setMode(next);
    setError("");
    setNotice("");
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-3 rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <div className="flex gap-2">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={cn(
              "h-9 flex-1 rounded-lg text-sm font-semibold",
              mode === m
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "border border-hairline text-ink",
            )}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      {mode === "signup" && (
        <>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            autoComplete="name"
            className={inputCls}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={accountKind}
              onChange={(e) =>
                setAccountKind(e.target.value as "consumer" | "pro" | "broker")
              }
              className={inputCls}
            >
              <option value="consumer">Buyer / Consumer</option>
              <option value="pro">Agent / Pro</option>
              <option value="broker">Broker of Record</option>
            </select>
            {accountKind === "pro" && (
              <select
                value={proRole}
                onChange={(e) => setProRole(e.target.value as ProRole)}
                className={inputCls}
              >
                {(
                  [
                    "realtor_broker",
                    "inspector",
                    "appraiser",
                    "lender",
                  ] as ProRole[]
                ).map((r) => (
                  <option key={r} value={r}>
                    {PRO_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            )}
          </div>

          {requiresLicense && (
            <div className="rounded-xl border border-gold/40 bg-gold/5 p-3">
              <label className="block text-xs font-semibold text-ink">
                TREC license #{" "}
                <span className="font-normal text-[var(--muted)]">
                  (required for realtors &amp; brokers)
                </span>
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  value={license}
                  onChange={(e) => {
                    setLicense(e.target.value);
                    setVerified(null);
                  }}
                  placeholder="e.g. 724479"
                  autoComplete="off"
                  className={inputCls}
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={verifyLicense}
                  disabled={verifying}
                  className="h-11 shrink-0 rounded-xl border border-gold px-4 text-sm font-bold text-gold disabled:opacity-60"
                >
                  {verifying ? "Verifying…" : "Verify"}
                </button>
              </div>
              {verified &&
                (verified.approved ? (
                  <div className="mt-2 rounded-lg border border-teal-soft/40 bg-teal-soft/10 p-2.5 text-xs text-ink">
                    <p className="font-semibold text-teal-soft">
                      ✓ Verified — Active
                    </p>
                    <p className="mt-0.5">
                      {verified.fullName} · {verified.licenseType}
                    </p>
                    {verified.sponsorName && (
                      <p className="text-[var(--muted)]">
                        Sponsoring broker: {verified.sponsorName}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-red-400/40 bg-red-400/10 p-2.5 text-xs text-ink">
                    <p className="font-semibold text-red-300">✗ Not approved</p>
                    <p className="mt-0.5">
                      {verified.reason ??
                        (verified.found
                          ? "License is not Active."
                          : "No TREC license found.")}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete={mode === "signup" ? "email" : "username"}
        className={inputCls}
        required
      />
      {mode !== "reset" && (
        <div className="space-y-2">
          <input
            key={`${mode}-password`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            name={mode === "signup" ? "new-password" : "current-password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className={inputCls}
            required
            minLength={6}
          />
          {mode === "signup" && (
            <PasswordStrengthMeter
              password={password}
              name={fullName}
              email={email}
            />
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
      {notice && <p className="text-sm text-teal-soft">{notice}</p>}

      <button
        type="submit"
        disabled={
          busy ||
          (mode === "signup" && requiresLicense && !verified?.approved)
        }
        className="h-11 w-full rounded-xl bg-gold text-sm font-bold text-navy disabled:opacity-60"
      >
        {busy
          ? "Working…"
          : mode === "reset"
            ? "Send reset email"
            : mode === "signin"
              ? "Sign in"
              : requiresLicense && !verified?.approved
                ? "Verify license to continue"
                : "Create account"}
      </button>

      {mode !== "signup" && (
        <button
          type="button"
          onClick={() => switchMode(mode === "reset" ? "signin" : "reset")}
          className="w-full text-center text-xs font-semibold text-gold hover:underline"
        >
          {mode === "reset" ? "Back to sign in" : "Forgot password"}
        </button>
      )}
    </form>
  );
}
