"use client";

import { useEffect, useId, useState } from "react";
import { STORY_PRO_SETTINGS_BLOCKED } from "@/lib/account/assurance";
import { isProfessionalLaunchCountyFips } from "@/lib/account/professional-geography";
import { SERVICE_COUNTIES, getCountyByFips } from "@/lib/markets";

type OwnState = {
  ok?: boolean;
  effectiveCountyFips?: string | null;
  pendingCountyFips?: string | null;
  requestStatus?: string;
  error?: string;
  code?: string;
};

function countyName(fips: string | null | undefined) {
  if (!fips || !isProfessionalLaunchCountyFips(fips)) return null;
  return getCountyByFips(fips)?.name ?? null;
}

function chipLabel(name: string) {
  return name.replace(/ County$/i, "");
}

export function PrimaryCountyControl({ canEdit }: { canEdit: boolean }) {
  const statusId = useId();
  const [effective, setEffective] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [status, setStatus] = useState("not_set");
  const [candidate, setCandidate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function apply(data: OwnState) {
    setEffective(
      data.effectiveCountyFips && isProfessionalLaunchCountyFips(data.effectiveCountyFips)
        ? data.effectiveCountyFips
        : null,
    );
    setPending(
      data.pendingCountyFips && isProfessionalLaunchCountyFips(data.pendingCountyFips)
        ? data.pendingCountyFips
        : null,
    );
    setStatus(data.requestStatus ?? "not_set");
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/account/primary-county");
        const data = (await res.json()) as OwnState;
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Unable to load.");
          return;
        }
        apply(data);
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

  const effectiveName = countyName(effective);
  const pendingName = countyName(pending);

  return (
    <form
      className="mx-auto max-w-md space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!candidate) return;
        setBusy(true);
        setError("");
        try {
          const res = await fetch("/api/account/primary-county", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ countyFips: candidate }),
          });
          const data = (await res.json()) as OwnState;
          if (!res.ok || !data.ok) {
            setError(
              data.code === "needs_mfa"
                ? STORY_PRO_SETTINGS_BLOCKED
                : (data.error ?? "Unable to request."),
            );
            return;
          }
          apply(data);
        } catch {
          setError("Unable to request.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-[var(--muted)]">
        Request the launch county where you are primarily based. Story Home
        reviews the request. This does not change Service Counties.
      </p>
      <section className="rounded-xl border border-hairline px-4 py-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          Current Primary County
        </h2>
        <p className="mt-1 text-sm font-semibold text-ink">
          {effectiveName ?? "Primary County not set"}
        </p>
      </section>
      {pendingName ? (
        <section className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            Pending request
          </h2>
          <p className="mt-1 text-sm font-semibold text-ink">{pendingName}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Awaiting Story Home review
          </p>
        </section>
      ) : status === "rejected" ? (
        <p className="text-sm text-[var(--muted)]">
          Previous request was not approved.
        </p>
      ) : null}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          New request
        </p>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Request Primary County"
        >
          {SERVICE_COUNTIES.map((county) => {
            const on = candidate === county.fips;
            return (
              <button
                key={county.fips}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={county.name}
                onClick={() => setCandidate(county.fips)}
                className={
                  on
                    ? "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gold bg-gold/15 px-3 text-sm font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    : "inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-hairline px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                }
              >
                <span
                  className={
                    on
                      ? "h-2.5 w-2.5 rounded-full bg-gold"
                      : "h-2.5 w-2.5 rounded-full border border-hairline"
                  }
                  aria-hidden="true"
                />
                {chipLabel(county.name)}
                <span className="sr-only">{on ? "selected" : "not selected"}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="sticky bottom-[var(--story-bottom-clearance)] z-10 flex flex-wrap items-center gap-3 bg-[var(--background)] py-3">
        <button
          type="submit"
          disabled={busy || !candidate}
          aria-describedby={statusId}
          className="story-press inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60"
        >
          {busy ? "Requesting…" : "Request Primary County"}
        </button>
        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className="text-sm text-red-300"
        >
          {error}
        </p>
      </div>
    </form>
  );
}
