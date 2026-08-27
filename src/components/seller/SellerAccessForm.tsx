"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { fetchSellerPortalByCode } from "@/lib/supabase/listings";
import { TERMINAL_STATUSES } from "@/lib/seller-portal";

export function SellerAccessForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = code.trim();
    if (raw.length < 3) return;
    setPending(true);
    setError("");
    try {
      const portal = await fetchSellerPortalByCode(raw);
      if (!portal) {
        setError(
          "Code not found. Check with your agent for the latest access code.",
        );
        return;
      }
      if (TERMINAL_STATUSES.has(portal.listing.status)) {
        setError(
          "This listing is sold or withdrawn — seller access has expired.",
        );
        return;
      }
      router.push(`/seller/portal/${portal.listing.accessCode.toLowerCase()}`);
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setPending(false);
    }
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
            placeholder="Listing access code"
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

      <p className="text-center text-xs leading-relaxed text-[var(--muted)]">
        Your agent generates this code from their Story Pro listing and shares it
        with you. It stays active while the home is on the market.
      </p>
    </div>
  );
}
