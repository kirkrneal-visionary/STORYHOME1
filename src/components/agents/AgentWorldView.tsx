"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { LivingMarkPresence } from "@/components/agents/LivingMarkPresence";
import { AgentWorldAnalyticsCard } from "@/components/agents/AgentWorldAnalyticsCard";
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
 * STORY-WALK SW-1…SW-5 — Agent World + Living Mark + agent analytics slice.
 */
export function AgentWorldView({ agent, listings }: AgentWorldViewProps) {
  const { user } = useAuth();
  const visitorUserId = user?.id ?? null;
  const isOwn = Boolean(visitorUserId && visitorUserId === agent.id);
  const roleLabel =
    agent.professionalRole.replace(/_/g, " ").trim() || "Agent";
  const listingsHref = `/marketplace?agent=${encodeURIComponent(agent.id)}`;
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
    <div
      data-story-agent-world
      className="min-h-dvh pb-[var(--story-bottom-clearance)] pt-[var(--story-safe-top)]"
    >
      {/* Atmosphere band — world, not a FB cover photo clone */}
      <div className="relative h-36 overflow-hidden md:h-44">
        <div className="absolute inset-0 bg-[var(--env-1)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(245,183,30,0.2),transparent_48%),radial-gradient(circle_at_88%_0%,rgba(18,63,56,0.42),transparent_42%),linear-gradient(180deg,transparent_40%,var(--background)_100%)]" />
      </div>

      <div className="relative z-[1] mx-auto max-w-6xl px-4 md:px-6">
        {/* Living Mark + identity */}
        <div className="-mt-14 flex flex-col gap-6 md:-mt-16 md:flex-row md:items-end md:justify-between">
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
              <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-gold uppercase">
                Agent World
              </p>
              <h1 className="font-serif text-3xl font-bold tracking-[-0.02em] text-ink md:text-4xl">
                {agent.fullName}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted)]">
                <span className="capitalize">{roleLabel}</span>
                <span aria-hidden className="text-hairline">
                  ·
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-gold/80" aria-hidden />
                  {agent.primaryMarketCity}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={listingsHref}
              onClick={() => onCta("listings")}
              className="story-press inline-flex h-11 items-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
            >
              View listings
            </Link>
            <a
              href="#agent-listings"
              onClick={() => onCta("inventory")}
              className="story-press inline-flex h-11 items-center rounded-full border border-hairline bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] px-5 text-sm font-semibold text-ink backdrop-blur-sm"
            >
              Inventory
            </a>
            <Link
              href="/network"
              onClick={() => onCta("find_agents")}
              className="story-press inline-flex h-11 items-center rounded-full border border-hairline px-5 text-sm font-semibold text-[var(--muted)] hover:text-ink"
            >
              Find agents
            </Link>
          </div>
        </div>

        {/* Trust strip */}
        <div className="story-glass mt-8 flex flex-wrap items-end gap-8 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--muted)] uppercase">
              Reputation
            </p>
            <p className="font-serif text-4xl font-bold text-ink md:text-5xl">
              {agent.reputationScore || "—"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 pb-1 text-sm text-[var(--muted)]">
            <Star className="h-4 w-4 fill-gold text-gold" aria-hidden />
            <span className="font-mono text-ink">
              {agent.starRating > 0 ? agent.starRating.toFixed(2) : "—"}
            </span>
            <span>· {agent.reviewCount} reviews</span>
          </div>
          <div className="pb-1 font-mono text-[11px] tracking-wide text-[var(--muted)] uppercase md:ml-auto">
            {listings.length} listing{listings.length === 1 ? "" : "s"}
          </div>
        </div>

        {isOwn ? <AgentWorldAnalyticsCard summary={summary} /> : null}

        {agent.bio ? (
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
            {agent.bio}
          </p>
        ) : (
          <p className="mt-6 max-w-2xl text-sm text-[var(--muted)]">
            Every home has a story — and every agent has a world on StoryHome.
          </p>
        )}

        {/* Inventory presence */}
        <section id="agent-listings" className="mt-10 scroll-mt-28">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-serif text-2xl font-bold text-ink">Listings</h2>
            {listings.length > 0 ? (
              <Link
                href={listingsHref}
                onClick={() => onCta("listings")}
                className="text-sm font-semibold text-gold hover:underline"
              >
                Open in marketplace
              </Link>
            ) : null}
          </div>
          {listings.length === 0 ? (
            <p className="story-well mt-4 border-dashed p-8 text-center text-sm text-[var(--muted)]">
              No active listings yet.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
