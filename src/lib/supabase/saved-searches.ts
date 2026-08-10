"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";
import type { SearchFilters } from "@/lib/listing-filters";

export type SavedSearch = {
  id: string;
  name: string;
  filters: SearchFilters;
  createdAt: number;
};

export async function listSavedSearches(userId: string): Promise<SavedSearch[]> {
  const s = getBrowserSupabase();
  if (!s) return [];
  const { data, error } = await s
    .from("saved_searches")
    .select("id, name, filters, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    filters: r.filters as SearchFilters,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : 0,
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export async function saveSearch(
  userId: string,
  name: string,
  filters: SearchFilters,
): Promise<void> {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Supabase is not configured.");
  const { error } = await s
    .from("saved_searches")
    .insert({ user_id: userId, name, filters });
  if (error) throw error;
}

export async function deleteSavedSearch(id: string): Promise<void> {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Supabase is not configured.");
  const { error } = await s.from("saved_searches").delete().eq("id", id);
  if (error) throw error;
}
