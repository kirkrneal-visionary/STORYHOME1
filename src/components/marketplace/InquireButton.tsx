"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { track } from "@/lib/analytics";
import { createInquiry } from "@/lib/supabase/leads";

export function InquireButton({
  listingId,
  agentId,
  listingLabel,
}: {
  listingId: string;
  agentId: string;
  listingLabel: string;
}) {
  const { user, isLoggedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  if (!isLoggedIn || !user) {
    return (
      <Link
        href={`/login?next=/marketplace/${listingId}`}
        className="flex h-11 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-semibold text-[var(--accent-contrast)]"
      >
        Log in to contact agent
      </Link>
    );
  }

  // The listing's own agent shouldn't inquire on their listing.
  if (user.id === agentId) return null;

  if (sent) {
    return (
      <div className="rounded-lg border border-teal-soft/40 bg-teal-soft/10 p-3 text-sm text-ink">
        Message sent — the agent has 15 minutes to respond before the lead opens
        to other agents.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-sm font-semibold text-[var(--accent-contrast)]"
      >
        <MessageCircle className="h-4 w-4" /> Contact agent
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-hairline bg-[var(--background)] p-3">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder={`Ask about ${listingLabel}…`}
        className="w-full rounded-lg border border-hairline bg-[var(--surface)] p-2.5 text-sm text-ink outline-none focus:border-gold"
      />
      {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr("");
            try {
              await createInquiry(user.id, listingId, agentId, message.trim() || "I'm interested in this home.");
              track("listing_inquire_submitted", { listing_id: listingId });
              setSent(true);
            } catch {
              setErr("Couldn't send right now. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
          className="h-10 flex-1 rounded-lg bg-gold text-sm font-bold text-navy disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send message"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg border border-hairline px-4 text-sm font-semibold text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
