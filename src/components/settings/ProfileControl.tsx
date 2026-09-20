"use client";

import { useId, useState } from "react";
import { Save } from "lucide-react";
import { updateMyProfile } from "@/lib/supabase/profile";

export function ProfileControl({
  userId,
  fullName,
  phone,
  website,
  bio,
  onSaved,
}: {
  userId: string;
  fullName: string;
  phone: string;
  website: string;
  bio: string;
  onSaved?: () => void;
}) {
  const statusId = useId();
  const [f, setF] = useState({ fullName, phone, website, bio });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="mx-auto max-w-md space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setNote("");
        setError("");
        try {
          await updateMyProfile(userId, {
            fullName: f.fullName,
            phone: f.phone,
            website: f.website,
            bio: f.bio,
          });
          setNote("Saved.");
          setTimeout(() => setNote(""), 2000);
          onSaved?.();
        } catch {
          setError("Couldn't save your profile. Try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="s-name" className="block">
        <span className="type-control block text-[var(--muted)]">Display name</span>
        <input
          id="s-name"
          name="displayName"
          type="text"
          autoComplete="name"
          value={f.fullName}
          onChange={(e) => setF((p) => ({ ...p, fullName: e.target.value }))}
          className="field-input mt-1.5"
        />
      </label>
      <p className="text-[11px] text-[var(--muted)]">
        Display name is public. It is not your legal name or @username.
      </p>

      <label htmlFor="s-phone" className="block">
        <span className="type-control block text-[var(--muted)]">Phone</span>
        <input
          id="s-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={f.phone}
          onChange={(e) => setF((p) => ({ ...p, phone: e.target.value }))}
          className="field-input mt-1.5"
        />
      </label>

      <label htmlFor="s-web" className="block">
        <span className="type-control block text-[var(--muted)]">Website</span>
        <input
          id="s-web"
          name="website"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="https://"
          value={f.website}
          onChange={(e) => setF((p) => ({ ...p, website: e.target.value }))}
          className="field-input mt-1.5"
        />
      </label>

      <label htmlFor="s-bio" className="block">
        <span className="type-control block text-[var(--muted)]">Bio</span>
        <textarea
          id="s-bio"
          name="bio"
          rows={3}
          value={f.bio}
          onChange={(e) => setF((p) => ({ ...p, bio: e.target.value }))}
          className="field-input mt-1.5 h-auto py-2"
        />
      </label>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 bg-[var(--background)] py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="submit"
          disabled={busy}
          aria-describedby={statusId}
          className="story-press inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60"
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
