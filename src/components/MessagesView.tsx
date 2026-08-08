"use client";

import Image from "next/image";
import { Link as LinkIcon, Send } from "lucide-react";
import {
  DEMO_BUYER,
  DEMO_LISTING,
  DEMO_MESSAGE,
  formatUsd,
} from "@/lib/demo-data";

export default function MessagesView() {
  return (
    <div className="flex h-dvh pb-16 pt-[72px] md:pb-0">
      <aside className="flex h-full w-full flex-col border-r border-hairline bg-[var(--surface)] md:w-[380px]">
        <div className="border-b border-hairline p-4">
          <h1 className="font-serif text-2xl font-bold text-ink">Messages</h1>
        </div>
        <div className="flex-1 divide-y divide-hairline overflow-y-auto">
          <div className="relative flex cursor-pointer gap-3 bg-[var(--background)] p-4">
            <span className="absolute top-5 right-4 h-2 w-2 rounded-full bg-gold" />
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] text-sm font-bold text-navy">
              {DEMO_BUYER.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="truncate text-sm font-bold text-ink">
                  {DEMO_BUYER.fullName}
                </h3>
                <span className="font-mono text-[10px] text-[var(--muted)]">
                  {DEMO_MESSAGE.createdLabel}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                Hi Sarah, I love the history of 1402...
              </p>
            </div>
          </div>
        </div>
      </aside>

      <main className="hidden h-full flex-1 flex-col md:flex">
        <header className="flex h-[65px] items-center border-b border-hairline px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] text-xs font-bold text-navy">
              {DEMO_BUYER.initials}
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">{DEMO_BUYER.fullName}</h3>
              <span className="block font-mono text-[10px] font-bold tracking-wider text-teal-soft uppercase">
                ● Verified buyer
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="max-w-[480px] space-y-2">
            <div className="flex items-center gap-3 rounded-xl border border-hairline bg-[var(--surface)] p-3">
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded">
                <Image
                  src={DEMO_LISTING.photoUrl}
                  alt={DEMO_LISTING.addressSerif}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="min-w-0">
                <h4 className="truncate font-serif text-sm font-bold text-ink">
                  {DEMO_LISTING.addressSerif}
                </h4>
                <span className="font-mono text-[11px] font-bold text-gold">
                  {formatUsd(DEMO_LISTING.price)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl rounded-tl-none bg-[var(--surface)] p-4 text-sm leading-relaxed text-ink">
              {DEMO_MESSAGE.messageText}
            </div>
            <span className="block px-1 font-mono text-[10px] text-[var(--muted)]">
              {DEMO_MESSAGE.createdLabel}
            </span>
          </div>
        </div>

        <footer className="border-t border-hairline p-4">
          <div className="mx-auto flex h-12 max-w-4xl items-center rounded-full border border-hairline bg-[var(--surface)] px-4 focus-within:border-navy">
            <button
              type="button"
              className="mr-3 text-[var(--muted)] hover:text-ink"
              aria-label="Attach listing link"
            >
              <LinkIcon className="h-5 w-5" />
            </button>
            <input
              type="text"
              placeholder="Write a message…"
              className="flex-1 bg-transparent text-sm text-ink outline-none"
            />
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-paper"
              aria-label="Send"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
