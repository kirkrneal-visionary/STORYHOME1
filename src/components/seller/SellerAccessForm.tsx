"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { findSellerListingByCode } from "@/lib/seller-portal";

const DEMO_CODES = ["WILLOW-875", "RIDGE-1245"] as const;

export function SellerAccessForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function resolvePath(rawCode: string) {
    const listing = findSellerListingByCode(rawCode);
    if (!listing) {
      setError(
        "Code not found. Check with your agent for the latest access code.",
      );
      return null;
    }
    if (listing.status === "sold" || listing.status === "withdrawn") {
      setError("This listing is sold or withdrawn — seller access has expired.");
      return null;
    }
    return `/seller/portal/${listing.accessCode.toLowerCase()}`;
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const path = resolvePath(code);
    if (!path) return;
    setPending(true);
    setError("");
    router.push(path);
  }

  return (
    <div className="mt-8 space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="seller-access-code"
            className="mb-2 block font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase"
          >
            Client access code
          </label>
          <input
            id="seller-access-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError("");
            }}
            placeholder="e.g. WILLOW-875"
            className="h-12 w-full rounded-xl border border-hairline bg-[var(--surface)] px-4 font-mono text-sm tracking-wide text-ink outline-none focus:border-gold"
            autoComplete="off"
            autoCapitalize="characters"
            inputMode="text"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || code.trim().length < 3}
          className="h-12 w-full rounded-xl bg-gold text-sm font-bold text-navy transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Opening portal…" : "View my listing performance"}
        </button>
      </form>

      <div className="pt-2">
        <p className="mb-2 text-center font-mono text-[11px] text-[var(--muted)]">
          Tap a demo code to enter instantly
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_CODES.map((demo) => (
            <Link
              key={demo}
              href={`/seller/portal/${demo.toLowerCase()}`}
              className="flex h-11 items-center justify-center rounded-xl border border-hairline bg-[var(--surface)] font-mono text-xs font-semibold tracking-wide text-gold transition-colors hover:border-gold/50"
            >
              {demo}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
