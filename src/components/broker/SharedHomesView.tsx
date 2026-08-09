"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileText, Home as HomeIcon, Lock } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { formatUsd } from "@/lib/demo-data";
import {
  fetchDisclosure,
  fetchDocuments,
  fetchExpenses,
  fetchHomesSharedWithMe,
  fetchRecords,
  fetchStructures,
  signedUrlFor,
  type Home,
  type HomeDocument,
  type HomeExpense,
  type HomeRecord,
  type HomeStructure,
  type SharedHome,
} from "@/lib/supabase/home";
import { DISCLOSURE_SECTIONS } from "@/lib/home-disclosure";
import { cn } from "@/lib/utils";

export function SharedHomesView() {
  const { user } = useAuth();
  const [shared, setShared] = useState<SharedHome[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<SharedHome | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setShared(await fetchHomesSharedWithMe(user.id));
    } catch {
      setShared([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  if (open) {
    return <SharedHomeDetail shared={open} onBack={() => setOpen(null)} />;
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-serif text-2xl font-bold text-ink">Client Homes</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Homeowner files shared with you. Read‑only, and only what each owner
          chose to share — they can revoke access anytime.
        </p>
      </div>

      {loading ? (
        <Empty text="Loading shared homes…" />
      ) : shared.length === 0 ? (
        <Empty text="No homeowners have shared a home with you yet. When a My Home user grants you access, it appears here." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {shared.map((s) => (
            <button
              key={s.home.id}
              type="button"
              onClick={() => setOpen(s)}
              className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-[var(--surface)] p-4 text-left hover:border-gold/40"
            >
              <div className="min-w-0">
                <p className="truncate font-serif text-lg font-bold text-ink">
                  {s.home.nickname}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {[s.home.address, s.home.city, s.home.countyName].filter(Boolean).join(", ")}
                </p>
                {s.ownerName && (
                  <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                    Shared by {s.ownerName}
                  </p>
                )}
              </div>
              <span className={cn(
                "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase",
                s.scope === "full" ? "bg-teal-soft text-paper" : "border border-hairline text-[var(--muted)]",
              )}>
                {s.scope === "full" ? "Full file" : "Report only"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SharedHomeDetail({ shared, onBack }: { shared: SharedHome; onBack: () => void }) {
  const { home, scope } = shared;
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [records, setRecords] = useState<HomeRecord[]>([]);
  const [structures, setStructures] = useState<HomeStructure[]>([]);
  const [disclosure, setDisclosure] = useState<Record<string, unknown>>({});
  const [expenses, setExpenses] = useState<HomeExpense[]>([]);
  const [docs, setDocs] = useState<HomeDocument[]>([]);

  useEffect(() => {
    if (home.photoPath) signedUrlFor(home.photoPath).then(setPhotoUrl);
    fetchRecords(home.id).then(setRecords).catch(() => setRecords([]));
    fetchStructures(home.id).then(setStructures).catch(() => setStructures([]));
    fetchDisclosure(home.id).then(setDisclosure).catch(() => setDisclosure({}));
    // Expenses/documents only return rows if the grant scope is "full" (RLS).
    fetchExpenses(home.id).then(setExpenses).catch(() => setExpenses([]));
    fetchDocuments(home.id).then(setDocs).catch(() => setDocs([]));
  }, [home.id, home.photoPath]);

  const answeredDisclosure = DISCLOSURE_SECTIONS.flatMap((sec) =>
    sec.questions
      .filter((q) => disclosure[q.id] !== undefined && disclosure[q.id] !== "")
      .map((q) => ({ label: q.label, value: String(disclosure[q.id]) })),
  );

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to Client Homes
      </button>

      {/* Profile */}
      <div className="overflow-hidden rounded-2xl border border-hairline bg-[var(--surface)]">
        <div className="relative h-44 w-full bg-[var(--nav-surface)]">
          {photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photoUrl} alt={home.nickname} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-paper/50"><HomeIcon className="mr-2 h-5 w-5" /> No photo shared</div>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-2xl font-bold text-ink">{home.nickname}</h3>
            <span className={cn("rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase", scope === "full" ? "bg-teal-soft text-paper" : "border border-hairline text-[var(--muted)]")}>{scope === "full" ? "Full file" : "Report only"}</span>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {[home.address, home.city, home.countyName].filter(Boolean).join(", ")}
            {home.state ? `, ${home.state}` : ""} {home.zip}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-4 lg:grid-cols-6">
            <Fact label="Beds" value={home.beds ?? "—"} />
            <Fact label="Baths" value={home.baths ?? "—"} />
            <Fact label="Sqft" value={home.sqft?.toLocaleString() ?? "—"} />
            <Fact label="Acres" value={home.lotAcres ?? "—"} />
            <Fact label="Year" value={home.yearBuilt ?? "—"} />
            <Fact label="Type" value={home.propertyType ?? "—"} />
          </div>
        </div>
      </div>

      {/* Structures */}
      {structures.length > 0 && (
        <Card title="Structures & outbuildings">
          <div className="grid gap-2 sm:grid-cols-2">
            {structures.map((s) => (
              <div key={s.id} className="rounded-lg border border-hairline bg-[var(--background)] p-3">
                <p className="font-semibold text-ink">{s.name || (s.kind === "Other" ? s.kindOther : s.kind)}</p>
                <p className="font-mono text-[11px] text-[var(--muted)] uppercase">
                  {s.kind === "Other" ? s.kindOther : s.kind}{s.sizeSqft ? ` · ${s.sizeSqft.toLocaleString()} sqft` : ""}{s.yearBuilt ? ` · built ${s.yearBuilt}` : ""}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Disclosure */}
      {answeredDisclosure.length > 0 && (
        <Card title="Seller's disclosure (informational)">
          <ul className="grid gap-1 sm:grid-cols-2">
            {answeredDisclosure.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 border-b border-hairline py-1 text-sm">
                <span className="text-[var(--muted)]">{a.label}</span>
                <span className="font-semibold text-ink">{a.value}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* History */}
      <Card title="Home history">
        {records.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No history shared.</p>
        ) : (
          <ol className="space-y-2">
            {records.map((r) => (
              <li key={r.id} className="rounded-lg border border-hairline bg-[var(--background)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{r.title}</p>
                    <p className="font-mono text-[11px] text-[var(--muted)] uppercase">{r.occurredOn} · {r.category === "Other" && r.categoryOther ? r.categoryOther : r.category}{r.isCapitalImprovement ? " · Capital" : ""}</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-ink">{formatUsd(r.cost)}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* Expenses + documents — only present when scope is full */}
      {scope === "full" ? (
        <>
          <Card title="Expenses">
            {expenses.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No expenses shared.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <tbody>
                    {expenses.map((e) => (
                      <tr key={e.id} className="border-b border-hairline last:border-0">
                        <td className="py-2 font-mono text-xs text-[var(--muted)]">{e.spentOn}</td>
                        <td className="py-2 text-ink">{e.vendor || "—"}</td>
                        <td className="py-2 text-[var(--muted)]">{e.category === "Other" && e.categoryOther ? e.categoryOther : e.category}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-ink">{formatUsd(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title="Documents">
            {docs.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No documents shared.</p>
            ) : (
              <ul className="space-y-2">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg border border-hairline bg-[var(--background)] p-3">
                    <span className="flex items-center gap-2 text-sm text-ink"><FileText className="h-4 w-4 text-[var(--muted)]" /> {d.title}</span>
                    {d.filePath && (
                      <button type="button" onClick={async () => { const url = await signedUrlFor(d.filePath!); if (url) window.open(url, "_blank"); }} className="text-xs font-semibold text-gold">View</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-hairline bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
          <Lock className="h-4 w-4" /> The owner shared an improvement report only. Expenses and documents are not included in this grant.
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <h4 className="mb-3 font-serif text-lg font-bold text-ink">{title}</h4>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-hairline bg-[var(--background)] px-3 py-2">
      <p className="text-[var(--muted)] uppercase">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
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
