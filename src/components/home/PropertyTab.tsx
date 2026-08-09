"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, Plus, Save, Trash2 } from "lucide-react";
import {
  addStructure,
  deleteStructure,
  fetchDisclosure,
  fetchStructures,
  saveDisclosure,
  updateHome,
  type Home,
  type HomeStructure,
} from "@/lib/supabase/home";
import {
  DISCLOSURE_SECTIONS,
  type DisclosureQuestion,
} from "@/lib/home-disclosure";
import {
  CheckboxField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/broker/ui";
import { CountyRecordPanel } from "@/components/home/CountyRecordPanel";
import { cn } from "@/lib/utils";

const STRUCTURE_KINDS = [
  "Barn", "Shop", "Shed", "Detached Garage", "Guest House", "Pole Barn", "Other",
];

export function PropertyTab({
  home,
  ownerId,
  onHomeChange,
}: {
  home: Home;
  ownerId: string;
  onHomeChange: () => void;
}) {
  const [structures, setStructures] = useState<HomeStructure[]>([]);
  const [disc, setDisc] = useState<Record<string, unknown>>({});
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    fetchStructures(home.id).then(setStructures).catch(() => setStructures([]));
    fetchDisclosure(home.id).then(setDisc).catch(() => setDisc({}));
  }, [home.id]);

  return (
    <div className="space-y-8">
      {home.address && home.zip && (
        <CountyRecordPanel addressLine={home.address} zip={home.zip} />
      )}
      <LandSection home={home} onSaved={onHomeChange} />
      <StructuresSection
        structures={structures}
        onAdd={async (s) => {
          await addStructure(ownerId, home.id, s);
          setStructures(await fetchStructures(home.id));
        }}
        onDelete={async (id) => {
          await deleteStructure(id);
          setStructures(await fetchStructures(home.id));
        }}
      />
      <DisclosureSection
        value={disc}
        onChange={setDisc}
        onSave={async () => {
          await saveDisclosure(ownerId, home.id, disc);
          setSavedNote("Saved.");
          setTimeout(() => setSavedNote(""), 2000);
        }}
        savedNote={savedNote}
      />
    </div>
  );
}

function LandSection({ home, onSaved }: { home: Home; onSaved: () => void }) {
  const [f, setF] = useState({
    lotAcres: home.lotAcres ?? null,
    waterSource: home.waterSource ?? "",
    sewerType: home.sewerType ?? "",
    roadFrontage: home.roadFrontage ?? "",
    fenced: home.fenced,
    agExemption: home.agExemption,
  });
  const [busy, setBusy] = useState(false);
  return (
    <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <h3 className="font-serif text-xl font-bold text-ink">Land details</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <NumberField id="p-acres" label="Lot size (acres)" step="0.01" value={String(f.lotAcres ?? "")} onChange={(v) => setF((p) => ({ ...p, lotAcres: Number(v) || null }))} />
        <TextField id="p-road" label="Road frontage" value={f.roadFrontage} onChange={(v) => setF((p) => ({ ...p, roadFrontage: v }))} />
        <SelectField id="p-water" label="Water source" value={f.waterSource} onChange={(v) => setF((p) => ({ ...p, waterSource: v }))} options={["", "City", "Well", "MUD", "Co-op"].map((o) => ({ value: o, label: o || "—" }))} />
        <SelectField id="p-sewer" label="Sewer" value={f.sewerType} onChange={(v) => setF((p) => ({ ...p, sewerType: v }))} options={["", "Public sewer", "Septic", "Aerobic septic"].map((o) => ({ value: o, label: o || "—" }))} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <CheckboxField id="p-fenced" label="Fenced" checked={f.fenced} onChange={(v) => setF((p) => ({ ...p, fenced: v }))} />
        <CheckboxField id="p-ag" label="Ag exemption" checked={f.agExemption} onChange={(v) => setF((p) => ({ ...p, agExemption: v }))} />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try { await updateHome(home.id, f); onSaved(); } finally { setBusy(false); }
        }}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60"
      >
        <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save land details"}
      </button>
    </section>
  );
}

function StructuresSection({
  structures, onAdd, onDelete,
}: {
  structures: HomeStructure[];
  onAdd: (s: Partial<HomeStructure>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Partial<HomeStructure>>({ kind: "Barn" });
  const set = <K extends keyof HomeStructure>(k: K, v: HomeStructure[K]) => setF((p) => ({ ...p, [k]: v }));
  return (
    <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl font-bold text-ink">Structures & outbuildings</h3>
        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-contrast)]"><Plus className="h-4 w-4" /> Add</button>
      </div>
      {open && (
        <div className="mt-3 space-y-3 rounded-xl border border-hairline bg-[var(--background)] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField id="st-kind" label="Type" value={f.kind ?? "Barn"} onChange={(v) => set("kind", v)} options={STRUCTURE_KINDS.map((k) => ({ value: k, label: k }))} />
            {f.kind === "Other" && (
              <TextField id="st-other" label="Describe type" value={f.kindOther ?? ""} onChange={(v) => set("kindOther", v)} />
            )}
            <TextField id="st-name" label="Name / label" value={f.name ?? ""} onChange={(v) => set("name", v)} />
            <NumberField id="st-size" label="Size (sqft)" value={String(f.sizeSqft ?? "")} onChange={(v) => set("sizeSqft", Number(v) || null)} />
            <NumberField id="st-year" label="Year built" value={String(f.yearBuilt ?? "")} onChange={(v) => set("yearBuilt", Number(v) || null)} />
          </div>
          <TextAreaField id="st-notes" label="Notes" rows={2} value={f.notes ?? ""} onChange={(v) => set("notes", v)} />
          <button type="button" onClick={async () => { await onAdd(f); setF({ kind: "Barn" }); setOpen(false); }} className="h-10 rounded-lg bg-gold px-5 text-sm font-bold text-navy">Save structure</button>
        </div>
      )}
      {structures.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">No structures added.</p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {structures.map((s) => (
            <div key={s.id} className="flex items-start justify-between rounded-lg border border-hairline bg-[var(--background)] p-3">
              <div>
                <p className="font-semibold text-ink">{s.name || (s.kind === "Other" ? s.kindOther : s.kind)}</p>
                <p className="font-mono text-[11px] text-[var(--muted)] uppercase">
                  {s.kind === "Other" ? s.kindOther : s.kind}
                  {s.sizeSqft ? ` · ${s.sizeSqft.toLocaleString()} sqft` : ""}
                  {s.yearBuilt ? ` · built ${s.yearBuilt}` : ""}
                </p>
                {s.notes && <p className="mt-1 text-sm text-[var(--muted)]">{s.notes}</p>}
              </div>
              <button type="button" onClick={() => onDelete(s.id)} aria-label="Delete" className="text-[var(--muted)] hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function DisclosureSection({
  value, onChange, onSave, savedNote,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  onSave: () => Promise<void>;
  savedNote: string;
}) {
  const set = (id: string, v: unknown) => onChange({ ...value, [id]: v });
  return (
    <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <div className="flex items-center gap-2">
        <Info className="h-5 w-5 text-gold" />
        <h3 className="font-serif text-xl font-bold text-ink">Seller&rsquo;s disclosure (informational)</h3>
      </div>
      <p className="mt-1 rounded-md border border-gold/40 bg-gold/10 p-2.5 text-xs text-ink">
        This is an informational record modeled on the TREC Seller&rsquo;s
        Disclosure Notice. It is not the official signed legal form and is not
        legal advice — but it captures the same info so you&rsquo;re ready to sell.
      </p>

      <div className="mt-4 space-y-5">
        {DISCLOSURE_SECTIONS.map((section) => (
          <details key={section.id} className="rounded-xl border border-hairline bg-[var(--background)] p-4" open={section.id === "items"}>
            <summary className="cursor-pointer font-semibold text-ink">{section.title}</summary>
            {section.intro && <p className="mt-1 text-xs text-[var(--muted)]">{section.intro}</p>}
            <div className="mt-3 space-y-3">
              {section.questions.map((q) => (
                <QuestionField key={q.id} q={q} value={value[q.id]} onChange={(v) => set(q.id, v)} />
              ))}
            </div>
          </details>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={onSave} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-5 text-sm font-bold text-navy"><Save className="h-4 w-4" /> Save disclosure</button>
        {savedNote && <span className="text-sm text-teal-soft">{savedNote}</span>}
      </div>
    </section>
  );
}

function QuestionField({
  q, value, onChange,
}: {
  q: DisclosureQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (q.type === "text") {
    return (
      <TextField id={`q-${q.id}`} label={q.label} value={(value as string) ?? ""} onChange={onChange} />
    );
  }
  if (q.type === "select") {
    return (
      <SelectField id={`q-${q.id}`} label={q.label} value={(value as string) ?? ""} onChange={onChange} options={(q.options ?? []).map((o) => ({ value: o, label: o }))} />
    );
  }
  const options = q.type === "tf" ? ["True", "False"] : ["Yes", "No", "Unknown"];
  return (
    <div>
      <span className="block text-sm text-ink">{q.label}</span>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              value === o
                ? "border-gold bg-gold text-navy"
                : "border-hairline text-ink hover:border-gold/50",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
