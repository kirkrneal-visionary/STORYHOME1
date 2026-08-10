"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  EMPTY_SUITES,
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

const COVER_TONES = [
  "from-[#1b5a50] to-[#0E1E38]",
  "from-[#F0B93B] to-[#0E1E38]",
  "from-[#152a4e] to-[#123F38]",
  "from-[#0E1E38] to-[#1b5a50]",
  "from-[#123F38] to-[#F0B93B]",
];

function persist(suites: StorySuite[]) {
  try {
    window.localStorage.setItem(SUITES_STORAGE_KEY, JSON.stringify(suites));
  } catch {
    // ignore quota / private mode
  }
}

export function SuitesProvider({ children }: { children: React.ReactNode }) {
  const [suites, setSuites] = useState<StorySuite[]>(EMPTY_SUITES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const parsed = parseStoredSuites(
        window.localStorage.getItem(SUITES_STORAGE_KEY),
      );
      const next = parsed ?? defaultSuites();
      // Always write back so stale/demo albums are cleaned from storage too.
      persist(next);
      setSuites(next);
    } catch {
      setSuites(defaultSuites());
    }
    setReady(true);
  }, []);

  const update = useCallback((next: StorySuite[]) => {
    setSuites(next);
    persist(next);
  }, []);

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
      update([suite, ...suites]);
      return suite;
    },
    [suites, update],
  );

  const renameSuite = useCallback(
    (id: string, name: string) => {
      update(
        suites.map((s) =>
          s.id === id
            ? {
                ...s,
                name: name.trim() || s.name,
                updatedAt: new Date().toISOString(),
              }
            : s,
        ),
      );
    },
    [suites, update],
  );

  const deleteSuite = useCallback(
    (id: string) => {
      update(suites.filter((s) => s.id !== id));
    },
    [suites, update],
  );

  const addListingToSuite = useCallback(
    (suiteId: string, listingId: string) => {
      update(
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
    [suites, update],
  );

  const removeListingFromSuite = useCallback(
    (suiteId: string, listingId: string) => {
      update(
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
    [suites, update],
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
      suites: ready ? suites : EMPTY_SUITES,
      createSuite,
      renameSuite,
      deleteSuite,
      addListingToSuite,
      removeListingFromSuite,
      isListingInAnySuite,
      suitesForListing,
    }),
    [
      ready,
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
