"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { findSellerListingByCode } from "@/lib/seller-portal";

export function SellerAccessForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const listing = findSellerListingByCode(code);
    if (!listing) {
      setError("Code not found. Check with your agent for the latest access code.");
      return;
    }
    if (listing.status === "sold") {
      setError("This listing is sold — seller access has expired.");
      return;
    }
    router.push(`/seller/portal/${listing.accessCode.toLowerCase()}`);
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label className="mb-2 block font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
          Client access code
        </label>
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
          placeholder="e.g. WILLOW-875"
          className="h-12 w-full rounded-xl border border-hairline bg-[var(--surface)] px-4 font-mono text-sm uppercase tracking-wide text-ink outline-none focus:border-navy"
          autoComplete="off"
        />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        className="h-12 w-full rounded-xl bg-navy text-sm font-semibold text-paper transition-opacity hover:opacity-90"
      >
        View my listing performance
      </button>
      <p className="text-center font-mono text-[11px] text-[var(--muted)]">
        Demo codes: WILLOW-875 · RIDGE-1245
      </p>
    </form>
  );
}
