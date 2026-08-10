"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Trash2 } from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import type { SearchFilters } from "@/lib/listing-filters";
import {
  deleteSavedSearch,
  listSavedSearches,
  saveSearch,
  type SavedSearch,
} from "@/lib/supabase/saved-searches";
import { cn } from "@/lib/utils";

export function SavedSearchControl({
  filters,
  onApply,
}: {
  filters: SearchFilters;
  onApply: (f: SearchFilters) => void;
}) {
  const { user, isLoggedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setItems(await listSavedSearches(user.id));
    } catch {
      setItems([]);
    }
  }, [user]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  if (!isLoggedIn || !user) {
    return (
      <Link
        href="/login?next=/marketplace"
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-hairline bg-[var(--surface)] px-3 text-sm font-semibold text-ink"
      >
        <Bookmark className="h-4 w-4 text-gold" /> Save search
      </Link>
    );
  }

  async function onSave() {
    const label = filters.query?.trim() || "My search";
    await saveSearch(user!.id, label, filters);
    setNote("Saved");
    setTimeout(() => setNote(""), 1500);
    await refresh();
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onSave}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-hairline bg-[var(--surface)] px-3 text-sm font-semibold text-ink"
        >
          <Bookmark className="h-4 w-4 text-gold" /> {note || "Save search"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex h-10 items-center rounded-lg border border-hairline px-2 text-xs font-semibold text-[var(--muted)]",
            open && "text-ink",
          )}
        >
          Saved{items.length ? ` (${items.length})` : ""}
        </button>
      </div>
      {open && (
        <div className="absolute right-0 z-[60] mt-1 w-72 rounded-xl border border-hairline bg-[var(--surface)] p-2 shadow-xl">
          {items.length === 0 ? (
            <p className="px-2 py-3 text-xs text-[var(--muted)]">No saved searches yet.</p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--background)]">
                  <button
                    type="button"
                    onClick={() => { onApply(it.filters); setOpen(false); }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-semibold text-ink">{it.name}</span>
                    <span className="block truncate font-mono text-[10px] text-[var(--muted)]">
                      {it.filters.statuses?.join(", ") || "Any status"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => { await deleteSavedSearch(it.id); await refresh(); }}
                    aria-label="Delete saved search"
                    className="text-[var(--muted)] hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
