"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  Copy,
  Megaphone,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { LeadsInbox } from "@/components/broker/LeadsInbox";
import { formatUsd } from "@/lib/demo-data";
import {
  CheckboxField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/broker/ui";
import {
  addActivity,
  addBuyer,
  addCampaign,
  BUYER_STAGES,
  deleteBuyer,
  deleteCampaign,
  LEAD_SOURCES,
  listActivities,
  listBuyers,
  listCampaigns,
  setActivityDone,
  updateBuyer,
  type Buyer,
  type BuyerInput,
  type CrmActivity,
  type CrmCampaign,
} from "@/lib/supabase/crm";
import { cn } from "@/lib/utils";

const STAGE_TONE: Record<string, string> = {
  "New lead": "bg-[color-mix(in_srgb,var(--gold)_22%,var(--surface))] text-gold",
  Nurturing: "bg-[var(--surface)] text-[var(--muted)]",
  "Actively touring": "bg-gold text-navy",
  "Offer out": "bg-teal text-paper",
  "Under contract": "bg-teal-soft text-paper",
  Closed: "bg-[var(--muted)]/20 text-[var(--muted)]",
};

export function MyBuyersView() {
  const { user } = useAuth();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState<string>("All");
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setBuyers(await listBuyers(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = stage === "All" ? buyers : buyers.filter((b) => b.stage === stage);

  return (
    <div className="space-y-6">
      <LeadsInbox />
      {user && <CampaignPanel agentId={user.id} />}

      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">My pipeline</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {buyers.length} buyer{buyers.length === 1 ? "" : "s"} in your CRM.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-contrast)]"
        >
          <Plus className="h-4 w-4" /> Add buyer
        </button>
      </div>

      {adding && user && (
        <AddBuyerForm
          onCancel={() => setAdding(false)}
          onSave={async (input) => {
            await addBuyer(user.id, input);
            setAdding(false);
            await refresh();
          }}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {(["All", ...BUYER_STAGES] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStage(item)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 font-mono text-[11px] font-semibold tracking-wide uppercase transition-colors",
              stage === item
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "border border-hairline text-[var(--muted)] hover:text-ink",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <Empty text="Loading your pipeline…" />
      ) : filtered.length === 0 ? (
        <Empty text={buyers.length === 0 ? "No buyers yet. Add your first lead, or create a campaign to capture them." : "No buyers in this stage."} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((buyer) => (
            <BuyerCard key={buyer.id} buyer={buyer} agentId={user!.id} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddBuyerForm({ onSave, onCancel }: { onSave: (b: BuyerInput) => Promise<void>; onCancel: () => void }) {
  const [f, setF] = useState<BuyerInput>({
    name: "", stage: "New lead", budgetMin: 0, budgetMax: 0, targetAreas: [],
    minBeds: 0, propertyType: "Single Family", preApproved: false, note: "",
    source: "Website", email: "", phone: "",
  });
  const [areas, setAreas] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof BuyerInput>(k: K, v: BuyerInput[K]) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div className="story-surface p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="b-name" label="Name" value={f.name} onChange={(v) => set("name", v)} />
        <SelectField id="b-src" label="Lead source" value={f.source} onChange={(v) => set("source", v)} options={LEAD_SOURCES.map((s) => ({ value: s, label: s }))} />
        <TextField id="b-email" label="Email" value={f.email} onChange={(v) => set("email", v)} />
        <TextField id="b-phone" label="Phone" value={f.phone} onChange={(v) => set("phone", v)} />
        <NumberField id="b-min" label="Budget min" prefix="$" value={String(f.budgetMin || "")} onChange={(v) => set("budgetMin", Number(v) || 0)} />
        <NumberField id="b-max" label="Budget max" prefix="$" value={String(f.budgetMax || "")} onChange={(v) => set("budgetMax", Number(v) || 0)} />
        <NumberField id="b-beds" label="Min beds" value={String(f.minBeds || "")} onChange={(v) => set("minBeds", Number(v) || 0)} />
        <SelectField id="b-type" label="Property type" value={f.propertyType} onChange={(v) => set("propertyType", v)} options={["Single Family", "Farm and Ranch", "Condo", "Town Home"].map((o) => ({ value: o, label: o }))} />
        <TextField id="b-areas" label="Target areas (comma-separated)" value={areas} onChange={setAreas} />
        <SelectField id="b-stage" label="Stage" value={f.stage} onChange={(v) => set("stage", v)} options={BUYER_STAGES.map((s) => ({ value: s, label: s }))} />
      </div>
      <div className="mt-3">
        <TextAreaField id="b-note" label="Note" rows={2} value={f.note} onChange={(v) => set("note", v)} />
      </div>
      <div className="mt-2">
        <CheckboxField id="b-pre" label="Pre-approved" checked={f.preApproved} onChange={(v) => set("preApproved", v)} />
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy || !f.name.trim()}
          onClick={async () => {
            setBusy(true);
            try { await onSave({ ...f, targetAreas: areas.split(",").map((a) => a.trim()).filter(Boolean) }); }
            finally { setBusy(false); }
          }}
          className="h-10 rounded-lg bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save buyer"}
        </button>
        <button type="button" onClick={onCancel} className="h-10 rounded-lg border border-hairline px-5 text-sm font-semibold text-ink">Cancel</button>
      </div>
    </div>
  );
}

function BuyerCard({ buyer, agentId, onChanged }: { buyer: Buyer; agentId: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [note, setNote] = useState("");
  const [kind, setKind] = useState<CrmActivity["kind"]>("note");

  const loadActs = useCallback(async () => {
    setActivities(await listActivities(agentId, "buyer", buyer.id));
  }, [agentId, buyer.id]);

  useEffect(() => {
    if (open) void loadActs();
  }, [open, loadActs]);

  return (
    <article className="story-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-serif text-lg font-bold text-ink">{buyer.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-[var(--muted)]">
            {buyer.preApproved && (<span className="inline-flex items-center gap-1 text-teal-soft"><BadgeCheck className="h-3.5 w-3.5" /> Pre-approved</span>)}
            {buyer.source && <span className="rounded-full border border-hairline px-2 py-0.5">{buyer.source}</span>}
          </p>
        </div>
        <select
          value={buyer.stage}
          onChange={async (e) => { await updateBuyer(buyer.id, { stage: e.target.value }); onChanged(); }}
          className={cn("shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase outline-none", STAGE_TONE[buyer.stage] ?? "bg-[var(--surface)] text-[var(--muted)]")}
        >
          {BUYER_STAGES.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 font-mono text-[11px]">
        <Fact label="Budget" value={buyer.budgetMax ? `${formatUsd(buyer.budgetMin)}–${formatUsd(buyer.budgetMax)}` : "—"} />
        <Fact label="Wants" value={`${buyer.minBeds || 0}+ bd · ${buyer.propertyType ?? "—"}`} />
        <Fact label="Areas" value={buyer.targetAreas.join(", ") || "—"} />
      </div>

      {buyer.note && <p className="mt-3 text-sm text-[var(--muted)]">{buyer.note}</p>}
      {(buyer.email || buyer.phone) && (
        <p className="mt-2 font-mono text-[11px] text-[var(--muted)]">{[buyer.email, buyer.phone].filter(Boolean).join(" · ")}</p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /> Activity {activities.length ? `(${activities.length})` : ""}
        </button>
        <button type="button" onClick={async () => { if (confirm("Delete this buyer?")) { await deleteBuyer(buyer.id); onChanged(); } }} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-red-300">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value as CrmActivity["kind"])} className="h-9 rounded-lg border border-hairline bg-[var(--surface)] px-2 text-xs text-ink">
              {(["note", "call", "text", "email", "task"] as const).map((k) => (<option key={k} value={k}>{k}</option>))}
            </select>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Log a note, call, or task…" className="h-9 flex-1 rounded-lg border border-hairline bg-[var(--surface)] px-3 text-sm text-ink outline-none focus:border-gold" />
            <button type="button" onClick={async () => { if (!note.trim()) return; await addActivity(agentId, { subjectType: "buyer", subjectId: buyer.id, kind, body: note.trim() }); setNote(""); await loadActs(); }} className="h-9 rounded-lg bg-gold px-3 text-xs font-bold text-navy">Add</button>
          </div>
          {activities.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No activity yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {activities.map((a) => (
                <li key={a.id} className="flex items-start gap-2 story-well p-2 text-xs">
                  {a.kind === "task" && (
                    <input type="checkbox" checked={a.done} onChange={async (e) => { await setActivityDone(a.id, e.target.checked); await loadActs(); }} className="mt-0.5" />
                  )}
                  <span className="flex-1">
                    <span className="font-mono text-[10px] uppercase text-[var(--muted)]">{a.kind}</span>{" "}
                    <span className={cn("text-ink", a.done && "line-through opacity-60")}>{a.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function CampaignPanel({ agentId }: { agentId: string }) {
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CrmCampaign[]>([]);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("google");
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => { setCampaigns(await listCampaigns(agentId)); }, [agentId]);
  useEffect(() => { if (open) void refresh(); }, [open, refresh]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkFor = (c: CrmCampaign) =>
    `${origin}/?utm_source=${encodeURIComponent(c.utmSource ?? c.channel)}&utm_medium=${encodeURIComponent(c.utmMedium ?? "paid")}&utm_campaign=${encodeURIComponent(c.utmCampaign ?? "")}&ref=${c.id}`;

  return (
    <div className="story-surface">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between p-4">
        <span className="inline-flex items-center gap-2 font-serif text-lg font-bold text-ink"><Megaphone className="h-5 w-5 text-[var(--muted)]" /> Lead sources & campaigns</span>
        <ChevronDown className={cn("h-5 w-5 text-[var(--muted)] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-hairline p-4">
          <p className="text-xs text-[var(--muted)]">
            Create a trackable link for your Google/Facebook/Instagram ads. Leads who arrive through it are tagged to the campaign so you can see what's working. (Automated ad‑buying &amp; drip messaging connect later via provider APIs.)
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name (e.g. Livingston Buyers Q3)" className="field-input h-9 min-w-[220px] flex-1" />
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="field-input h-9 w-auto">
              {["google", "facebook", "instagram", "zillow", "referral", "other"].map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <button type="button" onClick={async () => { if (!name.trim()) return; await addCampaign(agentId, { name: name.trim(), channel }); setName(""); await refresh(); }} className="h-9 rounded-lg bg-gold px-4 text-sm font-bold text-navy">Create</button>
          </div>
          <ul className="mt-3 space-y-2">
            {campaigns.map((c) => (
              <li key={c.id} className="story-well p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{c.name} <span className="font-mono text-[10px] uppercase text-[var(--muted)]">· {c.channel}</span></span>
                  <button type="button" onClick={async () => { await deleteCampaign(c.id); await refresh(); }} className="text-xs text-[var(--muted)] hover:text-red-300">Delete</button>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-[var(--surface)] px-2 py-1 font-mono text-[10px] text-[var(--muted)]">{linkFor(c)}</code>
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(linkFor(c)); setCopied(c.id); setTimeout(() => setCopied(null), 1500); }} className="inline-flex items-center gap-1 rounded border border-hairline px-2 py-1 text-[10px] font-semibold text-ink">
                    <Copy className="h-3 w-3" /> {copied === c.id ? "Copied" : "Copy"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="story-well p-2.5">
      <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <span className="mt-1 block text-xs font-semibold text-ink">{value}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="story-well border-dashed p-10 text-center text-sm font-medium text-[var(--muted)]">
      {text}
    </div>
  );
}
