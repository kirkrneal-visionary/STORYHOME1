"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default function MessagesView() {
  return (
    <div className="flex h-dvh pb-16 pt-[72px] md:pb-0">
      <aside className="flex h-full w-full flex-col border-r border-hairline bg-[var(--surface)] md:w-[380px]">
        <div className="border-b border-hairline p-4">
          <h1 className="font-serif text-2xl font-bold text-ink">Messages</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <MessageSquare className="h-8 w-8 text-[var(--muted)]" />
          <p className="text-sm font-semibold text-ink">No messages yet</p>
          <p className="text-xs text-[var(--muted)]">
            When you contact an agent on a listing, your conversation appears here.
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
        <p className="text-sm text-[var(--muted)]">Select a conversation to start messaging.</p>
      </main>
    </div>
  );
}
