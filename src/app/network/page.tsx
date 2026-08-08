import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Star } from "lucide-react";
import { DEMO_AGENT } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Network" };

const ROWS = [
  DEMO_AGENT,
  {
    ...DEMO_AGENT,
    id: "agent-2",
    fullName: "Priya Desai",
    initials: "PD",
    professionalRole: "lender",
    primaryMarketCity: "Denver, CO",
    starRating: 4.8,
    reputationScore: 91,
  },
  {
    ...DEMO_AGENT,
    id: "agent-3",
    fullName: "Marcus Cole",
    initials: "MC",
    professionalRole: "inspector",
    primaryMarketCity: "Austin, TX",
    starRating: 4.7,
    reputationScore: 88,
  },
];

export default function NetworkPage() {
  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6 md:pb-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-serif text-3xl font-bold text-ink">Network</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Directory of trusted professionals — denser scan view for Pros.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {["All", "agent", "broker", "lender", "inspector", "appraiser"].map(
            (role) => (
              <button
                key={role}
                type="button"
                className="h-8 rounded-full border border-hairline px-3 font-mono text-[11px] font-semibold uppercase text-[var(--muted)]"
              >
                {role}
              </button>
            ),
          )}
        </div>

        <ul className="mt-8 divide-y divide-hairline rounded-xl border border-hairline bg-[var(--surface)]">
          {ROWS.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-4 px-4 py-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] text-sm font-bold text-navy">
                  {row.initials}
                </div>
                <div className="min-w-0">
                  <Link
                    href={
                      row.id === DEMO_AGENT.id
                        ? `/agents/${DEMO_AGENT.id}`
                        : "/network"
                    }
                    className="truncate font-semibold text-ink hover:underline"
                  >
                    {row.fullName}
                  </Link>
                  <p className="font-mono text-[11px] text-[var(--muted)] uppercase">
                    {row.professionalRole} · {row.primaryMarketCity} · Score{" "}
                    {row.reputationScore}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 font-mono text-xs text-[var(--muted)]">
                  <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                  {row.starRating.toFixed(2)}
                </span>
                <Link
                  href="/messages"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink"
                  aria-label={`Message ${row.fullName}`}
                >
                  <MessageSquare className="h-4 w-4" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
