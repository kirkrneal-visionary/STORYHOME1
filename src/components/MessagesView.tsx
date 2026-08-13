"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { SurfaceHonestyBanner } from "@/components/SurfaceHonestyBanner";

export default function MessagesView() {
  return (
    <div className="flex h-dvh flex-col pb-16 pt-[72px] md:pb-0">
      <SurfaceHonestyBanner
        surface="Messages"
        later="threads will appear here when you contact an agent on a listing. Nothing is syncing yet."
      />
      <div className="flex min-h-0 flex-1">
        <aside className="flex h-full w-full flex-col border-r border-hairline bg-[var(--surface)] md:w-[380px]">
          <div className="border-b border-hairline p-4">
            <h1 className="font-serif text-2xl font-bold text-ink">Messages</h1>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <MessageSquare className="h-8 w-8 text-[var(--muted)]" />
            <p className="text-sm font-semibold text-ink">Inbox reserved</p>
            <p className="text-xs text-[var(--muted)]">
              Live messaging is not on yet — this room is part of Story OS so the
              network has a place to land later.
            </p>
            <Link
              href="/marketplace"
              className="mt-2 inline-flex h-10 items-center rounded-lg bg-gold px-4 text-sm font-bold text-navy"
            >
              Browse listings
            </Link>
          </div>
        </aside>

        <main className="hidden h-full flex-1 flex-col items-center justify-center md:flex">
          <p className="text-sm text-[var(--muted)]">
            Conversations will open here when messaging goes live.
          </p>
        </main>
      </div>
    </div>
  );
}
