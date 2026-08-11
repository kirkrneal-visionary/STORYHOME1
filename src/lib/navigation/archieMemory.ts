/**
 * Remember last Archie module (Research / Study Vault) for this browser tab.
 * Wave N2 — sessionStorage only; no server state.
 */

export type ArchieModule = "research" | "vault";

const STORAGE_KEY = "archie-last-module";

const listeners = new Set<() => void>();

export function subscribeArchieMemory(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function emitArchieMemory() {
  listeners.forEach((l) => l());
}

export function parseArchieModule(
  section: string | null | undefined,
): ArchieModule {
  return section === "vault" ? "vault" : "research";
}

export function archieHrefForModule(module: ArchieModule): string {
  return module === "vault"
    ? "/portal/intelligence?section=vault"
    : "/portal/intelligence";
}

export function readLastArchieModule(): ArchieModule {
  if (typeof window === "undefined") return "research";
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw === "vault" ? "vault" : "research";
  } catch {
    return "research";
  }
}

export function writeLastArchieModule(module: ArchieModule): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, module);
  } catch {
    /* private mode / quota — ignore */
  }
  emitArchieMemory();
}

export function rememberArchieFromSearch(
  section: string | null | undefined,
): ArchieModule {
  const module = parseArchieModule(section);
  writeLastArchieModule(module);
  return module;
}
