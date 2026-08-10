"use client";

import { useState } from "react";
import { Award, Layers, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <section className="border-b border-hairline bg-[var(--surface)] px-4 py-6 md:px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          <MetricCard
            icon={<Award className="h-6 w-6" />}
            label="Reputation Score"
            value="—"
          />
          <MetricCard
            icon={<Layers className="h-6 w-6" />}
            label="Open Network Leads"
            value="0"
          />
          <MetricCard
            icon={<Plus className="h-6 w-6" />}
            label="Active Listings"
            value="0"
          />
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">
              Referral Board
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              B2B client distribution — claim, close, and rate collaborations.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 self-start rounded-lg bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90 md:self-auto"
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
            <EmptyState text="No open referrals yet — post one to share a client." />
          </BoardColumn>

          <BoardColumn title="Claimed" count={0} tone="teal">
            <EmptyState text="No leads currently in escrow" />
          </BoardColumn>

          <BoardColumn title="Closed" count={0} tone="slate">
            <EmptyState text="Archive is empty" />
          </BoardColumn>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-hairline bg-[var(--background)] p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)]">
        {icon}
      </div>
      <div>
        <span className="block font-mono text-[11px] font-medium tracking-wider text-[var(--muted)] uppercase">
          {label}
        </span>
        <span className="font-serif text-3xl font-bold text-ink">{value}</span>
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
