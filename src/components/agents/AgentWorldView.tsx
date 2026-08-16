"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { LivingMarkPresence } from "@/components/agents/LivingMarkPresence";
import { AgentWorldAnalyticsCard } from "@/components/agents/AgentWorldAnalyticsCard";
import { AgentWorldShareButton } from "@/components/agents/AgentWorldShareButton";
import { StoryWalkComposer } from "@/components/agents/StoryWalkComposer";
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
 * STORY-WALK SW-1…SW-8 + AW-POLISH — Agent World visitor surface.
 * Own vs visitor share one shell; polish clarifies CTAs, trust, empty, mobile.
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
    <div
      data-story-agent-world
      data-agent-world-polish="aw-1"
      data-agent-world-audience={isOwn ? "own" : "visitor"}
      className="min-h-dvh pb-[var(--story-bottom-clearance)] pt-[var(--story-safe-top)]"
    >
      {/* Atmosphere band — world, not a FB cover photo clone */}
      <div
        className="relative h-36 overflow-hidden md:h-44"
        data-agent-world-atmosphere
        aria-hidden
      >
        <div className="absolute inset-0 bg-[var(--env-1)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(245,183,30,0.22),transparent_48%),radial-gradient(circle_at_88%_0%,rgba(18,63,56,0.45),transparent_42%),linear-gradient(180deg,transparent_36%,var(--background)_100%)]" />
        <div className="agent-world-atmosphere-sheen absolute inset-0 opacity-70" />
      </div>

      <div className="relative z-[1] mx-auto max-w-6xl px-4 md:px-6">
        {/* Living Mark + identity */}
        <div className="-mt-14 flex flex-col gap-5 md:-mt-16 md:flex-row md:items-end md:justify-between md:gap-6">
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

          {/* CTA cluster — one primary job; visitor vs own */}
          <div
            className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap"
            data-agent-world-ctas
            data-agent-world-cta-mode={isOwn ? "own" : "visitor"}
          >
            <Link
              href={listingsHref}
              onClick={() => onCta("listings")}
              className="story-press col-span-2 inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-contrast)] sm:col-span-1"
              data-agent-world-cta="listings"
            >
              {hasListings ? "View listings" : "Browse marketplace"}
            </Link>
            {hasListings ? (
              <a
                href="#agent-listings"
                onClick={() => onCta("inventory")}
                className="story-press inline-flex h-11 items-center justify-center rounded-full border border-hairline bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] px-5 text-sm font-semibold text-ink backdrop-blur-sm"
                data-agent-world-cta="inventory"
              >
                On this world
              </a>
            ) : null}
            <div className={hasListings ? "min-w-0" : "col-span-2 min-w-0 sm:col-span-1"}>
              <AgentWorldShareButton
                agentId={agent.id}
                agentName={agent.fullName}
                marketCity={agent.primaryMarketCity}
                roleLabel={roleLabel}
                isOwn={isOwn}
                className="w-full sm:w-auto"
              />
            </div>
            {isOwn ? (
              <Link
                href="/network"
                onClick={() => onCta("find_agents")}
                className="story-press inline-flex h-11 items-center justify-center rounded-full border border-hairline px-5 text-sm font-semibold text-[var(--muted)] hover:text-ink"
                data-agent-world-cta="find_agents"
              >
                Find agents
              </Link>
            ) : null}
          </div>
        </div>

        {/* Trust strip — compact on mobile */}
        <div
          className="story-glass mt-7 grid grid-cols-3 gap-3 px-4 py-3.5 sm:mt-8 sm:flex sm:flex-wrap sm:items-end sm:gap-8 sm:px-5 sm:py-4"
          data-agent-world-trust
        >
          <div>
            <p className="font-mono text-[9px] tracking-[0.12em] text-[var(--muted)] uppercase sm:text-[10px]">
              Reputation
            </p>
            <p className="font-serif text-3xl font-bold text-ink sm:text-4xl md:text-5xl">
              {agent.reputationScore || "—"}
            </p>
          </div>
          <div className="flex flex-col justify-end gap-0.5 pb-0.5 text-[11px] text-[var(--muted)] sm:flex-row sm:items-center sm:gap-1.5 sm:pb-1 sm:text-sm">
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-gold text-gold sm:h-4 sm:w-4" aria-hidden />
              <span className="font-mono text-ink">
                {agent.starRating > 0 ? agent.starRating.toFixed(2) : "—"}
              </span>
            </span>
            <span className="sm:ml-0">
              <span className="hidden sm:inline">· </span>
              {agent.reviewCount} review{agent.reviewCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="pb-0.5 text-right font-mono text-[10px] tracking-wide text-[var(--muted)] uppercase sm:ml-auto sm:pb-1 sm:text-[11px] sm:text-left">
            {listings.length} listing{listings.length === 1 ? "" : "s"}
          </div>
        </div>

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

        {/* Inventory presence */}
        <section
          id="agent-listings"
          className="mt-10 scroll-mt-28"
          data-agent-world-listings
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink">Listings</h2>
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
            <div
              className="story-well mt-4 border-dashed px-5 py-8 text-center"
              data-agent-world-listings-empty
            >
              <p className="font-serif text-lg font-semibold text-ink">
                No active listings yet
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
                {isOwn
                  ? "When you publish inventory, it appears here for visitors — and feeds your Story Walk film."
                  : "Check back soon, or browse the wider marketplace for homes in this market."}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={isOwn ? "/settings" : "/marketplace"}
                  onClick={() => onCta("listings")}
                  className="story-press inline-flex h-10 items-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
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
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
