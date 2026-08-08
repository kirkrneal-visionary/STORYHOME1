"use client";

import { useEffect, useMemo, useState } from "react";
import { Phone, Timer, Trophy, UserX } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import {
  activeWindow,
  canAgentClaim,
  formatCountdown,
  routeAllLeads,
  type LeadClaim,
  type WindowStatus,
} from "@/lib/lead-routing";
import { getConsumerContact, seedInquiries } from "@/lib/leads-data";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<WindowStatus, string> = {
  claimed: "Claimed",
  active: "Active",
  expired: "Expired",
  upcoming: "Queued",
  skipped: "Skipped",
};

const STATUS_TONE: Record<WindowStatus, string> = {
  claimed: "bg-teal-soft text-paper",
  active: "bg-gold text-navy",
  expired: "bg-[var(--muted)]/20 text-[var(--muted)]",
  upcoming: "bg-[var(--surface)] text-[var(--muted)] border border-hairline",
  skipped: "bg-[var(--muted)]/10 text-[var(--muted)]",
};

export function IncomingLeads() {
  const { user } = useAuth();
  const agentId = user?.id ?? "";
  const agentName = user?.name ?? "";

  // Seed the inquiry log once, anchored to mount time; the clock then advances.
  const [base] = useState(() => Date.now());
  const [now, setNow] = useState(base);
  const [claims, setClaims] = useState<LeadClaim[]>([]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const inquiries = useMemo(
    () => seedInquiries(base, agentId, agentName),
    [base, agentId, agentName],
  );

  const routings = useMemo(
    () => routeAllLeads(inquiries, claims, now),
    [inquiries, claims, now],
  );

  function claim(consumerId: string, listingId: string) {
    setClaims((prev) => [
      ...prev,
      { consumerId, listingId, agentId, claimedAt: Date.now() },
    ]);
  }

  const claimableCount = routings.filter((r) => canAgentClaim(r, agentId)).length;

  return (
    <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-serif text-xl font-bold text-ink">
            Incoming leads
          </h3>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            First message on your listing gives you a 15-minute window to call.
            Miss it and the lead passes, in order, to the next listing the buyer
            inquired on.
          </p>
        </div>
        <span
          className={cn(
            "self-start rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase",
            claimableCount > 0
              ? "bg-gold text-navy"
              : "border border-hairline text-[var(--muted)]",
          )}
        >
          {claimableCount} to call now
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {routings.map((routing) => {
          const contact = getConsumerContact(routing.consumerId);
          const win = activeWindow(routing);
          const iCanClaim = canAgentClaim(routing, agentId);
          const wonByMe =
            routing.resolved && routing.winnerAgentId === agentId;
          const wonByOther =
            routing.resolved &&
            routing.winnerAgentId !== null &&
            routing.winnerAgentId !== agentId;
          const lostNoResponse =
            routing.resolved && routing.winnerAgentId === null;

          return (
            <article
              key={routing.consumerId}
              className={cn(
                "rounded-xl border p-4",
                iCanClaim
                  ? "border-gold bg-[color-mix(in_srgb,var(--gold)_12%,var(--surface))]"
                  : "border-hairline bg-[var(--background)]",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-lg font-bold text-ink">
                    {routing.consumerName}
                  </p>
                  {contact && (
                    <p className="mt-0.5 text-sm text-[var(--muted)]">
                      “{contact.lastMessage}”
                    </p>
                  )}
                </div>

                {/* Status / action */}
                <div className="shrink-0 text-right">
                  {wonByMe && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-soft px-3 py-2 text-sm font-bold text-paper">
                      <Trophy className="h-4 w-4" /> Lead captured
                    </span>
                  )}
                  {wonByOther && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)]">
                      <UserX className="h-4 w-4" /> Captured by{" "}
                      {routing.winnerAgentId &&
                        agentNameFor(routing, routing.winnerAgentId)}
                    </span>
                  )}
                  {lostNoResponse && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--muted)]">
                      <UserX className="h-4 w-4" /> Expired — no response
                    </span>
                  )}
                  {!routing.resolved && win && iCanClaim && contact && (
                    <div className="flex flex-col items-end gap-1">
                      <Countdown ms={win.msRemaining} />
                      <button
                        type="button"
                        onClick={() => claim(routing.consumerId, win.listingId)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-navy hover:opacity-90"
                      >
                        <Phone className="h-4 w-4" /> Call &amp; claim
                      </button>
                      <span className="font-mono text-[11px] text-[var(--muted)]">
                        {contact.phone}
                      </span>
                    </div>
                  )}
                  {!routing.resolved && win && !iCanClaim && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-[var(--muted)]">
                        With {win.agentName}
                      </span>
                      <Countdown ms={win.msRemaining} muted />
                    </div>
                  )}
                </div>
              </div>

              {/* Routing queue */}
              <ol className="mt-3 flex flex-wrap gap-2 border-t border-hairline pt-3">
                {routing.windows.map((w) => (
                  <li
                    key={w.inquiryId}
                    className="flex items-center gap-1.5 rounded-md bg-[var(--surface)] px-2 py-1"
                  >
                    <span className="font-mono text-[10px] text-[var(--muted)]">
                      {w.order + 1}.
                    </span>
                    <span className="text-xs text-ink">{w.listingLabel}</span>
                    <span className="font-mono text-[10px] text-[var(--muted)]">
                      · {w.agentId === agentId ? "You" : w.agentName}
                    </span>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                        STATUS_TONE[w.status],
                      )}
                    >
                      {STATUS_LABEL[w.status]}
                    </span>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Countdown({ ms, muted }: { ms: number; muted?: boolean }) {
  const urgent = ms <= 2 * 60_000;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-lg font-bold tabular-nums",
        muted ? "text-[var(--muted)]" : urgent ? "text-red-300" : "text-gold",
      )}
    >
      <Timer className="h-4 w-4" />
      {formatCountdown(ms)}
    </span>
  );
}

function agentNameFor(
  routing: { windows: { agentId: string; agentName: string }[] },
  agentId: string,
): string {
  return (
    routing.windows.find((w) => w.agentId === agentId)?.agentName ?? "another agent"
  );
}
