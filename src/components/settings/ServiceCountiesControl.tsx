"use client";

import { useEffect, useId, useState } from "react";
import { Check, Save } from "lucide-react";
import { STORY_PRO_SETTINGS_BLOCKED } from "@/lib/account/assurance";
import { isProfessionalLaunchCountyFips } from "@/lib/account/professional-geography";
import { SERVICE_COUNTIES } from "@/lib/markets";

function countyLabel(name: string) {
  return name.replace(/ County$/i, "");
}

export function ServiceCountiesControl({ canEdit }: { canEdit: boolean }) {
  const statusId = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/service-counties");
        const data = (await res.json()) as {
          ok?: boolean;
          serviceCountyFips?: string[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Unable to load.");
          return;
        }
        setSelected(
          (data.serviceCountyFips ?? []).filter(isProfessionalLaunchCountyFips),
        );
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

  return (
    <form
      className="mx-auto max-w-md space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setNote("");
        setError("");
        try {
          const res = await fetch("/api/account/service-counties", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ serviceCountyFips: selected }),
          });
          const data = (await res.json()) as {
            ok?: boolean;
            serviceCountyFips?: string[];
            error?: string;
            code?: string;
          };
          if (!res.ok || !data.ok) {
            setError(
              data.code === "needs_mfa"
                ? STORY_PRO_SETTINGS_BLOCKED
                : (data.error ?? "Unable to save."),
            );
            return;
          }
          setSelected(
            (data.serviceCountyFips ?? []).filter(isProfessionalLaunchCountyFips),
          );
          setNote("Saved.");
          setTimeout(() => setNote(""), 2000);
        } catch {
          setError("Unable to save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-[var(--muted)]">
        Choose the counties where you currently provide professional service.
        This does not change your public Service Areas text.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Service counties">
        {SERVICE_COUNTIES.map((county) => {
          const on = selected.includes(county.fips);
          const label = countyLabel(county.name);
          return (
            <button
              key={county.fips}
              type="button"
              aria-pressed={on}
              aria-label={county.name}
              onClick={() =>
                setSelected((cur) =>
                  cur.includes(county.fips)
                    ? cur.filter((fips) => fips !== county.fips)
                    : [...cur, county.fips],
                )
              }
              className={
                on
                  ? "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gold bg-gold/15 px-3 text-sm font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  : "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-hairline px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              }
            >
              {on ? <Check className="h-4 w-4 text-gold" aria-hidden="true" /> : null}
              {label}
              <span className="sr-only">{on ? "selected" : "not selected"}</span>
            </button>
          );
        })}
      </div>
      <div className="sticky bottom-[var(--story-bottom-clearance)] z-10 flex flex-wrap items-center gap-3 bg-[var(--background)] py-3">
        <button
          type="submit"
          disabled={busy}
          aria-describedby={statusId}
          className="story-press inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {busy ? "Saving…" : "Save"}
        </button>
        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className={error ? "text-sm text-red-300" : "text-sm text-teal-soft"}
        >
          {error || note}
        </p>
      </div>
    </form>
  );
}
