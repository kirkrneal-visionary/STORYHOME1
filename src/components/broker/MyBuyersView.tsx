"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Bed, MapPin, Wallet } from "lucide-react";
import {
  BUYER_STAGE_ORDER,
  DEMO_BUYERS,
  type Buyer,
  type BuyerStage,
} from "@/lib/broker-clients";
import { IncomingLeads } from "@/components/broker/IncomingLeads";
import { formatUsd } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const STAGE_TONE: Record<BuyerStage, string> = {
  "New lead": "bg-[color-mix(in_srgb,var(--gold)_22%,var(--surface))] text-gold",
  Nurturing: "bg-[var(--surface)] text-[var(--muted)]",
  "Actively touring": "bg-gold text-navy",
  "Offer out": "bg-teal text-paper",
  "Under contract": "bg-teal-soft text-paper",
  Closed: "bg-[var(--muted)]/20 text-[var(--muted)]",
};

export function MyBuyersView() {
  const [stage, setStage] = useState<BuyerStage | "All">("All");

  const buyers = useMemo(
    () =>
      stage === "All"
        ? DEMO_BUYERS
        : DEMO_BUYERS.filter((b) => b.stage === stage),
    [stage],
  );

  return (
    <div className="space-y-8">
      <IncomingLeads />

      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">My pipeline</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {DEMO_BUYERS.length} active buyers across your East Texas pipeline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["All", ...BUYER_STAGE_ORDER] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStage(item)}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 font-mono text-[11px] font-semibold tracking-wide uppercase transition-colors",
                stage === item
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                  : "border border-hairline text-[var(--muted)] hover:text-ink",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {buyers.length === 0 ? (
        <EmptyState text="No buyers in this stage yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {buyers.map((buyer) => (
            <BuyerCard key={buyer.id} buyer={buyer} />
          ))}
        </div>
      )}
    </div>
  );
}

function BuyerCard({ buyer }: { buyer: Buyer }) {
  return (
    <article className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] text-sm font-bold text-navy">
            {buyer.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-serif text-lg font-bold text-ink">
              {buyer.name}
            </p>
            <p className="flex items-center gap-1 font-mono text-[11px] text-[var(--muted)]">
              {buyer.preApproved ? (
                <>
                  <BadgeCheck className="h-3.5 w-3.5 text-teal-soft" />
                  Pre-approved
                </>
              ) : (
                "Pre-approval pending"
              )}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider uppercase",
            STAGE_TONE[buyer.stage],
          )}
        >
          {buyer.stage}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Detail
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Budget"
          value={`${formatUsd(buyer.budgetMin)}–${formatUsd(buyer.budgetMax)}`}
        />
        <Detail
          icon={<Bed className="h-3.5 w-3.5" />}
          label="Wants"
          value={`${buyer.minBeds}+ bd · ${buyer.propertyType}`}
        />
        <Detail
          icon={<MapPin className="h-3.5 w-3.5" />}
          label="Areas"
          value={buyer.targetAreas.join(", ")}
        />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
        {buyer.note}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
        <span className="font-mono text-[11px] text-[var(--muted)]">
          {buyer.lastActivity} · {buyer.savedListingIds.length} saved
        </span>
        <Link
          href="/messages"
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)]"
        >
          Message
        </Link>
      </div>
    </article>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-[var(--background)] p-2.5">
      <span className="flex items-center gap-1 font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
        {icon}
        {label}
      </span>
      <span className="mt-1 block text-xs font-semibold text-ink">{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-hairline bg-[var(--surface)] p-10 text-center text-sm font-medium text-[var(--muted)]">
      {text}
    </div>
  );
}
