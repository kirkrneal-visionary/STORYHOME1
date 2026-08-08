"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { DEMO_ACCOUNTS, PRO_ROLE_LABELS, type ProRole } from "@/lib/auth";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const { loginAs, loginSellerWithCode, isLoggedIn, user, logout } = useAuth();
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
        Demo mode — pick an account type. Messages unlock after login. Buyers
        get Story Home Suites.
      </p>

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
