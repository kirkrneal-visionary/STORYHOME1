"use client";

import { useSyncExternalStore } from "react";
import type { ListingStatus } from "@/lib/listing-filters";
import {
  seedProListings,
  type ProListing,
} from "@/lib/pro-listings";

const STORAGE_KEY = "story-home-pro-listings";

/** Stable seed computed once for server snapshot + first-run population. */
const SEED: ProListing[] = seedProListings({
  name: "Sarah Jenkins",
  license: "654321",
  brokerage: "Story Home Realty",
});

let store: ProListing[] | null = null;
const listeners = new Set<() => void>();

function loadFromStorage(): ProListing[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ProListing[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore malformed storage
  }
  return SEED;
}

function persist(next: ProListing[]) {
  store = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota / private mode errors
    }
  }
  listeners.forEach((l) => l());
}

function getSnapshot(): ProListing[] {
  if (store === null) store = loadFromStorage();
  return store;
}

function getServerSnapshot(): ProListing[] {
  return SEED;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProListings(): ProListing[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function upsertListing(listing: ProListing) {
  const current = getSnapshot();
  const exists = current.some((l) => l.id === listing.id);
  const stamped = { ...listing, updatedAt: Date.now() };
  const next = exists
    ? current.map((l) => (l.id === listing.id ? stamped : l))
    : [stamped, ...current];
  persist(next);
}

export function removeListing(id: string) {
  persist(getSnapshot().filter((l) => l.id !== id));
}

export function setListingStatus(id: string, status: ListingStatus) {
  persist(
    getSnapshot().map((l) =>
      l.id === id ? { ...l, status, updatedAt: Date.now() } : l,
    ),
  );
}

export function resetListings() {
  persist(SEED);
}
