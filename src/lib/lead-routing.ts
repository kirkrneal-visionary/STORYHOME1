/**
 * Story Pro lead-routing algorithm.
 *
 * Buyer leads are generated when a logged-in consumer sends their FIRST message
 * on a listing. The listing's agent then has a fixed window (default 15 minutes)
 * to call and claim that consumer as a lead. If they don't claim in time, the
 * opportunity passes — in the order the consumer inquired — to the agent of the
 * next listing the consumer messaged, who gets their own full window, and so on.
 *
 * This creates a fair, level playing field: whoever responds fastest to a live
 * buyer wins the relationship. This module is a pure state machine over the
 * inquiry log + claim log; it holds no time or storage of its own so it can be
 * unit-verified deterministically.
 */

export const CLAIM_WINDOW_MS = 15 * 60 * 1000;

export type Inquiry = {
  id: string;
  consumerId: string;
  consumerName: string;
  listingId: string;
  listingLabel: string;
  agentId: string;
  agentName: string;
  /** Epoch ms of the consumer's first message on this listing. */
  createdAt: number;
};

export type LeadClaim = {
  consumerId: string;
  listingId: string;
  agentId: string;
  /** Epoch ms the agent called/claimed. */
  claimedAt: number;
};

export type WindowStatus =
  | "claimed" // an agent claimed this consumer during this window
  | "active" // this window currently holds the claim right
  | "expired" // window passed with no valid claim
  | "upcoming" // window has not opened yet
  | "skipped"; // consumer already claimed in an earlier window

export type LeadWindow = {
  order: number;
  inquiryId: string;
  listingId: string;
  listingLabel: string;
  agentId: string;
  agentName: string;
  opensAt: number;
  expiresAt: number;
  status: WindowStatus;
  /** ms until this active window expires (0 for non-active windows). */
  msRemaining: number;
};

export type ConsumerLeadRouting = {
  consumerId: string;
  consumerName: string;
  windows: LeadWindow[];
  /** Agent who captured the lead, if any. */
  winnerAgentId: string | null;
  winningListingId: string | null;
  /** True once the lead is decided (claimed, or all windows expired). */
  resolved: boolean;
};

/**
 * De-duplicate to the first inquiry per listing (only the first message on a
 * listing starts a window), sorted by time ascending (inquiry order).
 */
function firstInquiriesInOrder(inquiries: Inquiry[]): Inquiry[] {
  const byListing = new Map<string, Inquiry>();
  for (const inq of inquiries) {
    const existing = byListing.get(inq.listingId);
    if (!existing || inq.createdAt < existing.createdAt) {
      byListing.set(inq.listingId, inq);
    }
  }
  return [...byListing.values()].sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Compute the routing state for a single consumer.
 *
 * Windows are sequential: the first window opens at the first inquiry time; each
 * later window opens only when the previous one expires unclaimed. A claim is
 * valid only if made by the window's agent while that window is open — this is
 * what enforces the "respond within the window or lose it" fairness rule.
 */
export function routeConsumerLead(
  inquiries: Inquiry[],
  claims: LeadClaim[],
  now: number,
  windowMs: number = CLAIM_WINDOW_MS,
): ConsumerLeadRouting {
  const ordered = firstInquiriesInOrder(inquiries);
  const consumerId = ordered[0]?.consumerId ?? inquiries[0]?.consumerId ?? "";
  const consumerName =
    ordered[0]?.consumerName ?? inquiries[0]?.consumerName ?? "";

  const windows: LeadWindow[] = [];
  let winnerAgentId: string | null = null;
  let winningListingId: string | null = null;
  let resolved = false;
  let cursor = ordered[0]?.createdAt ?? now;

  for (let i = 0; i < ordered.length; i += 1) {
    const inq = ordered[i];
    // A later window can't open before the consumer actually inquired on it.
    const opensAt = Math.max(cursor, inq.createdAt);
    const expiresAt = opensAt + windowMs;

    let status: WindowStatus;
    let msRemaining = 0;

    if (resolved) {
      status = "skipped";
    } else {
      const validClaim = claims.find(
        (c) =>
          c.consumerId === inq.consumerId &&
          c.listingId === inq.listingId &&
          c.agentId === inq.agentId &&
          c.claimedAt >= opensAt &&
          c.claimedAt <= expiresAt,
      );

      if (validClaim) {
        status = "claimed";
        winnerAgentId = inq.agentId;
        winningListingId = inq.listingId;
        resolved = true;
      } else if (now < opensAt) {
        status = "upcoming";
      } else if (now >= expiresAt) {
        status = "expired";
      } else {
        status = "active";
        msRemaining = expiresAt - now;
      }
    }

    windows.push({
      order: i,
      inquiryId: inq.id,
      listingId: inq.listingId,
      listingLabel: inq.listingLabel,
      agentId: inq.agentId,
      agentName: inq.agentName,
      opensAt,
      expiresAt,
      status,
      msRemaining,
    });

    cursor = expiresAt;
  }

  // If not claimed and every window has expired, the lead is decided (lost).
  if (!resolved && windows.length > 0) {
    resolved = windows.every((w) => w.status === "expired");
  }

  return {
    consumerId,
    consumerName,
    windows,
    winnerAgentId,
    winningListingId,
    resolved,
  };
}

/** Group all inquiries by consumer and route each consumer independently. */
export function routeAllLeads(
  inquiries: Inquiry[],
  claims: LeadClaim[],
  now: number,
  windowMs: number = CLAIM_WINDOW_MS,
): ConsumerLeadRouting[] {
  const byConsumer = new Map<string, Inquiry[]>();
  for (const inq of inquiries) {
    const list = byConsumer.get(inq.consumerId) ?? [];
    list.push(inq);
    byConsumer.set(inq.consumerId, list);
  }
  return [...byConsumer.values()]
    .map((list) => routeConsumerLead(list, claims, now, windowMs))
    .sort((a, b) => firstOpen(a) - firstOpen(b));
}

function firstOpen(r: ConsumerLeadRouting): number {
  return r.windows[0]?.opensAt ?? 0;
}

/** The window that currently holds the claim right for a routing, if any. */
export function activeWindow(routing: ConsumerLeadRouting): LeadWindow | null {
  return routing.windows.find((w) => w.status === "active") ?? null;
}

/**
 * Whether `agentId` may claim `routing` right now: they must own the currently
 * active window. Enforces the fairness rule at the call site.
 */
export function canAgentClaim(
  routing: ConsumerLeadRouting,
  agentId: string,
): boolean {
  const win = activeWindow(routing);
  return Boolean(win && win.agentId === agentId && !routing.resolved);
}

/** Format ms remaining as M:SS for countdown display. */
export function formatCountdown(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
