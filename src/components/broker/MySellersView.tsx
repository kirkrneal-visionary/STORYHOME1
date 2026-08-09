"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronDown, KeyRound, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { formatUsd } from "@/lib/demo-data";
import { NumberField, SelectField, TextAreaField, TextField } from "@/components/broker/ui";
import {
  addActivity,
  addSeller,
  deleteSeller,
  listActivities,
  listSellers,
  SELLER_STAGES,
  LEAD_SOURCES,
  updateSeller,
  type CrmActivity,
  type SellerClient,
  type SellerInput,
} from "@/lib/supabase/crm";
import { cn } from "@/lib/utils";

const STAGE_TONE: Record<string, string> = {
  Prospect: "bg-[var(--surface)] text-[var(--muted)]",
  "Listing prep": "bg-[color-mix(in_srgb,var(--gold)_22%,var(--surface))] text-gold",
  Active: "bg-gold text-navy",
  "Offer review": "bg-teal text-paper",
  "Under contract": "bg-teal-soft text-paper",
  Closed: "bg-[var(--muted)]/20 text-[var(--muted)]",
};

export function MySellersView() {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<SellerClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<string>("All");
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try { setSellers(await listSellers(user.id)); } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const filtered = stage === "All" ? sellers : sellers.filter((s) => s.stage === stage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">My Sellers</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{sellers.length} seller{sellers.length === 1 ? "" : "s"} in your book.</p>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-contrast)]">
          <Plus className="h-4 w-4" /> Add seller
        </button>
      </div>

      {adding && user && (
        <AddSellerForm onCancel={() => setAdding(false)} onSave={async (input) => { await addSeller(user.id, input); setAdding(false); await refresh(); }} />
      )}

      <div className="flex flex-wrap gap-2">
        {(["All", ...SELLER_STAGES] as const).map((item) => (
          <button key={item} type="button" onClick={() => setStage(item)} className={cn("h-8 shrink-0 rounded-full px-3 font-mono text-[11px] font-semibold uppercase transition-colors", stage === item ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "border border-hairline text-[var(--muted)] hover:text-ink")}>
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <Empty text="Loading your sellers…" />
      ) : filtered.length === 0 ? (
        <Empty text={sellers.length === 0 ? "No sellers yet. Add your first seller lead." : "No sellers in this stage."} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((s) => (<SellerCard key={s.id} seller={s} agentId={user!.id} onChanged={refresh} />))}
        </div>
      )}
    </div>
  );
}

function AddSellerForm({ onSave, onCancel }: { onSave: (s: SellerInput) => Promise<void>; onCancel: () => void }) {
  const [f, setF] = useState<SellerInput>({ name: "", stage: "Prospect", listPrice: 0, nextAction: "", source: "Website", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof SellerInput>(k: K, v: SellerInput[K]) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="s-name" label="Name" value={f.name} onChange={(v) => set("name", v)} />
        <SelectField id="s-src" label="Lead source" value={f.source} onChange={(v) => set("source", v)} options={LEAD_SOURCES.map((s) => ({ value: s, label: s }))} />
        <TextField id="s-email" label="Email" value={f.email} onChange={(v) => set("email", v)} />
        <TextField id="s-phone" label="Phone" value={f.phone} onChange={(v) => set("phone", v)} />
        <NumberField id="s-price" label="Target list price" prefix="$" value={String(f.listPrice || "")} onChange={(v) => set("listPrice", Number(v) || 0)} />
        <SelectField id="s-stage" label="Stage" value={f.stage} onChange={(v) => set("stage", v)} options={SELLER_STAGES.map((s) => ({ value: s, label: s }))} />
      </div>
      <div className="mt-3"><TextAreaField id="s-next" label="Next action" rows={2} value={f.nextAction} onChange={(v) => set("nextAction", v)} /></div>
      <div className="mt-4 flex gap-2">
        <button type="button" disabled={busy || !f.name.trim()} onClick={async () => { setBusy(true); try { await onSave(f); } finally { setBusy(false); } }} className="h-10 rounded-lg bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60">{busy ? "Saving…" : "Save seller"}</button>
        <button type="button" onClick={onCancel} className="h-10 rounded-lg border border-hairline px-5 text-sm font-semibold text-ink">Cancel</button>
      </div>
    </div>
  );
}

function SellerCard({ seller, agentId, onChanged }: { seller: SellerClient; agentId: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [note, setNote] = useState("");

  const loadActs = useCallback(async () => { setActivities(await listActivities(agentId, "seller", seller.id)); }, [agentId, seller.id]);
  useEffect(() => { if (open) void loadActs(); }, [open, loadActs]);

  return (
    <article className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-serif text-lg font-bold text-ink">{seller.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-[var(--muted)]">
            {seller.listPrice ? <span className="font-bold text-ink">{formatUsd(seller.listPrice)}</span> : null}
            {seller.source && <span className="rounded-full border border-hairline px-2 py-0.5">{seller.source}</span>}
            {seller.accessCode && <span className="inline-flex items-center gap-1"><KeyRound className="h-3 w-3" /> {seller.accessCode}</span>}
          </p>
        </div>
        <select value={seller.stage} onChange={async (e) => { await updateSeller(seller.id, { stage: e.target.value }); onChanged(); }} className={cn("shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase outline-none", STAGE_TONE[seller.stage] ?? "bg-[var(--surface)] text-[var(--muted)]")}>
          {SELLER_STAGES.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
      </div>

      {seller.nextAction && (
        <p className="mt-3 flex items-start gap-2 text-sm text-ink"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span><span className="font-semibold">Next:</span> {seller.nextAction}</span></p>
      )}
      {(seller.email || seller.phone) && (<p className="mt-2 font-mono text-[11px] text-[var(--muted)]">{[seller.email, seller.phone].filter(Boolean).join(" · ")}</p>)}

      <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /> Activity {activities.length ? `(${activities.length})` : ""}
        </button>
        <div className="flex items-center gap-3">
          {seller.accessCode && (<Link href={`/seller/portal/${seller.accessCode.toLowerCase()}`} className="text-xs font-semibold text-gold">Seller portal</Link>)}
          <button type="button" onClick={async () => { if (confirm("Delete this seller?")) { await deleteSeller(seller.id); onChanged(); } }} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Log a note or next step…" className="h-9 flex-1 rounded-lg border border-hairline bg-[var(--surface)] px-3 text-sm text-ink outline-none focus:border-gold" />
            <button type="button" onClick={async () => { if (!note.trim()) return; await addActivity(agentId, { subjectType: "seller", subjectId: seller.id, kind: "note", body: note.trim() }); setNote(""); await loadActs(); }} className="h-9 rounded-lg bg-gold px-3 text-xs font-bold text-navy">Add</button>
          </div>
          {activities.length === 0 ? (<p className="text-xs text-[var(--muted)]">No activity yet.</p>) : (
            <ul className="space-y-1.5">
              {activities.map((a) => (<li key={a.id} className="rounded-lg border border-hairline bg-[var(--background)] p-2 text-xs"><span className="font-mono text-[10px] uppercase text-[var(--muted)]">{a.kind}</span> <span className="text-ink">{a.body}</span></li>))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return (<div className="rounded-xl border border-dashed border-hairline bg-[var(--surface)] p-10 text-center text-sm font-medium text-[var(--muted)]">{text}</div>);
}
