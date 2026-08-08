"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Share2 } from "lucide-react";
import { type StorySuite, suiteCoverPhotos } from "@/lib/suites";
import { cn } from "@/lib/utils";

type SuiteAlbumCardProps = {
  suite: StorySuite;
  onShare?: () => void;
};

export function SuiteAlbumCard({ suite, onShare }: SuiteAlbumCardProps) {
  const covers = suiteCoverPhotos(suite).slice(0, 4);

  return (
    <article className="group">
      <Link href={`/saved/${suite.id}`} className="block">
        <div
          className={cn(
            "relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.02]",
            suite.coverTone,
          )}
        >
          {covers.length > 0 ? (
            <div className="grid h-full grid-cols-2 grid-rows-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="relative overflow-hidden">
                  {covers[i] ? (
                    <Image
                      src={covers[i]}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  ) : (
                    <div className="h-full w-full bg-black/20" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-end p-5">
              <p className="font-serif text-3xl font-bold text-paper/90">
                {suite.name.slice(0, 1)}
              </p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute right-3 bottom-3 flex h-11 w-11 items-center justify-center rounded-full bg-gold text-navy opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            <Play className="h-5 w-5 fill-current" />
          </div>
          <p className="absolute bottom-3 left-3 font-mono text-[10px] font-bold tracking-wider text-paper/80 uppercase">
            {suite.listingIds.length} homes
          </p>
        </div>
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/saved/${suite.id}`}
            className="truncate font-serif text-lg font-bold text-ink hover:text-gold"
          >
            {suite.name}
          </Link>
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">
            {suite.description || "Story Home Suite"}
          </p>
        </div>
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline text-[var(--muted)] hover:text-gold"
            aria-label={`Share ${suite.name}`}
          >
            <Share2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>
  );
}
