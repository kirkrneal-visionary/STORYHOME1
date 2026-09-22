"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { LivingMarkPresence } from "@/components/agents/LivingMarkPresence";
import { AgentWorldAnalyticsCard } from "@/components/agents/AgentWorldAnalyticsCard";
import { AgentWorldShareButton } from "@/components/agents/AgentWorldShareButton";
import { StoryWalkComposer } from "@/components/agents/StoryWalkComposer";
import { StoryEmptyWell } from "@/components/story/StoryEmptyWell";
import type { DemoAgent, DemoListing } from "@/lib/demo-data";
import { ListingCard } from "@/components/ListingCard";
import {
  emptyAgentWorldSummary,
  loadAgentWorldSummary,
  recordAgentWorldEngagement,
} from "@/lib/living-mark/engagement";
import type { AgentWorldSummary } from "@/lib/living-mark/engagement-types";
import type { EngagementCta } from "@/lib/living-mark/engagement-types";

type AgentWorldViewProps = {
  agent: DemoAgent;
  listings: DemoListing[];
};

/**
 * UI-3A — public Professional person-world. Capabilities stay; composition
 * is Story Home identity, not a County page and not a card wall.
 */
export function AgentWorldView({ agent, listings }: AgentWorldViewProps) {
  const { user } = useAuth();
  const visitorUserId = user?.id ?? null;
  const isOwn = Boolean(visitorUserId && visitorUserId === agent.id);
  const roleLabel =
    agent.professionalRole.replace(/_/g, " ").trim() || "Agent";
  const listingsHref = `/marketplace?agent=${encodeURIComponent(agent.id)}`;
  const hasListings = listings.length > 0;
  const [summary, setSummary] = useState<AgentWorldSummary>(
    emptyAgentWorldSummary(),
  );

  useEffect(() => {
    void recordAgentWorldEngagement({
      agentId: agent.id,
      event: "world_viewed",
      visitorUserId,
    });
  }, [agent.id, visitorUserId]);

  useEffect(() => {
    if (!isOwn) return;
    void loadAgentWorldSummary(agent.id).then(setSummary);
    const t = window.setInterval(() => {
      void loadAgentWorldSummary(agent.id).then(setSummary);
    }, 2500);
    return () => window.clearInterval(t);
  }, [isOwn, agent.id]);

  function onCta(cta: EngagementCta) {
    void recordAgentWorldEngagement({
      agentId: agent.id,
      event: "cta_clicked",
      visitorUserId,
      cta,
    }).then(() => {
      if (isOwn) void loadAgentWorldSummary(agent.id).then(setSummary);
    });
  }

  return (
    <main
      data-story-agent-world
      data-agent-world-polish="aw-1"
      data-ui-3a="professional-identity"
      data-agent-world-audience={isOwn ? "own" : "visitor"}
      className="min-h-dvh pb-[var(--story-bottom-clearance)] pt-[var(--story-safe-top)]"
    >
      <div
        className="agent-world-atmosphere relative h-28 overflow-hidden [@media(max-height:499px)]:h-16 md:h-36"
        data-agent-world-atmosphere
        aria-hidden
      >
        <div className="absolute inset-0 bg-[var(--env-1)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(245,183,30,0.16),transparent_48%),radial-gradient(circle_at_88%_0%,rgba(18,63,56,0.42),transparent_42%),linear-gradient(180deg,transparent_36%,var(--background)_100%)]" />
        <div className="agent-world-atmosphere-sheen absolute inset-0 opacity-50" />
      </div>

      <div className="relative z-[1] mx-auto max-w-4xl px-4 md:px-8">
        <section
          className="-mt-12 flex flex-col gap-6 md:-mt-14 md:flex-row md:items-end md:justify-between md:gap-8 [@media(max-height:499px)]:-mt-8"
          aria-labelledby="agent-world-name"
        >
          <div className="flex items-end gap-4 md:gap-5">
            <LivingMarkPresence
              agentId={agent.id}
              photoUrl={agent.photoUrl}
              videoUrl={agent.livingMarkVideoUrl}
              initials={agent.initials}
              name={agent.fullName}
              tone={agent.avatarTone}
            />
            <div className="min-w-0 pb-1">
              <h1
                id="agent-world-name"
                className="type-page-title tracking-[-0.02em] text-ink"
              >
                {agent.fullName}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted)]">
                <span className="capitalize">{roleLabel}</span>
                <span aria-hidden className="text-hairline">
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[var(--muted)]" aria-hidden />
                  {agent.primaryMarketCity}
                </span>
              </p>
            </div>
          </div>

          <div
            className="flex w-full flex-col gap-3 md:w-auto md:items-end"
            data-agent-world-ctas
            data-agent-world-cta-mode={isOwn ? "own" : "visitor"}
          >
            <Link
              href={listingsHref}
              onClick={() => onCta("listings")}
              className="story-press story-cta-primary w-full md:w-auto"
              data-agent-world-cta="listings"
            >
              {hasListings ? "View listings" : "Browse marketplace"}
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {hasListings ? (
                <a
                  href="#agent-listings"
                  onClick={() => onCta("inventory")}
                  className="story-press story-cta-secondary"
                  data-agent-world-cta="inventory"
                >
                  On this world
                </a>
              ) : null}
              <AgentWorldShareButton
                agentId={agent.id}
                agentName={agent.fullName}
                marketCity={agent.primaryMarketCity}
                roleLabel={roleLabel}
                isOwn={isOwn}
              />
              {isOwn ? (
                <Link
                  href="/network"
                  onClick={() => onCta("find_agents")}
                  className="story-press inline-flex min-h-11 items-center justify-center px-3 text-sm font-medium text-[var(--muted)] hover:text-ink"
                  data-agent-world-cta="find_agents"
                >
                  Find agents
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section
          className="mt-8 border-y border-hairline py-5 md:mt-10"
          data-agent-world-trust
          aria-label="Public reputation"
        >
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-sm text-[var(--muted)]">Reputation</p>
              <p className="type-page-title text-ink">
                {agent.reputationScore || "—"}
              </p>
            </div>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-[var(--muted)]">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />
                <span className="font-mono text-ink">
                  {agent.starRating > 0 ? agent.starRating.toFixed(2) : "—"}
                </span>
              </span>
              <span>
                {agent.reviewCount} review{agent.reviewCount === 1 ? "" : "s"}
              </span>
              <span aria-hidden>·</span>
              <span>
                {listings.length} listing{listings.length === 1 ? "" : "s"}
              </span>
            </p>
          </div>
        </section>

        {isOwn ? <AgentWorldAnalyticsCard summary={summary} /> : null}

        {isOwn ? (
          <StoryWalkComposer
            agentId={agent.id}
            agentName={agent.fullName}
            marketCity={agent.primaryMarketCity}
            roleLabel={roleLabel}
            photoUrl={agent.photoUrl}
            livingMarkVideoUrl={agent.livingMarkVideoUrl}
            listings={listings}
          />
        ) : null}

        {agent.bio ? (
          <p
            className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--muted)]"
            data-agent-world-bio
          >
            {agent.bio}
          </p>
        ) : (
          <p
            className="mt-6 max-w-2xl text-sm leading-relaxed text-[var(--muted)]"
            data-agent-world-bio="empty"
          >
            {isOwn
              ? "Add a short bio in Settings so visitors know your world at a glance."
              : "This agent hasn’t published a bio yet — explore their listings below."}
          </p>
        )}

        <section
          id="agent-listings"
          className="mt-10 scroll-mt-28"
          data-agent-world-listings
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="type-section text-ink">Listings</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Homes on this Agent World
              </p>
            </div>
            {hasListings ? (
              <Link
                href={listingsHref}
                onClick={() => onCta("listings")}
                className="shrink-0 text-sm font-semibold text-gold hover:underline"
              >
                Open in marketplace
              </Link>
            ) : null}
          </div>
          {hasListings ? (
            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div data-agent-world-listings-empty className="mt-4">
              <StoryEmptyWell
                title="No active listings yet"
                body={
                  isOwn
                    ? "When you publish inventory, it appears here for visitors — and feeds your Story Walk film."
                    : "Check back soon, or browse the wider marketplace for homes in this market."
                }
              >
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <Link
                    href={
                      isOwn
                        ? `/settings?from=${encodeURIComponent(`/agents/${agent.id}`)}`
                        : "/marketplace"
                    }
                    onClick={() => onCta("listings")}
                    className={
                      isOwn
                        ? "story-press story-cta-secondary"
                        : "story-press story-cta-primary"
                    }
                  >
                    {isOwn ? "Open Settings" : "Browse marketplace"}
                  </Link>
                  {!isOwn ? (
                    <AgentWorldShareButton
                      agentId={agent.id}
                      agentName={agent.fullName}
                      marketCity={agent.primaryMarketCity}
                      roleLabel={roleLabel}
                      isOwn={false}
                    />
                  ) : null}
                </div>
              </StoryEmptyWell>
            </div>
          )}
        </section>

        <p
          data-agent-world-ending
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
