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
    <div className="flex h-screen bg-white pb-16 pt-[72px] md:pb-0">
      {/* INBOX INDEX PANE */}
      <aside className="flex h-full w-full flex-col border-r border-hairline bg-white md:w-[400px]">
        <div className="border-b border-hairline p-4">
          <h2 className="font-serif text-2xl font-bold text-navy">
            Secure Communications
          </h2>
        </div>
        <div className="flex-1 divide-y divide-hairline overflow-y-auto">
          <div className="relative flex cursor-pointer gap-3 bg-slate-50/80 p-4">
            <span className="absolute top-5 right-4 h-2 w-2 rounded-full bg-gold" />
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-navy">
              {DEMO_BUYER.initials}
            </div>
            <div className="min-w-0 flex-1 font-sans">
              <div className="flex items-center justify-between">
                <h3 className="truncate text-sm font-bold text-navy">
                  {DEMO_BUYER.fullName}
                </h3>
                <span className="font-mono text-[10px] text-slate-400">
                  {DEMO_MESSAGE.createdLabel}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-text">
                Hi Sarah, I love the history of 1402...
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ACTIVE THREAD */}
      <main className="hidden h-full flex-1 flex-col bg-white md:flex">
        <header className="flex h-[65px] items-center justify-between border-b border-hairline bg-white px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-navy">
              {DEMO_BUYER.initials}
            </div>
            <div>
              <h3 className="text-sm font-bold text-navy">
                {DEMO_BUYER.fullName}
              </h3>
              <span className="block font-mono text-[10px] font-bold tracking-wider text-emerald-600 uppercase">
                ● Verified Buyer Identity
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto bg-white p-6">
          <div className="max-w-[480px] space-y-2 font-sans">
            <div className="flex cursor-pointer items-center gap-3 rounded-xl border border-hairline bg-slate-50/50 p-3 shadow-sm transition-colors hover:border-slate-300">
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-slate-300">
                <Image
                  src={DEMO_LISTING.photoUrl}
                  alt={DEMO_LISTING.addressSerif}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="min-w-0">
                <h4 className="truncate font-serif text-sm font-bold text-navy">
                  {DEMO_LISTING.addressSerif}
                </h4>
                <span className="font-mono text-[11px] font-bold text-gold">
                  {formatUsd(DEMO_LISTING.price)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl rounded-tl-none bg-slate-100 p-4 text-sm leading-relaxed text-slate-text shadow-sm">
              {DEMO_MESSAGE.messageText}
            </div>
            <span className="block px-1 font-mono text-[10px] text-slate-400">
              {DEMO_MESSAGE.createdLabel}
            </span>
          </div>
        </div>

        <footer className="border-t border-hairline bg-white p-4">
          <div className="mx-auto flex h-12 max-w-4xl items-center rounded-full border border-slate-200 bg-white px-4 transition-colors focus-within:border-navy">
            <button
              type="button"
              className="mr-3 text-slate-400 hover:text-navy"
              aria-label="Attach image"
            >
              <LinkIcon className="h-5 w-5" />
            </button>
            <input
              type="text"
              placeholder="Draft your responsive message..."
              className="flex-1 bg-transparent text-sm text-slate-text outline-none"
            />
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white transition-opacity hover:opacity-90"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
