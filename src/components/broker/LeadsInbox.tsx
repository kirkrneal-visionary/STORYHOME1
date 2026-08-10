"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Phone, Trophy } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import {
  canAgentClaim,
  formatCountdown,
  routeAllLeads,
  type ConsumerLeadRouting,
  type LeadWindow,
} from "@/lib/lead-routing";
import { claimLead, fetchLeadFeed, type LeadFeed } from "@/lib/supabase/leads";
import { addBuyer } from "@/lib/supabase/crm";
import { cn } from "@/lib/utils";

export function LeadsInbox() {
  const { user } = useAuth();
  const [feed, setFeed] = useState<LeadFeed>({ inquiries: [], claims: [] });
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setFeed(await fetchLeadFeed());
    } catch {
      setFeed({ inquiries: [], claims: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live countdown tick.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const routings = useMemo(
    () => routeAllLeads(feed.inquiries, feed.claims, now),
    [feed, now],
  );

  if (!user) return null;
  const me = user.id;

  // Only show consumers that have a window belonging to this agent.
  const mine = routings.filter((r) => r.windows.some((w) => w.agentId === me));

  if (loading) {
    return <Panel><p className="text-sm text-[var(--muted)]">Loading incoming leads…</p></Panel>;
  }
  if (mine.length === 0) {
    return (
      <Panel>
        <p className="text-sm text-[var(--muted)]">
          No incoming leads yet. When a buyer contacts you on one of your
          listings, a 15‑minute claim window opens here.
        </p>
      </Panel>
    );
  }

  async function onClaim(r: ConsumerLeadRouting, win: LeadWindow) {
    setBusy(r.consumerId);
    setNote(null);
    try {
      const status = await claimLead(r.consumerId, win.listingId);
      if (status === "claimed" || status === "already_yours") {
        // Close the loop: drop the won lead into the CRM pipeline.
        if (status === "claimed") {
          try {
            await addBuyer(me, {
              name: r.consumerName, stage: "New lead", budgetMin: 0, budgetMax: 0,
              targetAreas: [], minBeds: 0, propertyType: "", preApproved: false,
              note: `Claimed from inquiry on ${win.listingLabel}`,
              source: "Story Home inquiry", email: "", phone: "",
            });
          } catch { /* buyer add is best-effort */ }
        }
        setNote(`You won ${r.consumerName} — added to your pipeline.`);
      } else if (status === "taken") {
        setNote(`${r.consumerName} was just claimed by another agent.`);
      } else if (status === "not_your_window") {
        setNote("That window isn't active for you right now.");
      } else {
        setNote("Could not claim this lead.");
      }
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-serif text-lg font-bold text-ink">Incoming leads</h3>
        <span className="rounded-full bg-gold px-2 py-0.5 font-mono text-[10px] font-bold text-navy">{mine.length}</span>
      </div>
      {note && <p className="mb-3 text-sm text-teal-soft">{note}</p>}
      <div className="space-y-3">
        {mine.map((r) => {
          const myWin = r.windows.find((w) => w.agentId === me)!;
          const claimable = canAgentClaim(r, me);
          const wonByMe = r.winnerAgentId === me;
          return (
            <div key={r.consumerId} className="rounded-xl border border-hairline bg-[var(--background)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-base font-bold text-ink">{r.consumerName}</p>
                  <p className="font-mono text-[11px] text-[var(--muted)]">
                    Inquired on {myWin.listingLabel}
                  </p>
                </div>
                <StatusBadge routing={r} win={myWin} wonByMe={wonByMe} />
              </div>

              {claimable && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold/10 p-3">
                  <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-ink">
                    <Clock className="h-4 w-4 text-gold" /> {formatCountdown(myWin.msRemaining)} to claim
                  </span>
                  <button
                    type="button"
                    disabled={busy === r.consumerId}
                    onClick={() => onClaim(r, myWin)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-navy disabled:opacity-60"
                  >
                    <Phone className="h-4 w-4" /> {busy === r.consumerId ? "Claiming…" : "Call & claim"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function StatusBadge({ routing, win, wonByMe }: { routing: ConsumerLeadRouting; win: LeadWindow; wonByMe: boolean }) {
  if (wonByMe) {
    return <Badge tone="win"><Trophy className="h-3 w-3" /> You won this lead</Badge>;
  }
  if (routing.resolved) {
    return <Badge tone="muted">Claimed by another agent</Badge>;
  }
  if (win.status === "active") return <Badge tone="active">Your window is open</Badge>;
  if (win.status === "upcoming") return <Badge tone="muted">Waiting for your turn</Badge>;
  if (win.status === "expired") return <Badge tone="muted">Your window passed</Badge>;
  return <Badge tone="muted">{win.status}</Badge>;
}

function Badge({ tone, children }: { tone: "win" | "active" | "muted"; children: React.ReactNode }) {
  return (
    <span className={cn(
      "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase",
      tone === "win" && "bg-teal-soft text-paper",
      tone === "active" && "bg-gold text-navy",
      tone === "muted" && "border border-hairline text-[var(--muted)]",
    )}>
      {children}
    </span>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">{children}</section>;
}
