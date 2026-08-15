/**
 * STORY-WALK SW-6 — Share Agent World link helpers.
 * Canonical path only — not the marketing export (later wave).
 */

export function agentWorldPath(agentId: string): string {
  return `/agents/${encodeURIComponent(agentId)}`;
}

/** Absolute URL for share / clipboard. */
export function agentWorldAbsoluteUrl(
  agentId: string,
  origin?: string | null,
): string {
  const path = agentWorldPath(agentId);
  if (origin && /^https?:\/\//i.test(origin)) {
    return `${origin.replace(/\/$/, "")}${path}`;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export function agentWorldShareCard(opts: {
  agentName: string;
  marketCity?: string | null;
  roleLabel?: string | null;
  url: string;
}): { title: string; text: string; url: string } {
  const place = opts.marketCity?.trim() || "East Texas";
  const role = opts.roleLabel?.replace(/_/g, " ").trim() || "Agent";
  return {
    title: `${opts.agentName} · Agent World on Story Home`,
    text: `Meet ${opts.agentName} (${role}) in ${place} on Story Home — Living Mark welcome + listings.`,
    url: opts.url,
  };
}

export type ShareAgentWorldResult =
  | { ok: true; method: "native" | "clipboard" }
  | { ok: false; reason: string };

/**
 * Prefer native share sheet; always fall back to clipboard copy of the URL.
 * Never throws into UX.
 */
export async function shareAgentWorld(opts: {
  agentId: string;
  agentName: string;
  marketCity?: string | null;
  roleLabel?: string | null;
}): Promise<ShareAgentWorldResult> {
  const url = agentWorldAbsoluteUrl(opts.agentId);
  const card = agentWorldShareCard({
    agentName: opts.agentName,
    marketCity: opts.marketCity,
    roleLabel: opts.roleLabel,
    url,
  });

  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: card.title,
          text: card.text,
          url: card.url,
        });
        return { ok: true, method: "native" };
      } catch (err) {
        // User cancel — not a failure to copy.
        if (err instanceof DOMException && err.name === "AbortError") {
          return { ok: false, reason: "cancelled" };
        }
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(card.url);
      return { ok: true, method: "clipboard" };
    }

    return { ok: false, reason: "unavailable" };
  } catch {
    try {
      await navigator.clipboard.writeText(card.url);
      return { ok: true, method: "clipboard" };
    } catch {
      return { ok: false, reason: "unavailable" };
    }
  }
}
