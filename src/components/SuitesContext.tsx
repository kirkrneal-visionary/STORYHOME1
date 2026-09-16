"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/AuthContext";
import {
  EMPTY_SUITES,
  SUITES_STORAGE_KEY,
  createSuiteId,
  defaultSuites,
  dismissedImportMatches,
  importDismissStorageKey,
  importOfferFingerprint,
  localSuitesAreImportable,
  parseStoredSuites,
  sameAlbumSignature,
  suitesCacheKey,
  type StorySuite,
} from "@/lib/suites";
import { nextCoverTone } from "@/lib/suites";
import {
  apiAddListing,
  apiCreateSuite,
  apiDeleteSuite,
  apiListSuites,
  apiRemoveListing,
  apiRenameSuite,
} from "@/lib/suites-api";

type SuitesStatus = "loading" | "ready" | "failed";

type SuitesContextType = {
  suites: StorySuite[];
  drafts: StorySuite[];
  status: SuitesStatus;
  pending: boolean;
  importOffer: StorySuite[] | null;
  createSuite: (name: string, description?: string) => Promise<StorySuite>;
  renameSuite: (id: string, name: string) => Promise<void>;
  deleteSuite: (id: string) => Promise<void>;
  addListingToSuite: (suiteId: string, listingId: string) => Promise<void>;
  removeListingFromSuite: (suiteId: string, listingId: string) => Promise<void>;
  isListingInAnySuite: (listingId: string) => boolean;
  suitesForListing: (listingId: string) => StorySuite[];
  retry: () => void;
  dismissImport: () => void;
  importLocalSuites: (ids: string[]) => Promise<void>;
};

const SuitesContext = createContext<SuitesContextType | undefined>(undefined);

function readLocal(): StorySuite[] {
  try {
    return (
      parseStoredSuites(window.localStorage.getItem(SUITES_STORAGE_KEY)) ??
      defaultSuites()
    );
  } catch {
    return defaultSuites();
  }
}

function writeLocal(suites: StorySuite[]) {
  try {
    window.localStorage.setItem(SUITES_STORAGE_KEY, JSON.stringify(suites));
  } catch {
    // ignore quota / private mode
  }
}

function readImportDismissed(userId: string): string | null {
  try {
    return window.localStorage.getItem(importDismissStorageKey(userId));
  } catch {
    return null;
  }
}

function writeImportDismissed(userId: string, fingerprint: string) {
  try {
    window.localStorage.setItem(importDismissStorageKey(userId), fingerprint);
  } catch {
    // ignore quota / private mode
  }
}

export function SuitesProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, supabaseConfigured } = useAuth();
  const userId = user?.id ?? "";
  const cacheRef = useRef<string>("");
  const [suites, setSuites] = useState<StorySuite[]>(EMPTY_SUITES);
  const [drafts, setDrafts] = useState<StorySuite[]>(EMPTY_SUITES);
  const [status, setStatus] = useState<SuitesStatus>("loading");
  const [pending, setPending] = useState(false);
  const [importOffer, setImportOffer] = useState<StorySuite[] | null>(null);

  const useAccount = isLoggedIn && supabaseConfigured;

  const refreshAccount = useCallback(
    async (opts?: { considerImport?: boolean }) => {
      if (!useAccount || !userId) return;
      if (opts?.considerImport) setStatus("loading");
      try {
        const next = await apiListSuites();
        setSuites(next);
        cacheRef.current = suitesCacheKey(userId);
        setStatus("ready");
        const local = readLocal();
        setDrafts(local);
        if (!opts?.considerImport) return;
        if (!localSuitesAreImportable(local)) {
          setImportOffer(null);
          return;
        }
        const fresh = local.filter(
          (localSuite) => !next.some((acct) => sameAlbumSignature(acct, localSuite)),
        );
        if (
          fresh.length === 0 ||
          dismissedImportMatches(readImportDismissed(userId), fresh)
        ) {
          setImportOffer(null);
          return;
        }
        setImportOffer(fresh);
      } catch {
        setStatus("failed");
        setDrafts(readLocal());
      }
    },
    [useAccount, userId],
  );

  useEffect(() => {
    if (!useAccount) {
      const local = readLocal();
      setDrafts(local);
      setSuites(local);
      setImportOffer(null);
      setStatus("ready");
      cacheRef.current = "";
      return;
    }
    setSuites(EMPTY_SUITES);
    void refreshAccount({ considerImport: true });
  }, [useAccount, userId, refreshAccount]);

  useEffect(() => {
    if (!useAccount) return;
    function onFocus() {
      void refreshAccount();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [useAccount, refreshAccount]);

  const createSuite = useCallback(
    async (name: string, description = "") => {
      if (!useAccount) {
        const local = readLocal();
        const suite: StorySuite = {
          id: createSuiteId(),
          name: name.trim() || "Untitled Suite",
          description,
          coverTone: nextCoverTone(local.length),
          listingIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const next = [suite, ...local];
        writeLocal(next);
        setDrafts(next);
        setSuites(next);
        return suite;
      }
      setPending(true);
      try {
        const body = await apiCreateSuite({ name, description });
        setSuites(body.suites);
        return body.suite;
      } finally {
        setPending(false);
      }
    },
    [useAccount],
  );

  const renameSuite = useCallback(
    async (id: string, name: string) => {
      if (!useAccount) {
        const next = readLocal().map((s) =>
          s.id === id
            ? { ...s, name: name.trim() || s.name, updatedAt: new Date().toISOString() }
            : s,
        );
        writeLocal(next);
        setDrafts(next);
        setSuites(next);
        return;
      }
      setPending(true);
      try {
        const suite = await apiRenameSuite(id, name);
        setSuites((prev) => prev.map((s) => (s.id === id ? suite : s)));
      } finally {
        setPending(false);
      }
    },
    [useAccount],
  );

  const deleteSuite = useCallback(
    async (id: string) => {
      if (!useAccount) {
        const next = readLocal().filter((s) => s.id !== id);
        writeLocal(next);
        setDrafts(next);
        setSuites(next);
        return;
      }
      setPending(true);
      try {
        await apiDeleteSuite(id);
        setSuites((prev) => prev.filter((s) => s.id !== id));
      } finally {
        setPending(false);
      }
    },
    [useAccount],
  );

  const addListingToSuite = useCallback(
    async (suiteId: string, listingId: string) => {
      if (!useAccount) {
        const next = readLocal().map((s) => {
          if (s.id !== suiteId || s.listingIds.includes(listingId)) return s;
          return {
            ...s,
            listingIds: [listingId, ...s.listingIds],
            updatedAt: new Date().toISOString(),
          };
        });
        writeLocal(next);
        setDrafts(next);
        setSuites(next);
        return;
      }
      setPending(true);
      try {
        const suite = await apiAddListing(suiteId, listingId);
        setSuites((prev) => prev.map((s) => (s.id === suiteId ? suite : s)));
      } finally {
        setPending(false);
      }
    },
    [useAccount],
  );

  const removeListingFromSuite = useCallback(
    async (suiteId: string, listingId: string) => {
      if (!useAccount) {
        const next = readLocal().map((s) =>
          s.id === suiteId
            ? {
                ...s,
                listingIds: s.listingIds.filter((id) => id !== listingId),
                updatedAt: new Date().toISOString(),
              }
            : s,
        );
        writeLocal(next);
        setDrafts(next);
        setSuites(next);
        return;
      }
      setPending(true);
      try {
        const suite = await apiRemoveListing(suiteId, listingId);
        setSuites((prev) => prev.map((s) => (s.id === suiteId ? suite : s)));
      } finally {
        setPending(false);
      }
    },
    [useAccount],
  );

  const dismissImport = useCallback(() => {
    if (userId && importOffer) {
      writeImportDismissed(userId, importOfferFingerprint(importOffer));
    }
    setImportOffer(null);
  }, [userId, importOffer]);

  const importLocalSuites = useCallback(
    async (ids: string[]) => {
      if (!useAccount) return;
      const local = readLocal();
      const chosen = local.filter((s) => ids.includes(s.id));
      setPending(true);
      try {
        const imported: string[] = [];
        for (const suite of chosen) {
          await apiCreateSuite({
            name: suite.name,
            description: suite.description,
            coverTone: suite.coverTone,
            listingIds: suite.listingIds,
          });
          imported.push(suite.id);
        }
        const remain = local.filter((s) => !imported.includes(s.id));
        writeLocal(remain);
        setDrafts(remain);
        setImportOffer(null);
        if (userId && remain.length > 0 && localSuitesAreImportable(remain)) {
          writeImportDismissed(userId, importOfferFingerprint(remain));
        }
        await refreshAccount();
      } finally {
        setPending(false);
      }
    },
    [useAccount, userId, refreshAccount],
  );

  const isListingInAnySuite = useCallback(
    (listingId: string) => suites.some((s) => s.listingIds.includes(listingId)),
    [suites],
  );

  const suitesForListing = useCallback(
    (listingId: string) => suites.filter((s) => s.listingIds.includes(listingId)),
    [suites],
  );

  const value = useMemo(
    () => ({
      suites: status === "loading" ? EMPTY_SUITES : suites,
      drafts,
      status,
      pending,
      importOffer,
      createSuite,
      renameSuite,
      deleteSuite,
      addListingToSuite,
      removeListingFromSuite,
      isListingInAnySuite,
      suitesForListing,
      retry: () => void refreshAccount(),
      dismissImport,
      importLocalSuites,
    }),
    [
      suites,
      drafts,
      status,
      pending,
      importOffer,
      createSuite,
      renameSuite,
      deleteSuite,
      addListingToSuite,
      removeListingFromSuite,
      isListingInAnySuite,
      suitesForListing,
      refreshAccount,
      dismissImport,
      importLocalSuites,
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
