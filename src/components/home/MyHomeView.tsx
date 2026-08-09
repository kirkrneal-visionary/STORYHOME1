"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Download,
  FileText,
  Home as HomeIcon,
  Plus,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { formatUsd } from "@/lib/demo-data";
import {
  addDocument,
  addExpense,
  addFolder,
  addRecord,
  compressImageIfNeeded,
  createHome,
  deleteDocument,
  deleteExpense,
  deleteFolder,
  deleteHome,
  deleteRecord,
  exportHomeData,
  fetchAudit,
  fetchDocuments,
  fetchExpenses,
  fetchFolders,
  fetchGrants,
  fetchMyHomes,
  fetchPros,
  fetchRecords,
  findProfileByEmail,
  grantAccess,
  logAudit,
  renameDocument,
  revokeGrant,
  signedUrlFor,
  updateHome,
  uploadHomeFile,
  LOCAL_BANKS,
  type AuditEntry,
  type Home,
  type HomeDocument,
  type HomeExpense,
  type HomeFolder,
  type HomeGrant,
  type HomeRecord,
  type ProContact,
} from "@/lib/supabase/home";
import { PropertyTab } from "@/components/home/PropertyTab";
import {
  CheckboxField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/broker/ui";
import { cn } from "@/lib/utils";

type Tab =
  | "overview"
  | "property"
  | "history"
  | "expenses"
  | "documents"
  | "sharing"
  | "pros";

const RECORD_CATEGORIES = [
  "Roof", "HVAC", "Kitchen", "Bathroom", "Plumbing", "Electrical",
  "Flooring", "Windows", "Landscaping", "Foundation", "Appliance",
  "Maintenance", "Other",
];
const EXPENSE_CATEGORIES = [
  "Maintenance", "Repairs", "Utilities", "Insurance", "Property Tax",
  "HOA", "Improvement", "Other",
];
const DOC_TYPES = ["tax", "insurance", "warranty", "receipt", "deed", "other"];

export function MyHomeView() {
  const { user } = useAuth();
  const [homes, setHomes] = useState<Home[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [addingHome, setAddingHome] = useState(false);

  const [records, setRecords] = useState<HomeRecord[]>([]);
  const [expenses, setExpenses] = useState<HomeExpense[]>([]);
  const [docs, setDocs] = useState<HomeDocument[]>([]);
  const [grants, setGrants] = useState<HomeGrant[]>([]);
  const [folders, setFolders] = useState<HomeFolder[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [pros, setPros] = useState<ProContact[]>([]);

  const activeHome = homes.find((h) => h.id === activeId) ?? null;

  const loadHomes = useCallback(async () => {
    if (!user) return;
    try {
      const list = await fetchMyHomes(user.id);
      setHomes(list);
      setActiveId((cur) => cur || list[0]?.id || "");
    } catch {
      setHomes([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadHomes();
  }, [loadHomes]);

  const loadHomeData = useCallback(async () => {
    if (!activeId) {
      setRecords([]); setExpenses([]); setDocs([]); setGrants([]);
      setFolders([]); setAudit([]);
      return;
    }
    const [r, e, d, g, fo, au] = await Promise.all([
      fetchRecordsSafe(activeId),
      fetchExpensesSafe(activeId),
      fetchDocsSafe(activeId),
      fetchGrantsSafe(activeId),
      fetchFolders(activeId).catch(() => []),
      fetchAudit(activeId).catch(() => []),
    ]);
    setRecords(r); setExpenses(e); setDocs(d); setGrants(g);
    setFolders(fo); setAudit(au);
  }, [activeId]);

  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  useEffect(() => {
    fetchPros().then(setPros).catch(() => setPros([]));
  }, []);

  const totalInvested = useMemo(
    () =>
      records.reduce((s, r) => s + r.cost, 0) +
      expenses.reduce((s, e) => s + e.amount, 0),
    [records, expenses],
  );
  const activeShares = grants.filter((g) => g.status === "active").length;

  if (loading) {
    return <Shell><p className="text-sm text-[var(--muted)]">Loading your home…</p></Shell>;
  }

  if (homes.length === 0) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl">
          <h1 className="font-serif text-3xl font-bold text-ink">My Home</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Your private home file — like a CARFAX for your house. Log
            renovations, track expenses, store documents, and choose exactly
            which realtor (if any) can ever see it.
          </p>
          <div className="mt-6 rounded-2xl border border-hairline bg-[var(--surface)] p-6">
            <h2 className="font-serif text-xl font-bold text-ink">
              Add your home to get started
            </h2>
            <HomeForm
              onSave={async (input) => {
                if (!user) return;
                const created = await createHome(user.id, input);
                setHomes((h) => [...h, created]);
                setActiveId(created.id);
                setAddingHome(false);
              }}
            />
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">My Home</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Private homeowner vault — you control who sees it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {homes.length > 1 && (
              <select
                value={activeId}
                onChange={(e) => setActiveId(e.target.value)}
                className="h-10 rounded-lg border border-hairline bg-[var(--surface)] px-3 text-sm text-ink outline-none focus:border-gold"
              >
                {homes.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nickname} — {h.address || h.city}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => setAddingHome((v) => !v)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-3 text-sm font-semibold text-ink"
            >
              <Plus className="h-4 w-4" /> Add home
            </button>
          </div>
        </div>

        {addingHome && (
          <div className="mt-4 rounded-2xl border border-hairline bg-[var(--surface)] p-5">
            <HomeForm
              onSave={async (input) => {
                if (!user) return;
                const created = await createHome(user.id, input);
                setHomes((h) => [...h, created]);
                setActiveId(created.id);
                setAddingHome(false);
              }}
            />
          </div>
        )}

        {/* Stat cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={<Wrench className="h-4 w-4" />} label="History records" value={String(records.length)} />
          <Stat icon={<Banknote className="h-4 w-4" />} label="Total invested" value={formatUsd(totalInvested)} />
          <Stat icon={<FileText className="h-4 w-4" />} label="Documents" value={String(docs.length)} />
          <Stat icon={<Share2 className="h-4 w-4" />} label="Active shares" value={String(activeShares)} />
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 overflow-x-auto border-b border-hairline pb-px">
          {([
            ["overview", "Overview"],
            ["property", "Property"],
            ["history", "History"],
            ["expenses", "Expenses"],
            ["documents", "Documents"],
            ["sharing", "Sharing"],
            ["pros", "Find Pros"],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                tab === id
                  ? "border-[var(--accent)] text-ink"
                  : "border-transparent text-[var(--muted)] hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "overview" && activeHome && user && (
            <Overview
              home={activeHome}
              ownerId={user.id}
              records={records}
              totalInvested={totalInvested}
              onHomeChange={loadHomes}
            />
          )}
          {tab === "property" && activeHome && user && (
            <PropertyTab home={activeHome} ownerId={user.id} onHomeChange={loadHomes} />
          )}
          {tab === "history" && activeHome && (
            <HistoryTab
              records={records}
              onUploadReceipt={async (file) => {
                if (!user) throw new Error("no user");
                const opt = await compressImageIfNeeded(file);
                const path = await uploadHomeFile(user.id, activeHome.id, opt);
                return { path, name: file.name };
              }}
              onAdd={async (input) => {
                if (!user) return;
                await addRecord(user.id, activeHome.id, input);
                await loadHomeData();
              }}
              onDelete={async (id) => { await deleteRecord(id); await loadHomeData(); }}
            />
          )}
          {tab === "expenses" && activeHome && (
            <ExpensesTab
              expenses={expenses}
              onUploadReceipt={async (file) => {
                if (!user) throw new Error("no user");
                const opt = await compressImageIfNeeded(file);
                const path = await uploadHomeFile(user.id, activeHome.id, opt);
                return { path, name: file.name };
              }}
              onAdd={async (input) => {
                if (!user) return;
                await addExpense(user.id, activeHome.id, input);
                await loadHomeData();
              }}
              onDelete={async (id) => { await deleteExpense(id); await loadHomeData(); }}
            />
          )}
          {tab === "documents" && activeHome && (
            <DocumentsTab
              docs={docs}
              folders={folders}
              onCreateFolder={async (name) => {
                if (!user) return;
                await addFolder(user.id, activeHome.id, name);
                await loadHomeData();
              }}
              onDeleteFolder={async (id) => { await deleteFolder(id); await loadHomeData(); }}
              onRename={async (id, title) => { await renameDocument(id, title); await loadHomeData(); }}
              onUpload={async (file, meta) => {
                if (!user) return;
                const optimized = await compressImageIfNeeded(file);
                const path = await uploadHomeFile(user.id, activeHome.id, optimized);
                await addDocument(user.id, activeHome.id, { ...meta, filePath: path });
                await loadHomeData();
              }}
              onDelete={async (id) => { await deleteDocument(id); await loadHomeData(); }}
            />
          )}
          {tab === "sharing" && activeHome && user && (
            <SharingTab
              grants={grants}
              audit={audit}
              onGrant={async (email, scope) => {
                const profile = await findProfileByEmail(email);
                if (!profile) return { ok: false, error: "No Story Home user with that email." };
                await grantAccess(user.id, activeHome.id, profile.id, scope);
                await logAudit(user.id, activeHome.id, "granted", scope, `${profile.full_name} (${email})`);
                await loadHomeData();
                return { ok: true, name: profile.full_name };
              }}
              onRevoke={async (id) => {
                const g = grants.find((x) => x.id === id);
                await revokeGrant(id);
                await logAudit(user.id, activeHome.id, "revoked", g?.scope ?? null, g?.granteeName ?? null);
                await loadHomeData();
              }}
              onExport={async () => {
                const json = await exportHomeData(activeHome.id);
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${activeHome.nickname || "home"}-export.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              onDeleteHome={async () => {
                await deleteHome(activeHome.id);
                setActiveId("");
                await loadHomes();
              }}
            />
          )}
          {tab === "pros" && <ProsTab pros={pros} />}
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------ safe fetch ----------------------------- */
async function fetchRecordsSafe(id: string) { try { return await fetchRecords(id); } catch { return []; } }
async function fetchExpensesSafe(id: string) { try { return await fetchExpenses(id); } catch { return []; } }
async function fetchDocsSafe(id: string) { try { return await fetchDocuments(id); } catch { return []; } }
async function fetchGrantsSafe(id: string) { try { return await fetchGrants(id); } catch { return []; } }

/* ------------------------------- pieces -------------------------------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6 md:pb-12">{children}</div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2 text-[var(--muted)]">
        {icon}
        <span className="font-mono text-[10px] font-semibold tracking-wider uppercase">{label}</span>
      </div>
      <p className="mt-2 font-serif text-2xl font-bold text-ink tabular-nums">{value}</p>
    </div>
  );
}

function Overview({
  home, ownerId, records, totalInvested, onHomeChange,
}: {
  home: Home;
  ownerId: string;
  records: HomeRecord[];
  totalInvested: number;
  onHomeChange: () => void;
}) {
  const capital = records.filter((r) => r.isCapitalImprovement).reduce((s, r) => s + r.cost, 0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editClosing, setEditClosing] = useState(false);

  useEffect(() => {
    if (home.photoPath) signedUrlFor(home.photoPath).then(setPhotoUrl);
    else setPhotoUrl(null);
  }, [home.photoPath]);

  async function onPhoto(file: File) {
    setUploading(true);
    try {
      const optimized = await compressImageIfNeeded(file);
      const path = await uploadHomeFile(ownerId, home.id, optimized);
      await updateHome(home.id, { photoPath: path });
      onHomeChange();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Profile card with hero photo */}
      <div className="overflow-hidden rounded-2xl border border-hairline bg-[var(--surface)]">
        <div className="relative h-52 w-full bg-[var(--nav-surface)] md:h-64">
          {photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photoUrl} alt={home.nickname} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-paper/50">
              Add a photo of your home
            </div>
          )}
          <label className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gold px-3 py-2 text-xs font-bold text-navy shadow-md">
            <ImagePlusLike /> {uploading ? "Uploading…" : photoUrl ? "Change photo" : "Add photo"}
            <input type="file" accept="image/*" className="hidden" disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ""; }} />
          </label>
        </div>
        <div className="p-5">
          <h3 className="font-serif text-2xl font-bold text-ink">{home.nickname}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {[home.address, home.city, home.countyName].filter(Boolean).join(", ")}
            {home.state ? `, ${home.state}` : ""} {home.zip}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-3 lg:grid-cols-6">
            <Field label="Beds" value={home.beds ?? "—"} />
            <Field label="Baths" value={home.baths ?? "—"} />
            <Field label="Sqft" value={home.sqft?.toLocaleString() ?? "—"} />
            <Field label="Acres" value={home.lotAcres ?? "—"} />
            <Field label="Year built" value={home.yearBuilt ?? "—"} />
            <Field label="Type" value={home.propertyType ?? "—"} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        {/* Closing facts */}
        <div className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
          <div className="flex items-center justify-between">
            <h4 className="font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
              Closing facts
            </h4>
            <button type="button" onClick={() => setEditClosing((v) => !v)} className="text-xs font-semibold text-gold">
              {editClosing ? "Done" : "Edit"}
            </button>
          </div>
          {editClosing ? (
            <ClosingFactsForm home={home} onSaved={() => { setEditClosing(false); onHomeChange(); }} />
          ) : (
            <div className="mt-3 space-y-2">
              <Row label="Closing date" value={home.purchaseDate ?? "—"} />
              <Row label="Sale price" value={home.purchasePrice ? formatUsd(home.purchasePrice) : "—"} />
              <Row label="Title company" value={home.titleCompany ?? "—"} />
              <Row label="Lender" value={home.lender ?? "—"} />
              <Row label="Loan amount" value={home.loanAmount ? formatUsd(home.loanAmount) : "—"} />
            </div>
          )}
        </div>

        {/* Cost basis */}
        <div className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
          <h4 className="font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
            Cost basis snapshot
          </h4>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Capital improvements can raise your cost basis and reduce capital‑gains
            tax when you sell.
          </p>
          <div className="mt-4 space-y-2">
            <Row label="Purchase price" value={home.purchasePrice ? formatUsd(home.purchasePrice) : "—"} />
            <Row label="Capital improvements" value={formatUsd(capital)} />
            <Row label="Total invested" value={formatUsd(totalInvested)} strong />
          </div>
          <p className="mt-3 font-mono text-[10px] text-[var(--muted)]">Informational only — not tax advice.</p>
        </div>
      </div>
    </div>
  );
}

function ImagePlusLike() {
  return <Upload className="h-3.5 w-3.5" />;
}

function ClosingFactsForm({ home, onSaved }: { home: Home; onSaved: () => void }) {
  const [f, setF] = useState({
    purchaseDate: home.purchaseDate ?? "",
    purchasePrice: home.purchasePrice ?? null,
    titleCompany: home.titleCompany ?? "",
    gfNumber: home.gfNumber ?? "",
    lender: home.lender ?? "",
    loanAmount: home.loanAmount ?? null,
    isFinanced: home.isFinanced ?? true,
  });
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <TextField id="cf-date" label="Closing date (YYYY-MM-DD)" value={f.purchaseDate} onChange={(v) => setF((p) => ({ ...p, purchaseDate: v }))} />
        <NumberField id="cf-price" label="Sale price" prefix="$" value={String(f.purchasePrice ?? "")} onChange={(v) => setF((p) => ({ ...p, purchasePrice: Number(v) || null }))} />
        <TextField id="cf-title" label="Title company" value={f.titleCompany} onChange={(v) => setF((p) => ({ ...p, titleCompany: v }))} />
        <TextField id="cf-gf" label="GF number" value={f.gfNumber} onChange={(v) => setF((p) => ({ ...p, gfNumber: v }))} />
        <TextField id="cf-lender" label="Lender" value={f.lender} onChange={(v) => setF((p) => ({ ...p, lender: v }))} />
        <NumberField id="cf-loan" label="Loan amount" prefix="$" value={String(f.loanAmount ?? "")} onChange={(v) => setF((p) => ({ ...p, loanAmount: Number(v) || null }))} />
      </div>
      <CheckboxField id="cf-fin" label="This purchase was financed" checked={f.isFinanced} onChange={(v) => setF((p) => ({ ...p, isFinanced: v }))} />
      <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await updateHome(home.id, f); onSaved(); } finally { setBusy(false); } }} className="h-10 rounded-lg bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60">
        {busy ? "Saving…" : "Save closing facts"}
      </button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-hairline bg-[var(--background)] px-3 py-2">
      <p className="text-[var(--muted)] uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between py-1.5", strong && "border-t border-hairline pt-2")}>
      <span className={cn("text-sm", strong ? "font-semibold text-ink" : "text-[var(--muted)]")}>{label}</span>
      <span className={cn("font-mono text-sm tabular-nums", strong ? "font-bold text-ink" : "text-ink")}>{value}</span>
    </div>
  );
}

function HomeForm({ onSave }: { onSave: (input: Partial<Home>) => Promise<void> }) {
  const [form, setForm] = useState<Partial<Home>>({ nickname: "My Home", state: "TX" });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Home>(k: K, v: Home[K]) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id="h-nick" label="Nickname" value={form.nickname ?? ""} onChange={(v) => set("nickname", v)} />
        <TextField id="h-addr" label="Street address" value={form.address ?? ""} onChange={(v) => set("address", v)} />
        <TextField id="h-city" label="City" value={form.city ?? ""} onChange={(v) => set("city", v)} />
        <TextField id="h-county" label="County" value={form.countyName ?? ""} onChange={(v) => set("countyName", v)} />
        <TextField id="h-zip" label="ZIP" value={form.zip ?? ""} onChange={(v) => set("zip", v)} />
        <NumberField id="h-year" label="Year built" value={String(form.yearBuilt ?? "")} onChange={(v) => set("yearBuilt", Number(v) || null)} />
        <NumberField id="h-beds" label="Beds" value={String(form.beds ?? "")} onChange={(v) => set("beds", Number(v) || null)} />
        <NumberField id="h-baths" label="Baths" step="0.5" value={String(form.baths ?? "")} onChange={(v) => set("baths", Number(v) || null)} />
        <NumberField id="h-sqft" label="Sqft" value={String(form.sqft ?? "")} onChange={(v) => set("sqft", Number(v) || null)} />
        <NumberField id="h-price" label="Purchase price" prefix="$" value={String(form.purchasePrice ?? "")} onChange={(v) => set("purchasePrice", Number(v) || null)} />
      </div>
      <button
        type="button"
        disabled={busy || !form.nickname}
        onClick={async () => { setBusy(true); try { await onSave(form); } finally { setBusy(false); } }}
        className="h-11 rounded-lg bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save home"}
      </button>
    </div>
  );
}

function HistoryTab({ records, onAdd, onDelete, onUploadReceipt }: {
  records: HomeRecord[];
  onAdd: (r: Partial<HomeRecord>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUploadReceipt: (file: File) => Promise<{ path: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Partial<HomeRecord>>({ category: "Maintenance", occurredOn: new Date().toISOString().slice(0, 10) });
  const set = <K extends keyof HomeRecord>(k: K, v: HomeRecord[K]) => setF((p) => ({ ...p, [k]: v }));
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-xl font-bold text-ink">Home history</h3>
        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-contrast)]">
          <Plus className="h-4 w-4" /> Add record
        </button>
      </div>
      {open && (
        <div className="mb-4 space-y-3 rounded-xl border border-hairline bg-[var(--surface)] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField id="r-title" label="Title" value={f.title ?? ""} onChange={(v) => set("title", v)} />
            <SelectField id="r-cat" label="Category" value={f.category ?? "Other"} onChange={(v) => set("category", v)} options={RECORD_CATEGORIES.map((c) => ({ value: c, label: c }))} />
            {f.category === "Other" && (
              <TextField id="r-catother" label="Specify category" value={f.categoryOther ?? ""} onChange={(v) => set("categoryOther", v)} />
            )}
            <NumberField id="r-cost" label="Cost" prefix="$" value={String(f.cost ?? "")} onChange={(v) => set("cost", Number(v) || 0)} />
            <TextField id="r-date" label="Date (YYYY-MM-DD)" value={f.occurredOn ?? ""} onChange={(v) => set("occurredOn", v)} />
            <TextField id="r-contractor" label="Contractor" value={f.contractor ?? ""} onChange={(v) => set("contractor", v)} />
            <TextField id="r-warranty" label="Warranty until (YYYY-MM-DD)" value={f.warrantyUntil ?? ""} onChange={(v) => set("warrantyUntil", v)} />
          </div>
          <TextAreaField id="r-desc" label="Description" value={f.description ?? ""} onChange={(v) => set("description", v)} rows={2} />
          <ReceiptAttach
            receiptName={f.receiptName ?? null}
            onUpload={onUploadReceipt}
            onAttached={(path, name) => setF((p) => ({ ...p, receiptPath: path, receiptName: name }))}
          />
          <CheckboxField id="r-capital" label="Capital improvement (adds to cost basis)" checked={f.isCapitalImprovement ?? false} onChange={(v) => set("isCapitalImprovement", v)} />
          <button type="button" disabled={!f.title} onClick={async () => { await onAdd(f); setF({ category: "Maintenance", occurredOn: new Date().toISOString().slice(0, 10) }); setOpen(false); }} className="h-10 rounded-lg bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60">Save record</button>
        </div>
      )}
      {records.length === 0 ? (
        <Empty text="No history yet. Log your first renovation or repair." />
      ) : (
        <ol className="space-y-2">
          {records.map((r) => (
            <li key={r.id} className="rounded-xl border border-hairline bg-[var(--surface)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{r.title}</p>
                  <p className="font-mono text-[11px] text-[var(--muted)] uppercase">
                    {r.occurredOn} · {r.category === "Other" && r.categoryOther ? r.categoryOther : r.category}{r.isCapitalImprovement ? " · Capital" : ""}{r.contractor ? ` · ${r.contractor}` : ""}
                  </p>
                  {r.description && <p className="mt-1 text-sm text-[var(--muted)]">{r.description}</p>}
                  {r.receiptPath && <ViewReceipt path={r.receiptPath} name={r.receiptName} />}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-sm font-bold text-ink">{formatUsd(r.cost)}</span>
                  <button type="button" onClick={() => onDelete(r.id)} aria-label="Delete" className="text-[var(--muted)] hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ReceiptAttach({
  receiptName, onUpload, onAttached,
}: {
  receiptName: string | null;
  onUpload: (file: File) => Promise<{ path: string; name: string }>;
  onAttached: (path: string, name: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-hairline px-3 py-2 text-xs font-semibold text-ink">
        <Upload className="h-4 w-4" /> {busy ? "Attaching…" : receiptName ? "Replace receipt/invoice" : "Attach receipt/invoice"}
        <input type="file" className="hidden" disabled={busy}
          onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); try { const r = await onUpload(file); onAttached(r.path, r.name); } catch { /* ignore */ } finally { setBusy(false); e.target.value = ""; } }} />
      </label>
      {receiptName && <span className="font-mono text-[11px] text-teal-soft">Attached: {receiptName}</span>}
    </div>
  );
}

function ViewReceipt({ path, name }: { path: string; name: string | null }) {
  return (
    <button
      type="button"
      onClick={async () => { const url = await signedUrlFor(path); if (url) window.open(url, "_blank"); }}
      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gold"
    >
      <FileText className="h-3.5 w-3.5" /> View {name ? name : "receipt"}
    </button>
  );
}

function ExpensesTab({ expenses, onAdd, onDelete, onUploadReceipt }: {
  expenses: HomeExpense[];
  onAdd: (e: Partial<HomeExpense>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUploadReceipt: (file: File) => Promise<{ path: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Partial<HomeExpense>>({ category: "Maintenance", spentOn: new Date().toISOString().slice(0, 10) });
  const set = <K extends keyof HomeExpense>(k: K, v: HomeExpense[K]) => setF((p) => ({ ...p, [k]: v }));
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-serif text-xl font-bold text-ink">Expenses</h3>
          <p className="text-xs text-[var(--muted)]">Tracked total: {formatUsd(total)}</p>
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-contrast)]">
          <Plus className="h-4 w-4" /> Add expense
        </button>
      </div>
      {open && (
        <div className="mb-4 space-y-3 rounded-xl border border-hairline bg-[var(--surface)] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField id="e-vendor" label="Vendor / description" value={f.vendor ?? ""} onChange={(v) => set("vendor", v)} />
            <SelectField id="e-cat" label="Category" value={f.category ?? "Other"} onChange={(v) => set("category", v)} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} />
            {f.category === "Other" && (
              <TextField id="e-catother" label="Specify category" value={f.categoryOther ?? ""} onChange={(v) => set("categoryOther", v)} />
            )}
            <NumberField id="e-amt" label="Amount" prefix="$" value={String(f.amount ?? "")} onChange={(v) => set("amount", Number(v) || 0)} />
            <TextField id="e-date" label="Date (YYYY-MM-DD)" value={f.spentOn ?? ""} onChange={(v) => set("spentOn", v)} />
          </div>
          <ReceiptAttach
            receiptName={f.receiptName ?? null}
            onUpload={onUploadReceipt}
            onAttached={(path, name) => setF((p) => ({ ...p, receiptPath: path, receiptName: name }))}
          />
          <CheckboxField id="e-capital" label="Capital improvement" checked={f.isCapitalImprovement ?? false} onChange={(v) => set("isCapitalImprovement", v)} />
          <button type="button" disabled={!f.amount} onClick={async () => { await onAdd(f); setF({ category: "Maintenance", spentOn: new Date().toISOString().slice(0, 10) }); setOpen(false); }} className="h-10 rounded-lg bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60">Save expense</button>
        </div>
      )}
      {expenses.length === 0 ? (
        <Empty text="No expenses tracked yet." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-hairline">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-hairline bg-[var(--background)] font-mono text-[11px] uppercase text-[var(--muted)]">
                <th className="px-4 py-2">Date</th><th className="px-4 py-2">Vendor</th><th className="px-4 py-2">Category</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2 font-mono text-xs text-[var(--muted)]">{e.spentOn}</td>
                  <td className="px-4 py-2 text-ink">
                    {e.vendor || "—"}
                    {e.receiptPath && <ViewReceipt path={e.receiptPath} name={e.receiptName} />}
                  </td>
                  <td className="px-4 py-2 text-[var(--muted)]">{e.category === "Other" && e.categoryOther ? e.categoryOther : e.category}{e.isCapitalImprovement ? " · Capital" : ""}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-ink">{formatUsd(e.amount)}</td>
                  <td className="px-4 py-2 text-right"><button type="button" onClick={() => onDelete(e.id)} aria-label="Delete" className="text-[var(--muted)] hover:text-red-300"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const CLOSING_SLOTS = [
  "Warranty Deed", "Deed of Trust", "Promissory Note", "Closing Disclosure",
  "Settlement Statement", "Owner's Title Policy", "Title Commitment",
  "Survey / T-47", "Homeowners Insurance", "Home Warranty",
  "Tax / Proration", "Homestead (50-114)", "HOA Resale Cert",
];

function DocumentsTab({ docs, folders, onUpload, onDelete, onCreateFolder, onDeleteFolder, onRename }: {
  docs: HomeDocument[];
  folders: HomeFolder[];
  onUpload: (
    file: File,
    meta: { docType: string; docTypeOther: string | null; title: string; folderId: string | null; closingSlot: string | null; isClosingDoc: boolean; sensitive: boolean },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateFolder: (name: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
}) {
  const [docType, setDocType] = useState("receipt");
  const [docTypeOther, setDocTypeOther] = useState("");
  const [folderId, setFolderId] = useState<string>("");
  const [closingSlot, setClosingSlot] = useState<string>("");
  const [sensitive, setSensitive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = docs.filter((d) =>
    filter === "all" ? true : filter === "unfiled" ? !d.folderId : d.folderId === filter,
  );

  return (
    <div>
      <h3 className="mb-3 font-serif text-xl font-bold text-ink">Documents vault</h3>

      {/* Folders */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[["all", "All"], ["unfiled", "Unfiled"]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)} className={cn("h-8 rounded-full px-3 text-xs font-semibold", filter === id ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "border border-hairline text-ink")}>{label}</button>
        ))}
        {folders.map((fo) => (
          <span key={fo.id} className={cn("inline-flex items-center gap-1 rounded-full pl-3 pr-1 text-xs font-semibold", filter === fo.id ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "border border-hairline text-ink")}>
            <button type="button" onClick={() => setFilter(fo.id)} className="py-1.5">{fo.name}</button>
            <button type="button" onClick={() => onDeleteFolder(fo.id)} aria-label="Delete folder" className="rounded-full p-1 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="New folder" className="h-8 w-28 rounded-full border border-hairline bg-[var(--background)] px-3 text-xs text-ink outline-none focus:border-gold" />
          <button type="button" disabled={!newFolder.trim()} onClick={async () => { await onCreateFolder(newFolder.trim()); setNewFolder(""); }} className="h-8 rounded-full bg-gold px-3 text-xs font-bold text-navy disabled:opacity-50">Add</button>
        </span>
      </div>

      {/* Upload */}
      <div className="mb-4 space-y-3 rounded-xl border border-hairline bg-[var(--surface)] p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField id="d-type" label="Type" value={docType} onChange={setDocType} options={DOC_TYPES.map((t) => ({ value: t, label: t }))} />
          {docType === "other" && (
            <TextField id="d-type-other" label="Specify type" value={docTypeOther} onChange={setDocTypeOther} />
          )}
          <SelectField id="d-folder" label="Folder" value={folderId} onChange={setFolderId} options={[{ value: "", label: "— None —" }, ...folders.map((fo) => ({ value: fo.id, label: fo.name }))]} />
          <SelectField id="d-closing" label="Closing packet slot" value={closingSlot} onChange={setClosingSlot} options={[{ value: "", label: "— Not a closing doc —" }, ...CLOSING_SLOTS.map((s) => ({ value: s, label: s }))]} />
        </div>
        <CheckboxField id="d-sensitive" label="Mark sensitive (contains SSNs, account numbers, etc.)" checked={sensitive} onChange={setSensitive} />
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]">
            <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload file"}
            <input type="file" className="hidden" disabled={busy}
              onChange={async (ev) => {
                const file = ev.target.files?.[0];
                if (!file) return;
                setBusy(true); setErr("");
                try {
                  await onUpload(file, {
                    docType, docTypeOther: docType === "other" ? docTypeOther : null,
                    title: file.name, folderId: folderId || null,
                    closingSlot: closingSlot || null, isClosingDoc: Boolean(closingSlot),
                    sensitive,
                  });
                } catch { setErr("Upload failed. Make sure the storage bucket (0004) is set up."); }
                finally { setBusy(false); ev.target.value = ""; }
              }} />
          </label>
          <p className="text-xs text-[var(--muted)]">Private to you. Large photos auto‑compressed. Avoid uploading unredacted SSNs where possible.</p>
        </div>
        {err && <p className="text-sm text-red-300">{err}</p>}
      </div>

      {filtered.length === 0 ? (
        <Empty text="No documents here yet." />
      ) : (
        <ul className="space-y-2">
          {filtered.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-xl border border-hairline bg-[var(--surface)] p-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                <span className="truncate text-sm text-ink">{d.title}</span>
                <span className="font-mono text-[10px] text-[var(--muted)] uppercase">
                  {d.docType === "other" && d.docTypeOther ? d.docTypeOther : d.docType}
                  {d.closingSlot ? ` · ${d.closingSlot}` : ""}
                </span>
                {d.sensitive && <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red-300 uppercase">Sensitive</span>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {d.filePath && (
                  <button type="button" onClick={async () => { const url = await signedUrlFor(d.filePath!); if (url) window.open(url, "_blank"); }} className="text-xs font-semibold text-gold">View</button>
                )}
                <button type="button" onClick={async () => { const name = window.prompt("Rename document", d.title); if (name && name.trim()) await onRename(d.id, name.trim()); }} className="text-xs font-semibold text-ink">Rename</button>
                <button type="button" onClick={() => onDelete(d.id)} aria-label="Delete" className="text-[var(--muted)] hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SharingTab({ grants, audit, onGrant, onRevoke, onExport, onDeleteHome }: {
  grants: HomeGrant[];
  audit: AuditEntry[];
  onGrant: (email: string, scope: "full" | "report") => Promise<{ ok: true; name?: string } | { ok: false; error: string }>;
  onRevoke: (id: string) => Promise<void>;
  onExport: () => Promise<void>;
  onDeleteHome: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<"full" | "report">("full");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const active = grants.filter((g) => g.status === "active");
  return (
    <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-teal-soft" />
          <h3 className="font-serif text-xl font-bold text-ink">Share with a realtor</h3>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Your home data is private. Grant a specific realtor access — full file
          or improvement report only — and revoke anytime.
        </p>
        <div className="mt-4 space-y-3">
          <TextField id="s-email" label="Realtor's account email" value={email} onChange={setEmail} placeholder="agent@example.com" />
          <SelectField id="s-scope" label="Access scope" value={scope} onChange={(v) => setScope(v as "full" | "report")} options={[{ value: "full", label: "Full file (records + expenses + docs)" }, { value: "report", label: "Improvement report only (records)" }]} />
          <button
            type="button"
            disabled={!email}
            onClick={async () => {
              setMsg(""); setErr("");
              const r = await onGrant(email, scope);
              if (r.ok) { setMsg(`Access granted${r.name ? ` to ${r.name}` : ""}.`); setEmail(""); }
              else setErr(r.error);
            }}
            className="h-10 rounded-lg bg-gold px-5 text-sm font-bold text-navy disabled:opacity-60"
          >
            Grant access
          </button>
          {msg && <p className="text-sm text-teal-soft">{msg}</p>}
          {err && <p className="text-sm text-red-300">{err}</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
        <h4 className="font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">Who has access</h4>
        {active.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No one else can see this home.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {active.map((g) => (
              <li key={g.id} className="flex items-center justify-between rounded-lg border border-hairline bg-[var(--background)] p-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{g.granteeName ?? "Realtor"}</p>
                  <p className="font-mono text-[10px] text-[var(--muted)] uppercase">{g.scope === "full" ? "Full file" : "Report only"}</p>
                </div>
                <button type="button" onClick={() => onRevoke(g.id)} className="rounded-md border border-hairline px-3 py-1.5 text-xs font-semibold text-[var(--muted)] hover:text-red-300">Revoke</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>

    <div className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <h4 className="font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">Access history</h4>
      {audit.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">No sharing activity yet.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {audit.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink">
                {a.action === "granted" ? "Granted" : a.action === "revoked" ? "Revoked" : a.action}
                {a.detail ? ` · ${a.detail}` : ""} {a.scope ? `(${a.scope})` : ""}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-[var(--muted)]">
                {new Date(a.at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>

    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <div className="mr-auto">
        <h4 className="font-serif text-lg font-bold text-ink">Your data</h4>
        <p className="text-sm text-[var(--muted)]">It&rsquo;s yours — export it any time, or delete this home entirely.</p>
      </div>
      <button type="button" onClick={onExport} className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-semibold text-ink">
        <Download className="h-4 w-4" /> Export
      </button>
      {confirmDelete ? (
        <span className="inline-flex items-center gap-2">
          <button type="button" onClick={onDeleteHome} className="h-10 rounded-lg bg-red-500/80 px-4 text-sm font-semibold text-white">Confirm delete</button>
          <button type="button" onClick={() => setConfirmDelete(false)} className="h-10 rounded-lg border border-hairline px-4 text-sm font-semibold text-ink">Cancel</button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-semibold text-[var(--muted)] hover:text-red-300">
          <Trash2 className="h-4 w-4" /> Delete home
        </button>
      )}
    </div>
    </div>
  );
}

function ProsTab({ pros }: { pros: ProContact[] }) {
  const groups: [string, string][] = [
    ["inspector", "Inspectors"],
    ["appraiser", "Appraisers"],
    ["lender", "Lenders"],
    ["realtor_broker", "Realtors"],
  ];
  return (
    <div className="space-y-6">
      {groups.map(([role, label]) => {
        const list = pros.filter((p) => p.role === role);
        return (
          <section key={role}>
            <h4 className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
              <Users className="h-4 w-4" /> {label} · {list.length}
            </h4>
            {list.length === 0 ? (
              <p className="rounded-lg border border-dashed border-hairline p-3 text-xs text-[var(--muted)]">None registered yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((p) => (
                  <Link key={p.id} href={`/agents/${p.id}`} className="rounded-lg border border-hairline bg-[var(--surface)] p-3 hover:border-gold/40">
                    <p className="text-sm font-semibold text-ink">{p.fullName}</p>
                    <p className="font-mono text-[10px] text-[var(--muted)] uppercase">{p.city || "East Texas"}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}
      <section>
        <h4 className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
          <Banknote className="h-4 w-4" /> Banks & credit unions
        </h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {LOCAL_BANKS.map((b) => (
            <div key={b.name} className="rounded-lg border border-hairline bg-[var(--surface)] p-3">
              <p className="text-sm font-semibold text-ink">{b.name}</p>
              <p className="font-mono text-[10px] text-[var(--muted)] uppercase">{b.type} · {b.area}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-hairline bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
      {text}
    </div>
  );
}
