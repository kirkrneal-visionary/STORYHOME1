"use client";

import { useId, useState } from "react";
import { Save } from "lucide-react";
import { STORY_PRO_SETTINGS_BLOCKED } from "@/lib/account/assurance";

const toList = (s: string) =>
  s.split(",").map((x) => x.trim()).filter(Boolean);
const fromList = (a: string[]) => a.join(", ");

export function ProfessionalProfileControl({
  specialties,
  serviceAreas,
  languages,
  designations,
  primaryMarketCity,
  canEdit,
  onSaved,
}: {
  specialties: string[];
  serviceAreas: string[];
  languages: string[];
  designations: string[];
  primaryMarketCity: string;
  canEdit: boolean;
  onSaved?: () => void;
}) {
  const statusId = useId();
  const [f, setF] = useState({
    specialties: fromList(specialties),
    serviceAreas: fromList(serviceAreas),
    languages: fromList(languages),
    designations: fromList(designations),
    primaryMarketCity,
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

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
          const res = await fetch("/api/account/story-pro-profile", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              specialties: toList(f.specialties),
              serviceAreas: toList(f.serviceAreas),
              languages: toList(f.languages),
              designations: toList(f.designations),
              primaryMarketCity: f.primaryMarketCity,
            }),
          });
          const data = (await res.json()) as { ok?: boolean; error?: string };
          if (!res.ok || !data.ok) {
            setError(data.error ?? STORY_PRO_SETTINGS_BLOCKED);
            return;
          }
          setF({
            specialties: fromList(toList(f.specialties)),
            serviceAreas: fromList(toList(f.serviceAreas)),
            languages: fromList(toList(f.languages)),
            designations: fromList(toList(f.designations)),
            primaryMarketCity: f.primaryMarketCity,
          });
          setNote("Saved.");
          setTimeout(() => setNote(""), 2000);
          onSaved?.();
        } catch {
          setError("Couldn't save your professional profile. Try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-[11px] text-[var(--muted)]">
        Shown on your public profile. Separate lists with commas.
      </p>

      <label htmlFor="s-market" className="block">
        <span className="type-control block text-[var(--muted)]">
          Primary market city
        </span>
        <input
          id="s-market"
          name="primaryMarketCity"
          type="text"
          autoComplete="address-level2"
          value={f.primaryMarketCity}
          onChange={(e) =>
            setF((p) => ({ ...p, primaryMarketCity: e.target.value }))
          }
          className="field-input mt-1.5"
        />
      </label>

      <label htmlFor="s-spec" className="block">
        <span className="type-control block text-[var(--muted)]">Specialties</span>
        <input
          id="s-spec"
          name="specialties"
          type="text"
          value={f.specialties}
          onChange={(e) => setF((p) => ({ ...p, specialties: e.target.value }))}
          className="field-input mt-1.5"
        />
      </label>

      <label htmlFor="s-areas" className="block">
        <span className="type-control block text-[var(--muted)]">Service areas</span>
        <input
          id="s-areas"
          name="serviceAreas"
          type="text"
          value={f.serviceAreas}
          onChange={(e) => setF((p) => ({ ...p, serviceAreas: e.target.value }))}
          className="field-input mt-1.5"
        />
      </label>

      <label htmlFor="s-lang" className="block">
        <span className="type-control block text-[var(--muted)]">Languages</span>
        <input
          id="s-lang"
          name="languages"
          type="text"
          value={f.languages}
          onChange={(e) => setF((p) => ({ ...p, languages: e.target.value }))}
          className="field-input mt-1.5"
        />
      </label>

      <label htmlFor="s-desig" className="block">
        <span className="type-control block text-[var(--muted)]">Designations</span>
        <input
          id="s-desig"
          name="designations"
          type="text"
          value={f.designations}
          onChange={(e) =>
            setF((p) => ({ ...p, designations: e.target.value }))
          }
          className="field-input mt-1.5"
        />
      </label>

      <div className="sticky bottom-[var(--story-bottom-clearance)] z-10 flex flex-wrap items-center gap-3 bg-[var(--background)] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
