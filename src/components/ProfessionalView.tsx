"use client";

import { useState } from "react";
import { Layers, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SurfaceHonestyBanner } from "@/components/SurfaceHonestyBanner";

const FILTERS = [
  "Open in my market",
  "All open",
  "My posted",
  "My claimed",
  "Closed",
] as const;

export default function ProfessionalView() {
  const [filter, setFilter] =
    useState<(typeof FILTERS)[number]>("Open in my market");

  return (
    <div className="min-h-dvh pb-16 pt-[72px] md:pb-0">
      <SurfaceHonestyBanner
        surface="Referrals"
        later="the B2B board will host real open / claimed / closed collaborations. Metrics below are layout placeholders, not live network stats."
        primaryHref="/portal"
        primaryLabel="Open Story Pro"
        secondaryHref="/marketplace"
        secondaryLabel="Browse listings"
      />

      <section className="border-b border-hairline bg-[var(--surface)] px-4 py-5 md:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Preview layout · not live
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <PreviewSlot
              icon={<Layers className="h-5 w-5" />}
              label="Open network leads"
              hint="Will count real open referrals"
            />
            <PreviewSlot
              icon={<Plus className="h-5 w-5" />}
              label="Board activity"
              hint="Will reflect posts you claim or close"
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">
              Referral Board
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Reserved room for B2B client distribution — claim, close, and rate
              collaborations when this network goes live.
            </p>
          </div>
          <button
            type="button"
            disabled
            title="Referrals are not live yet"
            className="inline-flex h-11 cursor-not-allowed items-center gap-2 self-start rounded-lg bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-contrast)] opacity-50 md:self-auto"
          >
            <Plus className="h-4 w-4" /> Post a referral
          </button>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 font-mono text-[11px] font-semibold tracking-wide uppercase",
                filter === item
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                  : "border border-hairline text-[var(--muted)]",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <BoardColumn title="Open" count={0} tone="gold">
            <EmptyState text="No live referrals yet — this column fills when the board ships." />
          </BoardColumn>

          <BoardColumn title="Claimed" count={0} tone="teal">
            <EmptyState text="Claimed collaborations will land here." />
          </BoardColumn>

          <BoardColumn title="Closed" count={0} tone="slate">
            <EmptyState text="Closed archive stays empty until the network is live." />
          </BoardColumn>
        </div>
      </main>
    </div>
  );
}

function PreviewSlot({
  icon,
  label,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-hairline bg-[var(--background)] p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-hairline text-[var(--muted)]">
        {icon}
      </div>
      <div>
        <span className="block font-mono text-[11px] font-medium tracking-wider text-[var(--muted)] uppercase">
          {label}
        </span>
        <span className="text-sm text-ink">{hint}</span>
      </div>
    </div>
  );
}

function BoardColumn({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "gold" | "teal" | "slate";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-[var(--surface)]/60 p-4">
      <div className="mb-4 flex items-center justify-between">
        <StatusBadge status={title as "Open" | "Claimed" | "Closed"} />
        <span className="font-mono text-xs font-bold text-[var(--muted)]">
          {count}
        </span>
      </div>
      {children}
      <span className="sr-only">{tone}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: "Open" | "Claimed" | "Closed" }) {
  return (
    <span
      className={cn(
        "rounded px-2 py-1 font-mono text-[11px] font-bold tracking-wider uppercase",
        status === "Open" && "bg-gold text-navy",
        status === "Claimed" && "bg-teal text-paper",
        status === "Closed" && "bg-[var(--muted)]/20 text-[var(--muted)]",
      )}
    >
      {status}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-hairline bg-[var(--background)] p-8 text-center text-xs font-medium text-[var(--muted)]">
      {text}
    </div>
  );
}
