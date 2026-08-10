"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star, Users } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { PRO_ROLE_LABELS, type ProRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Pro = {
  id: string;
  fullName: string;
  initials: string;
  accountKind: string;
  professionalRole: string | null;
  primaryMarketCity: string | null;
  starRating: number | null;
  reviewCount: number;
};

const ROLE_FILTERS = ["All", "broker", "realtor_broker", "lender", "inspector", "appraiser"] as const;

export function NetworkView() {
  const [pros, setPros] = useState<Pro[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("All");

  useEffect(() => {
    const s = getBrowserSupabase();
    if (!s) {
      setLoading(false);
      return;
    }
    let active = true;
    s.from("profiles")
      .select("id, full_name, initials, account_kind, professional_role, primary_market_city, star_rating, review_count")
      .in("account_kind", ["agent", "broker"])
      .then(({ data }) => {
        if (!active) return;
        /* eslint-disable @typescript-eslint/no-explicit-any */
        setPros((data ?? []).map((r: any) => ({
          id: r.id,
          fullName: r.full_name || "Professional",
          initials: r.initials || (r.full_name || "P").slice(0, 2).toUpperCase(),
          accountKind: r.account_kind,
          professionalRole: r.professional_role,
          primaryMarketCity: r.primary_market_city,
          starRating: r.star_rating,
          reviewCount: r.review_count ?? 0,
        })));
        /* eslint-enable @typescript-eslint/no-explicit-any */
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    if (role === "All") return pros;
    if (role === "broker") return pros.filter((p) => p.accountKind === "broker");
    return pros.filter((p) => p.professionalRole === role);
  }, [pros, role]);

  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6 md:pb-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-serif text-3xl font-bold text-ink">Network</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Directory of verified Story Home professionals.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "h-8 rounded-full border px-3 font-mono text-[11px] font-semibold uppercase",
                role === r
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                  : "border-hairline text-[var(--muted)] hover:text-ink",
              )}
            >
              {r === "All" ? "All" : r === "realtor_broker" ? "Realtor" : r}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-[var(--muted)]">Loading professionals…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-hairline bg-[var(--surface)] p-12 text-center">
            <Users className="h-8 w-8 text-[var(--muted)]" />
            <p className="text-sm font-semibold text-ink">No professionals yet</p>
            <p className="text-xs text-[var(--muted)]">
              Verified realtors, brokers, lenders, appraisers, and inspectors will appear here as they join.
            </p>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-hairline rounded-xl border border-hairline bg-[var(--surface)]">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] text-sm font-bold text-navy">
                    {p.initials}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/agents/${p.id}`} className="truncate font-semibold text-ink hover:underline">
                      {p.fullName}
                    </Link>
                    <p className="font-mono text-[11px] text-[var(--muted)] uppercase">
                      {p.accountKind === "broker"
                        ? "Broker"
                        : p.professionalRole
                          ? PRO_ROLE_LABELS[p.professionalRole as ProRole] ?? p.professionalRole
                          : "Agent"}
                      {p.primaryMarketCity ? ` · ${p.primaryMarketCity}` : ""}
                    </p>
                  </div>
                </div>
                {p.starRating != null && p.reviewCount > 0 && (
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-[var(--muted)]">
                    <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                    {p.starRating.toFixed(2)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
