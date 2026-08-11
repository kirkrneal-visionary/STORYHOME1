"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  NotebookPen,
  Search,
  UserRound,
} from "lucide-react";
import {
  shiAddProspectNote,
  shiConvertProspectToSellerLead,
  shiGetProspect,
  shiListProspects,
  shiUpdateProspectStatus,
} from "@/lib/shi/client";
import {
  SHI_PROSPECT_STATUSES,
  type ShiProspectStatus,
} from "@/lib/shi/prospect-statuses";
import type { ShiProspect, ShiProspectDetail } from "@/lib/shi/types";
import { cn } from "@/lib/utils";

function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function acres(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ac`;
}

function when(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * Prospects — property opportunity pipeline (SHI-3).
 * Public parcel reference + private notes/status. Never writes CAD.
 */
export function ShiProspectsView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prospects, setProspects] = useState<ShiProspect[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    byStatus: Partial<Record<ShiProspectStatus, number>>;
  }>({ total: 0, byStatus: {} });
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ShiProspectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const body = await shiListProspects({
        status: statusFilter || undefined,
        q: q.trim() || undefined,
      });
      setProspects(body.prospects);
      setSummary(body.summary);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load prospects. Apply migration 0025 if this is a new environment.",
      );
      setProspects([]);
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openDetail = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setError("");
    try {
      const p = await shiGetProspect(id);
      setDetail(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open prospect");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const watchingCount = summary.byStatus.Watching ?? 0;
  const researchingCount = summary.byStatus.Researching ?? 0;
  const opportunityCount = summary.byStatus.Opportunity ?? 0;

  const empty = !loading && prospects.length === 0;

  const statusOptions = useMemo(
    () => ["", ...SHI_PROSPECT_STATUSES] as const,
    [],
  );

  return (
    <div className="space-y-5">
      {/* Intelligence summary — real counts only */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryChip label="Prospects" value={summary.total} />
        <SummaryChip label="Researching" value={researchingCount} />
        <SummaryChip label="Watching" value={watchingCount} />
        <SummaryChip label="Opportunity" value={opportunityCount} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search address, owner, property id…"
            className="field-input pl-9"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="field-input sm:w-44"
          aria-label="Filter by status"
        >
          {statusOptions.map((s) => (
            <option key={s || "all"} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="rounded-xl border border-hairline bg-[var(--surface)] px-3 py-2 text-sm text-ink">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section className="min-h-[28rem] rounded-2xl border border-hairline bg-[var(--surface)]">
          <div className="border-b border-hairline px-4 py-3">
            <h3 className="text-sm font-bold text-ink">Pipeline</h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Properties you saved from Research. Public records stay public —
              notes and status stay private.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16 text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : empty ? (
            <div className="px-4 py-14 text-center">
              <p className="text-sm font-semibold text-ink">No prospects yet</p>
              <p className="mx-auto mt-2 max-w-sm text-xs text-[var(--muted)]">
                Open Research, select a property, then choose{" "}
                <span className="text-gold">Save Prospect</span>. Archie keeps
                the public property linked so you never retype the parcel.
              </p>
              <button
                type="button"
                onClick={() =>
                  router.replace("/portal/intelligence", { scroll: false })
                }
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-gold px-4 text-sm font-bold text-navy"
              >
                Go to Research
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {prospects.map((p) => {
                const active = p.id === selectedId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => void openDetail(p.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors",
                        active
                          ? "bg-[color-mix(in_srgb,var(--gold)_12%,transparent)]"
                          : "hover:bg-white/5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-semibold text-ink">
                          {p.label}
                        </p>
                        <span className="shrink-0 rounded-md bg-navy px-2 py-0.5 font-mono text-[10px] font-bold text-gold">
                          {p.status}
                        </span>
                      </div>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {p.ownerNameSnapshot || "Owner not listed"} ·{" "}
                        {p.countyName}
                      </p>
                      <p className="flex flex-wrap gap-x-3 text-[10px] text-[var(--muted)]">
                        <span>{acres(p.legalAcreageSnapshot)}</span>
                        <span>{money(p.marketValueSnapshot)}</span>
                        <span>Updated {when(p.lastActivityAt)}</span>
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="min-h-[28rem] rounded-2xl border border-hairline bg-[var(--surface)] p-4">
          {!selectedId ? (
            <p className="mt-10 text-center text-sm text-[var(--muted)]">
              Select a prospect to open the dossier.
            </p>
          ) : detailLoading || !detail ? (
            <div className="mt-16 flex justify-center text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
                  Prospect dossier
                </p>
                <h3 className="mt-1 font-serif text-xl font-bold text-ink">
                  {detail.label}
                </h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {detail.ownerNameSnapshot || "Owner not listed"}
                </p>
              </div>

              <div className="rounded-xl border border-hairline bg-[var(--background)]/40 p-3">
                <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                  Public property data
                </p>
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  Snapshot from county records when saved. Live research always
                  re-checks the source.
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <Fact label="County" value={detail.countyName} />
                  <Fact label="Property ID" value={detail.propId} mono />
                  <Fact label="Acres" value={acres(detail.legalAcreageSnapshot)} />
                  <Fact
                    label="Market value"
                    value={money(detail.marketValueSnapshot)}
                  />
                  <Fact
                    label="City"
                    value={detail.situsCitySnapshot ?? "—"}
                  />
                  <Fact
                    label="Address"
                    value={detail.situsAddressSnapshot ?? "—"}
                  />
                </dl>
              </div>

              <div className="rounded-xl border border-gold/35 bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] p-3">
                <p className="font-mono text-[10px] font-bold text-gold uppercase">
                  Private workspace
                </p>
                <label className="mt-2 block text-xs font-semibold text-ink">
                  Status
                  <select
                    value={detail.status}
                    disabled={busy === "status"}
                    onChange={(e) => {
                      const next = e.target.value as ShiProspectStatus;
                      setBusy("status");
                      void shiUpdateProspectStatus(detail.id, next)
                        .then((p) => {
                          setDetail((d) =>
                            d ? { ...d, status: p.status, lastActivityAt: p.lastActivityAt } : d,
                          );
                          void refresh();
                        })
                        .catch((err) =>
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Could not update status",
                          ),
                        )
                        .finally(() => setBusy(""));
                    }}
                    className="field-input mt-1"
                  >
                    {SHI_PROSPECT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set("propId", detail.propId);
                    params.set("source", detail.source);
                    if (detail.countyFips)
                      params.set("countyFips", detail.countyFips);
                    router.replace(
                      `/portal/intelligence?${params.toString()}`,
                      { scroll: false },
                    );
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-navy text-sm font-bold text-gold"
                >
                  <MapPin className="h-4 w-4" />
                  Research property
                </button>
                {detail.sellerClientId ? (
                  <Link
                    href="/portal?tab=sellers"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-hairline text-sm font-semibold text-ink"
                  >
                    <UserRound className="h-4 w-4" />
                    Open seller lead
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={busy === "convert"}
                    onClick={() => {
                      setBusy("convert");
                      void shiConvertProspectToSellerLead(detail.id)
                        .then(async (res) => {
                          setDetail(await shiGetProspect(res.prospect.id));
                          void refresh();
                        })
                        .catch((err) =>
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Could not create seller lead",
                          ),
                        )
                        .finally(() => setBusy(""));
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-hairline text-sm font-semibold text-ink disabled:opacity-60"
                  >
                    {busy === "convert" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserRound className="h-4 w-4" />
                    )}
                    Create seller lead
                  </button>
                )}
                <p className="text-[10px] leading-relaxed text-[var(--muted)]">
                  Seller lead opens in Story Pro My Sellers. Archie does not copy
                  phone or email from county records — add contacts yourself.
                </p>
              </div>

              <div>
                <h4 className="flex items-center gap-2 text-xs font-bold text-ink">
                  <NotebookPen className="h-3.5 w-3.5 text-gold" />
                  Private notes
                </h4>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={3}
                  placeholder="What did you learn? What is the next step?"
                  className="field-input mt-2 h-auto py-2"
                />
                <button
                  type="button"
                  disabled={!noteDraft.trim() || busy === "note"}
                  onClick={() => {
                    setBusy("note");
                    void shiAddProspectNote(detail.id, noteDraft)
                      .then(async () => {
                        setNoteDraft("");
                        setDetail(await shiGetProspect(detail.id));
                        void refresh();
                      })
                      .catch((err) =>
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Could not save note",
                        ),
                      )
                      .finally(() => setBusy(""));
                  }}
                  className="mt-2 inline-flex h-9 items-center rounded-xl bg-gold px-3 text-xs font-bold text-navy disabled:opacity-50"
                >
                  Save note
                </button>
                <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                  {detail.notes.length === 0 ? (
                    <li className="text-xs text-[var(--muted)]">No notes yet.</li>
                  ) : (
                    detail.notes.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-lg border border-hairline px-2.5 py-2"
                      >
                        <p className="text-xs whitespace-pre-wrap text-ink">
                          {n.body}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">
                          {when(n.createdAt)}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-hairline bg-[var(--surface)] px-3 py-2.5">
      <p className="font-mono text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
        {label}
      </p>
      <p className="mt-1 font-serif text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}

function Fact({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="font-mono text-[9px] font-bold tracking-wider text-[var(--muted)] uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-ink",
          mono && "font-mono text-[11px]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
