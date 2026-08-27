"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MapPinned,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ShiCountyChangeFeed } from "@/components/broker/intelligence/ShiCountyChangeFeed";
import {
  shiDeleteFarm,
  shiGetFarm,
  shiListFarms,
  shiMarkFarmReviewed,
} from "@/lib/shi/client";
import type { ShiFarm, ShiFarmDetail } from "@/lib/shi/types";
import { cn } from "@/lib/utils";

function when(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

const KIND_LABEL: Record<string, string> = {
  appeared: "Newly observed in farm",
  disappeared: "No longer in farm boundary",
  owner: "Owner name changed",
  situs: "Site address changed",
  value: "Market value changed",
  acreage: "Acreage changed",
};

/**
 * Farms — persistent territories + since-last-review change feed (SHI-4.1).
 * Diffs are baseline vs live CAD — never claims deed dates.
 */
export function ShiFarmsView() {
  const router = useRouter();
  const [farms, setFarms] = useState<ShiFarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ShiFarmDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState("");

  const refreshList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setFarms(await shiListFarms());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load farms. Try again.",
      );
      setFarms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const openFarm = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setError("");
    try {
      setDetail(await shiGetFarm(id));
    } catch (e) {
      setDetail(null);
      setError(e instanceof Error ? e.message : "Could not open farm");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const diff = detail?.diff ?? null;

  return (
    <div className="space-y-5">
      <div className="story-surface px-4 py-3">
        <p className="text-sm text-[var(--muted)]">
          Draw a market area in{" "}
          <button
            type="button"
            className="font-semibold text-gold underline-offset-2 hover:underline"
            onClick={() =>
              router.replace("/portal/intelligence", { scroll: false })
            }
          >
            Research
          </button>
          , analyze it, then choose{" "}
          <span className="text-ink">Save as Farm</span>. Archie watches that
          territory and shows what changed since your last review.
        </p>
      </div>

      {error ? (
        <div className="story-well flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <p className="text-sm text-ink">{error}</p>
          <button
            type="button"
            onClick={() => void refreshList()}
            className="story-press min-h-11 rounded-lg border border-hairline px-3 text-xs font-semibold text-ink"
          >
            Retry
          </button>
        </div>
      ) : null}

      <ShiCountyChangeFeed
        source={detail?.countySource || farms[0]?.countySource || ""}
        onOpenProperty={(opts) => {
          const params = new URLSearchParams();
          params.set("propId", opts.propId);
          params.set("source", opts.source);
          router.replace(`/portal/intelligence?${params.toString()}`, {
            scroll: false,
          });
        }}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <section className="min-h-[28rem] story-surface">
          <div className="border-b border-hairline px-4 py-3">
            <h3 className="text-sm font-bold text-ink">Your farms</h3>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Saved territories — not CAD copies. Membership is recomputed from
              live county records.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16 text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error && farms.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <p className="text-sm font-semibold text-ink">
                Farms could not load
              </p>
              <p className="mx-auto mt-2 max-w-sm text-xs text-[var(--muted)]">
                This is not an empty territory list. Try again.
              </p>
              <button
                type="button"
                onClick={() => void refreshList()}
                className="story-press mt-4 inline-flex h-11 items-center rounded-xl bg-gold px-4 text-sm font-bold text-navy"
              >
                Retry
              </button>
            </div>
          ) : farms.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <p className="text-sm font-semibold text-ink">No farms yet</p>
              <p className="mx-auto mt-2 max-w-sm text-xs text-[var(--muted)]">
                Create one from an analyzed Market Frame in Research.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {farms.map((f) => {
                const active = f.id === selectedId;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => void openFarm(f.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors",
                        active
                          ? "bg-[color-mix(in_srgb,var(--gold)_12%,transparent)]"
                          : "hover:bg-white/5",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink">
                          {f.name}
                        </p>
                        <MapPinned className="h-4 w-4 shrink-0 text-gold" />
                      </div>
                      <p className="text-xs text-[var(--muted)]">
                        {f.countyName}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">
                        Last review {when(f.lastReviewedAt)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="min-h-[28rem] story-surface p-4">
          {!selectedId ? (
            <p className="mt-10 text-center text-sm text-[var(--muted)]">
              Select a farm to review territory intelligence.
            </p>
          ) : detailLoading || !detail ? (
            <div className="mt-16 flex justify-center text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
                  {detail.countyName}
                </p>
                <h3 className="mt-1 font-serif text-xl font-bold text-ink">
                  {detail.name}
                </h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {detail.live.parcelCount.toLocaleString()} properties
                  {detail.live.capped ? " (capped scan)" : ""} ·{" "}
                  {detail.live.totalAcres.toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  })}{" "}
                  ac · {money(detail.live.estimatedTotalMarketValue)}
                </p>
              </div>

              <div className="rounded-xl border border-gold/40 bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] p-3">
                <p className="font-mono text-[10px] font-bold text-gold uppercase">
                  Since your last review
                </p>
                {diff ? (
                  <>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <Stat label="Changed records" value={diff.total} />
                      <Stat label="Ownership" value={diff.owner} />
                      <Stat label="Valuation" value={diff.value} />
                      <Stat label="New in farm" value={diff.appeared} />
                      <Stat label="Left farm" value={diff.disappeared} />
                      <Stat label="Address / acres" value={diff.situs + diff.acreage} />
                    </div>
                    <p className="mt-2 text-[10px] leading-relaxed text-[var(--muted)]">
                      {diff.note}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">
                      Baseline {when(diff.baselineAt)} · Archie detected{" "}
                      {when(diff.detectedAt)}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    No pending changes — baseline matches the latest review.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy === "review"}
                  onClick={() => {
                    setBusy("review");
                    void shiMarkFarmReviewed(detail.id)
                      .then((f) => {
                        setDetail(f);
                        void refreshList();
                      })
                      .catch((e) =>
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Could not mark reviewed",
                        ),
                      )
                      .finally(() => setBusy(""));
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gold text-sm font-bold text-navy disabled:opacity-60"
                >
                  {busy === "review" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Mark reviewed
                </button>
                <button
                  type="button"
                  disabled={busy === "delete"}
                  onClick={() => {
                    if (!confirm(`Delete farm “${detail.name}”?`)) return;
                    setBusy("delete");
                    void shiDeleteFarm(detail.id)
                      .then(() => {
                        setSelectedId(null);
                        setDetail(null);
                        void refreshList();
                      })
                      .catch((e) =>
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Could not delete farm",
                        ),
                      )
                      .finally(() => setBusy(""));
                  }}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-hairline text-xs font-semibold text-[var(--muted)] hover:text-ink disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete farm
                </button>
              </div>

              {diff && diff.changes.length > 0 ? (
                <div>
                  <h4 className="text-xs font-bold text-ink">Change feed</h4>
                  <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                    {diff.changes.map((c, i) => (
                      <li
                        key={`${c.kind}-${c.propId}-${i}`}
                        className="rounded-lg border border-hairline px-2.5 py-2"
                      >
                        <p className="font-mono text-[10px] font-bold text-gold uppercase">
                          {KIND_LABEL[c.kind] ?? c.kind}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-ink">
                          {c.label}
                        </p>
                        {c.previous || c.current ? (
                          <p className="mt-1 text-[10px] text-[var(--muted)]">
                            {c.previous ? (
                              <>
                                Previous: {c.previous}
                                <br />
                              </>
                            ) : null}
                            {c.current ? <>Current: {c.current}</> : null}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          className="mt-1.5 text-[11px] font-semibold text-gold underline-offset-2 hover:underline"
                          onClick={() => {
                            const params = new URLSearchParams();
                            params.set("propId", c.propId);
                            params.set("source", c.source);
                            router.replace(
                              `/portal/intelligence?${params.toString()}`,
                              { scroll: false },
                            );
                          }}
                        >
                          Research property →
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <h4 className="text-xs font-bold text-ink">
                  Properties in farm
                </h4>
                <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                  {detail.live.parcels.slice(0, 80).map((p) => (
                    <li key={`${p.source}:${p.propId}`}>
                      <button
                        type="button"
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set("propId", p.propId);
                          params.set("source", p.source);
                          router.replace(
                            `/portal/intelligence?${params.toString()}`,
                            { scroll: false },
                          );
                        }}
                        className="w-full rounded-lg border border-hairline px-2.5 py-2 text-left hover:border-gold/50"
                      >
                        <p className="truncate text-xs font-semibold text-ink">
                          {p.situsAddress || `Property ${p.propId}`}
                        </p>
                        <p className="truncate text-[10px] text-[var(--muted)]">
                          {p.ownerName || "Owner not listed"} ·{" "}
                          {money(p.marketValue)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
                {detail.live.parcels.length > 80 ? (
                  <p className="mt-1 text-[10px] text-[var(--muted)]">
                    Showing first 80 of {detail.live.parcelCount}.
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--background)]/50 px-2 py-1.5">
      <p className="font-mono text-[9px] font-bold tracking-wider text-[var(--muted)] uppercase">
        {label}
      </p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  );
}
