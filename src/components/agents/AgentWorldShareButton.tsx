"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { shareAgentWorld } from "@/lib/living-mark/share";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type Props = {
  agentId: string;
  agentName: string;
  marketCity?: string | null;
  roleLabel?: string | null;
  /** Own profile gets slightly stronger wording. */
  isOwn?: boolean;
  className?: string;
};

/**
 * SW-6 — Share Agent World (native share + clipboard fallback).
 * Not the Story Walk film export.
 */
export function AgentWorldShareButton({
  agentId,
  agentName,
  marketCity,
  roleLabel,
  isOwn = false,
  className,
}: Props) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function onShare() {
    if (busy) return;
    setBusy(true);
    setNote("");
    try {
      const result = await shareAgentWorld({
        agentId,
        agentName,
        marketCity,
        roleLabel,
      });
      if (result.ok) {
        track("agent_world_shared", {
          agent_id: agentId,
          method: result.method,
        });
        setNote(
          result.method === "native"
            ? "Share sheet opened"
            : "Agent World link copied",
        );
      } else if (result.reason === "cancelled") {
        setNote("");
      } else {
        setNote("Couldn’t share — try copying the address bar.");
      }
      window.setTimeout(() => setNote(""), 2800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        data-agent-world-share
        disabled={busy}
        onClick={() => void onShare()}
        className={cn(
          "story-press inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-hairline bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] px-5 text-sm font-semibold text-ink backdrop-blur-sm hover:border-gold/40 disabled:opacity-60 sm:w-auto",
        )}
        aria-label={isOwn ? "Share your Agent World" : "Share this Agent World"}
      >
        {note.startsWith("Agent World link copied") ||
        note.startsWith("Share sheet") ? (
          <Check className="h-4 w-4 text-gold" aria-hidden />
        ) : (
          <Share2 className="h-4 w-4 text-gold" aria-hidden />
        )}
        {isOwn ? "Share my world" : "Share"}
      </button>
      {note ? (
        <p
          data-agent-world-share-note
          role="status"
          className="absolute top-full left-0 z-10 mt-2 flex max-w-[16rem] items-start gap-1.5 rounded-xl border border-hairline bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-3 py-2 text-[11px] leading-snug text-[var(--muted)] shadow-[0_8px_24px_rgba(18,40,32,0.16)] backdrop-blur-md"
        >
          <Link2 className="mt-0.5 h-3 w-3 shrink-0 text-gold" aria-hidden />
          {note}
        </p>
      ) : null}
    </div>
  );
}
