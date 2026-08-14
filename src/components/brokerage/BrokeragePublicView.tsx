"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Globe, MapPin, Phone } from "lucide-react";
import {
  getBrokerageBySlug,
  listBrokerageAgents,
  type Brokerage,
  type BrokerageAgent,
} from "@/lib/supabase/brokerage";
import { PRO_ROLE_LABELS, type ProRole } from "@/lib/auth";

export function BrokeragePublicView({ slug }: { slug: string }) {
  const [brokerage, setBrokerage] = useState<Brokerage | null>(null);
  const [agents, setAgents] = useState<BrokerageAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const b = await getBrokerageBySlug(slug);
        if (!active) return;
        setBrokerage(b);
        if (b) setAgents(await listBrokerageAgents(b.id));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 pt-[calc(var(--story-safe-top)+2rem)] text-sm text-[var(--muted)]">Loading brokerage…</div>;
  }
  if (!brokerage) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+2rem)] text-center">
        <h1 className="font-serif text-3xl font-bold text-ink">Brokerage not found</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">This brokerage page doesn&apos;t exist yet.</p>
        <Link href="/marketplace" className="mt-6 inline-flex h-11 items-center rounded-xl bg-gold px-5 text-sm font-bold text-navy">Browse listings</Link>
      </div>
    );
  }

  const location = [brokerage.address, brokerage.city, brokerage.state, brokerage.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-4xl px-4 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+1.5rem)] md:px-6">
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-[var(--surface)]">
          {brokerage.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={brokerage.logoUrl} alt={brokerage.name} className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-8 w-8 text-[var(--muted)]" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-serif text-3xl font-bold text-ink md:text-4xl">{brokerage.name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
            {location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {location}</span>}
            {brokerage.phone && <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" /> {brokerage.phone}</span>}
            {brokerage.website && (
              <a href={brokerage.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gold hover:underline">
                <Globe className="h-4 w-4" /> Website
              </a>
            )}
          </div>
        </div>
      </div>

      {brokerage.about && (
        <section className="mt-6 rounded-2xl border border-hairline bg-[var(--surface)] p-5">
          <h2 className="font-serif text-lg font-bold text-ink">About the brokerage</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-[var(--muted)]">{brokerage.about}</p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-serif text-lg font-bold text-ink">
          Agents{agents.length ? ` (${agents.length})` : ""}
        </h2>
        {agents.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">No agents on the roster yet.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {agents.map((a) => (
              <Link
                key={a.id}
                href={`/agents/${a.id}`}
                className="flex items-center gap-3 rounded-xl border border-hairline bg-[var(--surface)] p-3 hover:border-gold/40"
              >
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-hairline bg-[var(--background)]">
                  {a.photoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={a.photoUrl} alt={a.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-[var(--muted)]">
                      {a.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{a.fullName}</p>
                  <p className="font-mono text-[10px] uppercase text-[var(--muted)]">
                    {a.professionalRole
                      ? PRO_ROLE_LABELS[a.professionalRole as ProRole] ?? a.professionalRole
                      : "Agent"}
                    {a.primaryMarketCity ? ` · ${a.primaryMarketCity}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
