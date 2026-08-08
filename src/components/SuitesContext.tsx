"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  SUITES_STORAGE_KEY,
  type StorySuite,
  createSuiteId,
  defaultSuites,
  parseStoredSuites,
} from "@/lib/suites";

type SuitesContextType = {
  suites: StorySuite[];
  createSuite: (name: string, description?: string) => StorySuite;
  renameSuite: (id: string, name: string) => void;
  deleteSuite: (id: string) => void;
  addListingToSuite: (suiteId: string, listingId: string) => void;
  removeListingFromSuite: (suiteId: string, listingId: string) => void;
  isListingInAnySuite: (listingId: string) => boolean;
  suitesForListing: (listingId: string) => StorySuite[];
};

const SuitesContext = createContext<SuitesContextType | undefined>(undefined);
const SUITES_EVENT = "story-home-suites-change";

function readSuites(): StorySuite[] {
  const parsed = parseStoredSuites(
    window.localStorage.getItem(SUITES_STORAGE_KEY),
  );
  if (parsed) return parsed;
  const seeded = defaultSuites();
  window.localStorage.setItem(SUITES_STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function subscribe(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener("storage", handler);
  window.addEventListener(SUITES_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(SUITES_EVENT, handler);
  };
}

function writeSuites(suites: StorySuite[]) {
  window.localStorage.setItem(SUITES_STORAGE_KEY, JSON.stringify(suites));
  window.dispatchEvent(new Event(SUITES_EVENT));
}

const COVER_TONES = [
  "from-[#1b5a50] to-[#0E1E38]",
  "from-[#F0B93B] to-[#0E1E38]",
  "from-[#152a4e] to-[#123F38]",
  "from-[#0E1E38] to-[#1b5a50]",
  "from-[#123F38] to-[#F0B93B]",
];

export function SuitesProvider({ children }: { children: React.ReactNode }) {
  const suites = useSyncExternalStore(subscribe, readSuites, () =>
    defaultSuites(),
  );

  const createSuite = useCallback(
    (name: string, description = "") => {
      const suite: StorySuite = {
        id: createSuiteId(),
        name: name.trim() || "Untitled Suite",
        description,
        coverTone: COVER_TONES[suites.length % COVER_TONES.length],
        listingIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      writeSuites([suite, ...suites]);
      return suite;
    },
    [suites],
  );

  const renameSuite = useCallback(
    (id: string, name: string) => {
      writeSuites(
        suites.map((s) =>
          s.id === id
            ? { ...s, name: name.trim() || s.name, updatedAt: new Date().toISOString() }
            : s,
        ),
      );
    },
    [suites],
  );

  const deleteSuite = useCallback(
    (id: string) => {
      writeSuites(suites.filter((s) => s.id !== id));
    },
    [suites],
  );

  const addListingToSuite = useCallback(
    (suiteId: string, listingId: string) => {
      writeSuites(
        suites.map((s) => {
          if (s.id !== suiteId) return s;
          if (s.listingIds.includes(listingId)) return s;
          return {
            ...s,
            listingIds: [listingId, ...s.listingIds],
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [suites],
  );

  const removeListingFromSuite = useCallback(
    (suiteId: string, listingId: string) => {
      writeSuites(
        suites.map((s) =>
          s.id === suiteId
            ? {
                ...s,
                listingIds: s.listingIds.filter((id) => id !== listingId),
                updatedAt: new Date().toISOString(),
              }
            : s,
        ),
      );
    },
    [suites],
  );

  const isListingInAnySuite = useCallback(
    (listingId: string) => suites.some((s) => s.listingIds.includes(listingId)),
    [suites],
  );

  const suitesForListing = useCallback(
    (listingId: string) =>
      suites.filter((s) => s.listingIds.includes(listingId)),
    [suites],
  );

  const value = useMemo(
    () => ({
      suites,
      createSuite,
      renameSuite,
      deleteSuite,
      addListingToSuite,
      removeListingFromSuite,
      isListingInAnySuite,
      suitesForListing,
    }),
    [
      suites,
      createSuite,
      renameSuite,
      deleteSuite,
      addListingToSuite,
      removeListingFromSuite,
      isListingInAnySuite,
      suitesForListing,
    ],
  );

  return (
    <SuitesContext.Provider value={value}>{children}</SuitesContext.Provider>
  );
}

export function useSuites() {
  const ctx = useContext(SuitesContext);
  if (!ctx) throw new Error("useSuites must be used within SuitesProvider");
  return ctx;
}
