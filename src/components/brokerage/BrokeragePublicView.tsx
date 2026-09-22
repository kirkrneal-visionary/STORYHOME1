"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, MapPin, Phone } from "lucide-react";
import {
  getBrokerageBySlug,
  listBrokerageAgents,
  type Brokerage,
  type BrokerageAgent,
} from "@/lib/supabase/brokerage";
import { PRO_ROLE_LABELS, type ProRole } from "@/lib/auth";
import { PublicMiss } from "@/components/story/PublicMiss";
import { StoryEmptyWell } from "@/components/story/StoryEmptyWell";

export type BrokerageWorldFixture = {
  brokerage: Brokerage;
  agents: BrokerageAgent[];
};

export function BrokeragePublicView({
  slug,
  fixture,
}: {
  slug?: string;
  fixture?: BrokerageWorldFixture;
}) {
  const [brokerage, setBrokerage] = useState<Brokerage | null>(
    fixture?.brokerage ?? null,
  );
  const [agents, setAgents] = useState<BrokerageAgent[]>(fixture?.agents ?? []);
  const [loading, setLoading] = useState(!fixture);

  useEffect(() => {
    if (fixture || !slug) return;
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
  }, [slug, fixture]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-[calc(var(--story-safe-top)+2rem)] text-sm text-[var(--muted)]">
        Loading…
      </div>
    );
  }
  if (!brokerage) {
    return (
      <PublicMiss
        title="This page isn’t available."
        body="The link may be wrong, or the page may no longer exist."
      />
    );
  }

  const place = [brokerage.city, brokerage.state].filter(Boolean).join(", ");
  const street = [brokerage.address, brokerage.zip].filter(Boolean).join(" · ");

  return (
    <main
      data-ui-3b="organization-world"
      data-story-brokerage-world
      className="min-h-dvh pb-[var(--story-bottom-clearance)] pt-[var(--story-safe-top)]"
    >
      <div
        data-brokerage-cover-fallback=""
        className="relative h-24 overflow-hidden [@media(max-height:499px)]:h-14 md:h-32"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[var(--env-1)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,rgba(245,183,30,0.1),transparent_46%),radial-gradient(ellipse_at_88%_10%,rgba(18,63,56,0.34),transparent_50%),linear-gradient(180deg,transparent_28%,var(--background)_100%)]" />
      </div>

      <div className="relative z-[1] mx-auto max-w-3xl px-4 md:px-8">
        <section
          className="-mt-10 flex flex-col gap-6 md:-mt-12"
          aria-labelledby="brokerage-world-name"
        >
          <div className="flex items-end gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-[var(--surface)] ring-2 ring-gold/25 ring-offset-2 ring-offset-[var(--background)]">
              {brokerage.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brokerage.logoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-8 w-8 text-[var(--muted)]" aria-hidden />
              )}
            </div>
            <div className="min-w-0 pb-1">
              <h1
                id="brokerage-world-name"
                className="type-page-title tracking-[-0.02em] text-ink"
              >
                {brokerage.name}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted)]">
                <span>Brokerage</span>
                {place ? (
                  <>
                    <span aria-hidden className="text-hairline">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin
                        className="h-3.5 w-3.5 text-[var(--muted)]"
                        aria-hidden
                      />
                      {place}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div
            className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:flex-wrap md:items-center"
            data-brokerage-world-ctas
          >
            <Link
              href="/marketplace"
              className="story-press story-cta-primary w-full md:w-auto"
              data-brokerage-world-cta="marketplace"
            >
              Browse marketplace
            </Link>
            {brokerage.website ? (
              <a
                href={brokerage.website}
                target="_blank"
                rel="noreferrer"
                className="story-press story-cta-secondary w-full md:w-auto"
                data-brokerage-world-cta="website"
              >
                Website
              </a>
            ) : null}
          </div>

          {brokerage.phone ? (
            <a
              href={`tel:${brokerage.phone}`}
              className="story-press inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-gold"
              data-brokerage-world-cta="phone"
            >
              <Phone className="h-4 w-4" aria-hidden />
              {brokerage.phone}
            </a>
          ) : null}
        </section>

        {brokerage.about ? (
          <p
            className="mt-8 max-w-2xl text-base leading-relaxed text-[var(--muted)]"
            data-brokerage-world-about
          >
            {brokerage.about}
          </p>
        ) : null}

        {street ? (
          <p className="mt-4 text-sm text-[var(--muted)]">{street}</p>
        ) : null}

        <section
          className="mt-10"
          aria-labelledby="brokerage-world-professionals"
          data-brokerage-world-professionals
        >
          <h2 id="brokerage-world-professionals" className="type-section text-ink">
            Professionals
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Public professionals with this brokerage
          </p>
          {agents.length === 0 ? (
            <div data-brokerage-world-professionals-empty className="mt-4">
              <StoryEmptyWell
                title="No public professionals yet"
                body="When professionals are public on this brokerage, they appear here."
              />
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-hairline">
              {agents.map((agent) => {
                const role = agent.professionalRole
                  ? (PRO_ROLE_LABELS[agent.professionalRole as ProRole] ??
                    agent.professionalRole.replace(/_/g, " "))
                  : "Professional";
                return (
                  <li key={agent.id}>
                    <Link
                      href={`/agents/${agent.id}`}
                      className="story-press flex min-h-11 items-center gap-3 py-3 hover:text-gold"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--gold)_22%,var(--paper))] text-xs font-bold text-navy">
                        {agent.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={agent.photoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          agent.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">
                          {agent.fullName}
                        </span>
                        <span className="block truncate text-sm text-[var(--muted)]">
                          {role}
                          {agent.primaryMarketCity
                            ? ` · ${agent.primaryMarketCity}`
                            : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p
          data-brokerage-world-ending
          className="mt-10 border-t border-hairline pt-6 pb-2 md:mt-14 md:pt-8"
        >
          <Link
            href="/"
            className="story-press inline-flex min-h-11 items-center text-sm font-medium text-[var(--muted)] hover:text-gold"
          >
            Story Home
          </Link>
        </p>
      </div>
    </main>
  );
}
