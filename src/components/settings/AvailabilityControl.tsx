"use client";

import { useEffect, useId, useState } from "react";
import { STORY_PRO_SETTINGS_BLOCKED } from "@/lib/account/assurance";

type Choice = "available" | "temporarily_unavailable";
type Own = { ok?: boolean; availability?: Choice | null; error?: string; code?: string };

const CHOICES: [Choice, string, string][] = [
  ["available", "Available", "Want future eligible work when Story Home supports it."],
  ["temporarily_unavailable", "Temporarily Unavailable", "Do not want future eligible work routed to you right now."],
];

function asChoice(value: unknown): Choice | null {
  return value === "available" || value === "temporarily_unavailable" ? value : null;
}

export function AvailabilityControl({ canEdit }: { canEdit: boolean }) {
  const statusId = useId();
  const [saved, setSaved] = useState<Choice | null>(null);
  const [pick, setPick] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/availability");
        const data = (await res.json()) as Own;
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Unable to load.");
          return;
        }
        const next = asChoice(data.availability);
        setSaved(next);
        setPick(next);
      } catch {
        if (!cancelled) setError("Unable to load.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!canEdit) {
    return (
      <p className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-ink">
        {STORY_PRO_SETTINGS_BLOCKED}
      </p>
    );
  }

  const dirty = pick !== null && pick !== saved;
  const current = CHOICES.find(([value]) => value === saved)?.[1] ?? "Not configured";

  return (
    <form
      className="mx-auto max-w-md space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!pick || !dirty) return;
        setBusy(true);
        setError("");
        try {
          const res = await fetch("/api/account/availability", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ availability: pick }),
          });
          const data = (await res.json()) as Own;
          if (!res.ok || !data.ok) {
            setError(data.code === "needs_mfa" ? STORY_PRO_SETTINGS_BLOCKED : (data.error ?? "Unable to save."));
            return;
          }
          const next = asChoice(data.availability) ?? pick;
          setSaved(next);
          setPick(next);
        } catch {
          setError("Unable to save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-[var(--muted)]">
        Choose whether you currently want future eligible work. This is your preference, not eligibility.
      </p>
      <section className="rounded-xl border border-hairline px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Current availability</h2>
        <p className="mt-1 text-sm font-semibold text-ink">{current}</p>
      </section>
      <div role="radiogroup" aria-label="Availability" className="space-y-2">
        {CHOICES.map(([value, title, copy]) => {
          const on = pick === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={title}
              onClick={() => setPick(value)}
              className={`flex min-h-11 w-full flex-col items-start rounded-xl border px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                on ? "border-gold bg-gold/15" : "border-hairline"
              }`}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <span
                  className={on ? "h-2.5 w-2.5 rounded-full bg-gold" : "h-2.5 w-2.5 rounded-full border border-hairline"}
                  aria-hidden="true"
                />
                {title}
              </span>
              <span className="mt-1 text-xs text-[var(--muted)]">{copy}</span>
              <span className="sr-only">{on ? "selected" : "not selected"}</span>
            </button>
          );
        })}
      </div>
      <div className="sticky bottom-[var(--story-bottom-clearance)] z-10 flex flex-wrap items-center gap-3 bg-[var(--background)] py-3">
        <button
          type="submit"
          disabled={busy || !dirty}
          aria-describedby={statusId}
          className="story-press inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <p id={statusId} role="status" aria-live="polite" className="text-sm text-red-300">
          {error}
        </p>
      </div>
    </form>
  );
}
