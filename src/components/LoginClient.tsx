"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import {
  DEMO_ACCOUNTS,
  DEMO_BROKER,
  PRO_ROLE_LABELS,
  type ProRole,
} from "@/lib/auth";
import { cn } from "@/lib/utils";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const {
    loginAs,
    loginSellerWithCode,
    isLoggedIn,
    user,
    logout,
    supabaseConfigured,
    signInWithPassword,
    signUp,
  } = useAuth();
  const [sellerCode, setSellerCode] = useState("");
  const [error, setError] = useState("");

  function goNext() {
    router.push(next);
  }

  function onSellerSubmit(e: FormEvent) {
    e.preventDefault();
    const result = loginSellerWithCode(sellerCode);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/seller/portal/${sellerCode.trim().toLowerCase()}`);
  }

  if (isLoggedIn && user) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-[96px] md:px-6">
        <h1 className="font-serif text-3xl font-bold text-ink">
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
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-[96px] md:px-6">
      <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
        Story Home access
      </p>
      <h1 className="mt-2 font-serif text-4xl font-bold text-ink">
        Log in to continue
      </h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        {supabaseConfigured
          ? "Sign in or create your account. Your data syncs across devices."
          : "Demo mode — pick an account type. Messages unlock after login. Buyers get Story Home Suites."}
      </p>

      {supabaseConfigured && (
        <RealAuthForm
          signInWithPassword={signInWithPassword}
          signUp={signUp}
          onDone={goNext}
        />
      )}

      {!supabaseConfigured && (
        <>
      <section className="mt-10">
        <h2 className="font-serif text-xl font-bold text-ink">
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
        <h2 className="font-serif text-xl font-bold text-ink">Pro accounts</h2>
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
        <h2 className="font-serif text-xl font-bold text-ink">
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
        <h2 className="font-serif text-xl font-bold text-ink">
          Seller (realtor passcode)
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Demo codes: WILLOW-875 · RIDGE-1245
        </p>
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

type AuthResult = { ok: true } | { ok: false; error: string };

function RealAuthForm({
  signInWithPassword,
  signUp,
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
    },
  ) => Promise<AuthResult>;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [accountKind, setAccountKind] = useState<"consumer" | "pro" | "broker">(
    "consumer",
  );
  const [proRole, setProRole] = useState<ProRole>("realtor_broker");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    const result =
      mode === "signin"
        ? await signInWithPassword(email, password)
        : await signUp(email, password, {
            fullName,
            accountKind,
            professionalRole: accountKind === "pro" ? proRole : undefined,
          });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (mode === "signup") {
      setNotice(
        "Account created. If email confirmation is enabled, confirm via email, then sign in.",
      );
      setMode("signin");
      return;
    }
    onDone();
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-hairline bg-[var(--surface)] px-4 text-sm text-ink outline-none focus:border-gold";

  return (
    <form onSubmit={submit} className="mt-8 space-y-3 rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <div className="flex gap-2">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError("");
              setNotice("");
            }}
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
        </>
      )}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className={inputCls}
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className={inputCls}
        required
        minLength={6}
      />

      {error && <p className="text-sm text-red-300">{error}</p>}
      {notice && <p className="text-sm text-teal-soft">{notice}</p>}

      <button
        type="submit"
        disabled={busy}
        className="h-11 w-full rounded-xl bg-gold text-sm font-bold text-navy disabled:opacity-60"
      >
        {busy
          ? "Working…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </button>
    </form>
  );
}
