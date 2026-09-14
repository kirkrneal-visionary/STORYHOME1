"use client";

import { useState } from "react";
import { Building2, Save } from "lucide-react";
import { RosterManager } from "@/components/office/RosterManager";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { TextAreaField, TextField } from "@/components/broker/ui";
import {
  createBrokerage,
  updateBrokerage,
  type Brokerage,
} from "@/lib/supabase/brokerage";

export function OfficeWorkspace({
  brokerId,
  brokerTrecLicense,
  brokerage,
  onSaved,
}: {
  brokerId: string;
  brokerTrecLicense: string | null;
  brokerage: Brokerage | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(brokerage?.name ?? "");
  const [f, setF] = useState({
    about: brokerage?.about ?? "",
    address: brokerage?.address ?? "",
    city: brokerage?.city ?? "",
    state: brokerage?.state ?? "TX",
    zip: brokerage?.zip ?? "",
    website: brokerage?.website ?? "",
    phone: brokerage?.phone ?? "",
    logoUrl: brokerage?.logoUrl ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  return (
    <SettingsCard
      icon={Building2}
      title="Brokerage identity"
      subtitle="Office name and branding. This is not Story Pro."
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            if (!brokerage) {
              const created = await createBrokerage(
                brokerId,
                name.trim() || "My Brokerage",
              );
              await updateBrokerage(created.id, {
                ...f,
                logoUrl: f.logoUrl || null,
              });
            } else {
              await updateBrokerage(brokerage.id, {
                name: name.trim(),
                ...f,
                logoUrl: f.logoUrl || null,
              });
            }
            setNote("Saved.");
            setTimeout(() => setNote(""), 2000);
            onSaved();
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField id="b-name" label="Brokerage name" value={name} onChange={setName} />
          <TextField
            id="b-logo"
            label="Logo URL"
            value={f.logoUrl}
            onChange={(v) => setF((p) => ({ ...p, logoUrl: v }))}
          />
          <TextField
            id="b-addr"
            label="Office address"
            value={f.address}
            onChange={(v) => setF((p) => ({ ...p, address: v }))}
          />
          <TextField
            id="b-city"
            label="City"
            value={f.city}
            onChange={(v) => setF((p) => ({ ...p, city: v }))}
          />
          <TextField
            id="b-state"
            label="State"
            value={f.state}
            onChange={(v) => setF((p) => ({ ...p, state: v }))}
          />
          <TextField
            id="b-zip"
            label="ZIP"
            value={f.zip}
            onChange={(v) => setF((p) => ({ ...p, zip: v }))}
          />
          <TextField
            id="b-web"
            label="Website"
            value={f.website}
            onChange={(v) => setF((p) => ({ ...p, website: v }))}
          />
          <TextField
            id="b-phone"
            label="Phone"
            value={f.phone}
            onChange={(v) => setF((p) => ({ ...p, phone: v }))}
          />
        </div>
        <div className="mt-3">
          <TextAreaField
            id="b-about"
            label="About the brokerage"
            rows={4}
            value={f.about}
            onChange={(v) => setF((p) => ({ ...p, about: v }))}
          />
        </div>
        {brokerage?.slug && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Public page: <span className="font-mono text-ink">/b/{brokerage.slug}</span>
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="story-press inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save"}
          </button>
          {note && <span className="text-sm text-teal-soft">{note}</span>}
        </div>
      </form>

      {brokerage ? (
        <div className="mt-6 border-t border-hairline pt-5">
          <RosterManager
            brokerageId={brokerage.id}
            brokerId={brokerId}
            brokerTrecLicense={brokerTrecLicense}
          />
        </div>
      ) : (
        <p className="mt-4 text-xs text-[var(--muted)]">
          Save the brokerage first to start the roster.
        </p>
      )}
    </SettingsCard>
  );
}
