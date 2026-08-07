"use client";

import Image from "next/image";
import { useState } from "react";
import { Heart, MessageSquare, Star } from "lucide-react";
import { DEMO_AGENT, DEMO_LISTING, formatUsd } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export default function MarketplaceView() {
  const [isSaved, setIsSaved] = useState(false);
  const [bedsFilter, setBedsFilter] = useState("3");

  return (
    <div className="flex min-h-screen pb-16 pt-[72px] md:pb-0">
      {/* FILTER PANE (LEFT) */}
      <aside className="fixed top-[72px] bottom-0 left-0 hidden w-[380px] overflow-y-auto border-r border-hairline bg-white p-6 lg:block">
        <h2 className="mb-6 font-serif text-2xl font-semibold text-navy">
          Find Your Story
        </h2>

        <div className="space-y-6 font-sans">
          <div>
            <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Location
            </label>
            <input
              type="text"
              placeholder="City, neighborhood, or zip"
              className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm font-medium focus:border-navy focus:outline-none"
              defaultValue="Austin, TX"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Price Range
            </label>
            <div className="grid grid-cols-2 gap-3 font-mono">
              <input
                type="text"
                placeholder="Min"
                defaultValue="$500,000"
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              />
              <input
                type="text"
                placeholder="Max"
                defaultValue="$1,000,000"
                className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Bedrooms
            </label>
            <div className="grid grid-cols-5 gap-1 text-xs font-medium">
              {["Any", "1", "2", "3", "4+"].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBedsFilter(b)}
                  className={cn(
                    "h-9 rounded-md border",
                    bedsFilter === b
                      ? "border-navy bg-navy text-white"
                      : "border-slate-200 hover:border-slate-400",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* LISTINGS PANELS CONTAINER (RIGHT) */}
      <main className="flex-1 bg-white p-6 lg:ml-[380px]">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-between">
            <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">
              Showing 1 Luxury Asset
            </span>
            <div className="flex items-center gap-2 text-xs font-medium">
              <button
                type="button"
                className="h-8 rounded-full bg-slate-100 px-3 text-navy"
              >
                All Properties
              </button>
              <button
                type="button"
                className="h-8 px-3 text-slate-500 hover:text-navy"
              >
                Following
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="group cursor-pointer overflow-hidden rounded-xl border border-hairline bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-100">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-100">
                <Image
                  src={DEMO_LISTING.photoUrl}
                  alt={DEMO_LISTING.addressSerif}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 480px"
                  priority
                />
                <span className="absolute bottom-3 left-3 rounded bg-navy px-2.5 py-1 font-mono text-sm font-semibold text-white shadow-md">
                  {formatUsd(DEMO_LISTING.price)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsSaved(!isSaved);
                  }}
                  className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-md transition-colors hover:text-gold"
                  aria-label={isSaved ? "Unsave listing" : "Save listing"}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isSaved ? "fill-gold text-gold" : "",
                    )}
                  />
                </button>
              </div>

              <div className="mt-4">
                <h3 className="font-serif text-xl font-bold text-navy">
                  {DEMO_LISTING.addressSerif}
                </h3>
                <p className="mt-1 font-mono text-xs tracking-wider text-slate-500 uppercase">
                  {DEMO_LISTING.city} · {DEMO_LISTING.beds} Beds ·{" "}
                  {DEMO_LISTING.baths} Baths ·{" "}
                  {DEMO_LISTING.sqft.toLocaleString()} Sqft
                </p>
              </div>

              <div className="my-4 flex items-center justify-between border-t border-hairline pt-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-navy">
                    {DEMO_AGENT.initials}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy">
                      {DEMO_AGENT.fullName}
                    </h4>
                    <div className="-mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-500">
                      <Star className="h-3 w-3 fill-gold text-gold" />
                      <span>{DEMO_AGENT.starRating.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="h-7 rounded-md border border-navy px-3 text-xs font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
                >
                  Follow
                </button>
              </div>

              <div className="flex items-center gap-4 font-mono text-[11px] tracking-wider text-slate-400 uppercase">
                <span>♡ {DEMO_LISTING.likeCount} Likes</span>
                <span>❑ {DEMO_LISTING.saveCount} Saves</span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />{" "}
                  {DEMO_LISTING.commentCount} Comments
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
