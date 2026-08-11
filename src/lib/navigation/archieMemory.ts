/**
 * Remember last Archie module for this browser tab.
 * sessionStorage only — no server state.
 */

export type ArchieModule = "research" | "vault" | "prospects";

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
  if (section === "vault") return "vault";
  if (section === "prospects") return "prospects";
  return "research";
}

export function archieHrefForModule(module: ArchieModule): string {
  if (module === "vault") return "/portal/intelligence?section=vault";
  if (module === "prospects") return "/portal/intelligence?section=prospects";
  return "/portal/intelligence";
}

export function readLastArchieModule(): ArchieModule {
  if (typeof window === "undefined") return "research";
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return parseArchieModule(raw);
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
