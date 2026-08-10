"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Check,
  Copy,
  Pencil,
  Plus,
  RefreshCcw,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import {
  ensureSellerAccessCode,
  fetchAgentListings,
  saveListing,
  deleteListing,
  updateListingStatus,
} from "@/lib/supabase/listings";
import {
  listListingParcels,
  syncListingParcels,
  type LinkedParcel,
} from "@/lib/supabase/listing-parcels";
import { ListingForm } from "@/components/broker/ListingForm";
import { validateListing } from "@/lib/listing-compliance";
import {
  emptyProListing,
  isLiveStatus,
  toListingDraft,
  type ProListing,
} from "@/lib/pro-listings";
import { LISTING_STATUSES, type ListingStatus } from "@/lib/listing-filters";
import { formatUsd } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export function MyListingsView() {
  const { user } = useAuth();
  const [listings, setListings] = useState<ProListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"list" | "edit">("list");
  const [editing, setEditing] = useState<ProListing | null>(null);
  const [editingTracts, setEditingTracts] = useState<LinkedParcel[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scanNote, setScanNote] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setListings(await fetchAgentListings(user.id));
    } catch {
      // keep prior listings on transient error
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const live = listings.filter((l) => isLiveStatus(l.status));
  const offMarket = listings.filter((l) => !isLiveStatus(l.status));

  function startCreate() {
    setEditingTracts([]);
    setEditing(
      emptyProListing({
        listingAgentName: user?.name ?? "",
        listingAgentLicense: "654321",
      }),
    );
    setMode("edit");
  }

  async function startEdit(listing: ProListing) {
    const isExisting =
      listing.id && !listing.id.startsWith("listing-") && listing.id.length > 20;
    let tracts: LinkedParcel[] = [];
    if (isExisting) {
      try {
        tracts = await listListingParcels(listing.id);
      } catch {
        tracts = [];
      }
    }
    setEditingTracts(tracts);
    setEditing(listing);
    setMode("edit");
  }

  async function handleSave(listing: ProListing, tracts: LinkedParcel[]) {
    if (!user) return;
    const id = await saveListing(listing, user.id);
    await syncListingParcels(id, tracts);
    await refresh();
    setMode("list");
    setEditing(null);
    setEditingTracts([]);
  }

  // Simulate the site scanning the MLS for external status changes and
  // auto-de-listing anything that has sold since it was published.
  async function scanMls() {
    const target = live.find((l) => l.status === "Under Contract") ?? null;
    if (!target) {
      setScanNote("MLS scan complete — no new sold listings detected.");
      return;
    }
    await updateListingStatus(target.id, "Sold");
    await refresh();
    setScanNote(
      `MLS scan: “${target.streetAddress}” closed and was auto-de-listed.`,
    );
  }

  if (mode === "edit" && editing) {
    return (
      <ListingForm
        initial={editing}
        initialTracts={editingTracts}
        onSave={handleSave}
        onCancel={() => {
          setMode("list");
          setEditing(null);
          setEditingTracts([]);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">My Listings</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            List a property directly or import it from your MLS. Every listing is
            checked against Fair Housing and Texas disclosure rules before it can
            publish.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={scanMls}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-4 text-sm font-semibold text-ink"
          >
            <RefreshCcw className="h-4 w-4" /> Scan MLS for sold
          </button>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-contrast)]"
          >
            <Plus className="h-4 w-4" /> New listing
          </button>
        </div>
      </div>

      {scanNote && (
        <p className="rounded-lg border border-hairline bg-[var(--surface)] px-4 py-2.5 text-sm text-ink">
          {scanNote}
        </p>
      )}

      <section>
        <h3 className="mb-3 font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
          Live listings · {live.length}
        </h3>
        {loading ? (
          <EmptyState text="Loading your listings…" />
        ) : live.length === 0 ? (
          <EmptyState text="No live listings yet. Click “New listing” to add your first property." />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {live.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                canShare
                onEdit={() => startEdit(listing)}
                onStatus={async (s) => {
                  await updateListingStatus(listing.id, s);
                  void refresh();
                }}
                onDeleteRequest={() => setDeletingId(listing.id)}
                onDeleteConfirm={async () => {
                  await deleteListing(listing.id);
                  setDeletingId(null);
                  void refresh();
                }}
                onDeleteCancel={() => setDeletingId(null)}
                confirming={deletingId === listing.id}
              />
            ))}
          </div>
        )}
      </section>

      {offMarket.length > 0 && (
        <section>
          <h3 className="mb-3 font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
            Off-market (de-listed) · {offMarket.length}
          </h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {offMarket.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onEdit={() => startEdit(listing)}
                onStatus={async (s) => {
                  await updateListingStatus(listing.id, s);
                  void refresh();
                }}
                onDeleteRequest={() => setDeletingId(listing.id)}
                onDeleteConfirm={async () => {
                  await deleteListing(listing.id);
                  setDeletingId(null);
                  void refresh();
                }}
                onDeleteCancel={() => setDeletingId(null)}
                confirming={deletingId === listing.id}
                dimmed
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ListingCard({
  listing,
  onEdit,
  onStatus,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  confirming,
  canShare,
  dimmed,
}: {
  listing: ProListing;
  onEdit: () => void;
  onStatus: (status: ListingStatus) => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  confirming: boolean;
  canShare?: boolean;
  dimmed?: boolean;
}) {
  const compliance = useMemo(
    () => validateListing(toListingDraft(listing)),
    [listing],
  );
  const primaryPhoto = listing.photos.find((p) => p.trim());

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-hairline bg-[var(--surface)]",
        dimmed && "opacity-70",
      )}
    >
      <div className="flex gap-4 p-4">
        <div className="relative hidden h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-hairline bg-[var(--background)] sm:block">
          {primaryPhoto ? (
            <Image
              src={primaryPhoto}
              alt={listing.streetAddress}
              fill
              className="object-cover"
              sizes="128px"
            />
          ) : (
            <span className="flex h-full items-center justify-center font-mono text-[10px] text-[var(--muted)]">
              No photo
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-serif text-lg font-bold text-ink">
                {listing.streetAddress || "Untitled listing"}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">
                {[listing.city, listing.countyName].filter(Boolean).join(", ")}
                {listing.mlsNumber ? ` · MLS ${listing.mlsNumber}` : ""}
              </p>
            </div>
            <span className="shrink-0 font-mono text-sm font-bold text-ink">
              {formatUsd(listing.price)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {compliance.canPublish ? (
              <span className="inline-flex items-center gap-1 rounded bg-teal-soft/20 px-2 py-0.5 font-mono text-[10px] font-bold text-teal-soft uppercase">
                <ShieldCheck className="h-3 w-3" /> Compliant
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-red-300 uppercase">
                <ShieldAlert className="h-3 w-3" /> {compliance.errors.length}{" "}
                issue{compliance.errors.length === 1 ? "" : "s"}
              </span>
            )}
            {compliance.warnings.length > 0 && (
              <span className="rounded bg-gold/15 px-2 py-0.5 font-mono text-[10px] font-bold text-gold uppercase">
                {compliance.warnings.length} warning
                {compliance.warnings.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      </div>

      {canShare && <SellerShare listingId={listing.id} />}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline bg-[var(--background)] px-4 py-2.5">
        <label className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
            Status
          </span>
          <select
            value={listing.status}
            onChange={(e) => onStatus(e.target.value as ListingStatus)}
            className="h-8 rounded-md border border-hairline bg-[var(--surface)] px-2 text-xs text-ink outline-none focus:border-gold"
          >
            {LISTING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-xs text-[var(--muted)]">Delete?</span>
              <button
                type="button"
                onClick={onDeleteConfirm}
                className="rounded-md bg-red-500/80 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={onDeleteCancel}
                className="rounded-md border border-hairline px-3 py-1.5 text-xs font-semibold text-ink"
              >
                Keep
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1 rounded-md border border-hairline px-3 py-1.5 text-xs font-semibold text-ink"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={onDeleteRequest}
                aria-label="Delete listing"
                className="inline-flex items-center gap-1 rounded-md border border-hairline px-3 py-1.5 text-xs font-semibold text-[var(--muted)] hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Generate + reveal the seller access code for a listing. The code is idempotent
 * server-side, so re-generating returns the same code. The agent copies the
 * portal link and shares it with their seller.
 */
function SellerShare({ listingId }: { listingId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  async function generate() {
    setPending(true);
    setErr("");
    try {
      const c = await ensureSellerAccessCode(listingId);
      if (!c) setErr("Could not generate a code for this listing.");
      else setCode(c);
    } catch {
      setErr("Could not generate a code. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    if (!code) return;
    const url = `${window.location.origin}/seller/portal/${code.toLowerCase()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — the code stays visible for manual copy
    }
  }

  return (
    <div className="border-t border-hairline bg-[var(--surface)] px-4 py-2.5">
      {!code ? (
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
            Seller portal
          </span>
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" />
            {pending ? "Generating…" : "Share with seller"}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
              Access code
            </p>
            <p className="font-mono text-sm font-bold tracking-wide text-gold">
              {code}
            </p>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" /> Copied link
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy portal link
              </>
            )}
          </button>
        </div>
      )}
      {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-hairline bg-[var(--surface)] p-10 text-center text-sm font-medium text-[var(--muted)]">
      {text}
    </div>
  );
}
