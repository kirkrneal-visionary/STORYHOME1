"use client";

import { useSyncExternalStore } from "react";
import {
  archieHrefForModule,
  readLastArchieModule,
  subscribeArchieMemory,
} from "@/lib/navigation/archieMemory";
import { NAVIGATION_NETWORKS } from "@/lib/navigation/networks";

function subscribe(onStoreChange: () => void) {
  const unsub = subscribeArchieMemory(onStoreChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === "archie-last-module") onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    unsub();
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  return archieHrefForModule(readLastArchieModule());
}

function getServerSnapshot() {
  return NAVIGATION_NETWORKS.archie.href;
}

/** Top-bar Archie node href — restores last Research / Study Vault module. */
export function useArchieEntryHref(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
