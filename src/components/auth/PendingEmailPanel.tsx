"use client";

import { useState } from "react";
import { GENERIC_AUTH_SENT } from "@/lib/account/assurance";

export function PendingEmailPanel({
  email,
  onResend,
}: {
  email: string;
  onResend: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-[var(--muted)]">
        Confirm the mailbox for this account before we open your home or Story
        Pro. Check spam if you do not see the email.
      </p>
      {email && (
        <p className="font-mono text-xs text-ink">{email}</p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onResend(email);
          setNotice(GENERIC_AUTH_SENT);
          setBusy(false);
        }}
        className="h-11 w-full rounded-xl border border-gold px-5 text-sm font-bold text-gold disabled:opacity-60"
      >
        {busy ? "Sending…" : "Resend confirmation"}
      </button>
      {notice && <p className="text-sm text-teal-soft">{notice}</p>}
    </div>
  );
}
