/**
 * Corridors V.2 — private study memory (browser) + Vault frame link.
 * Never mutates CAD. Vault save uses existing shi_market_frames path.
 */

import type { CorridorAnalysisResult } from "@/lib/shi/corridor-analysis";

const STORAGE_KEY = "archie.corridors.studies.v1";

export type CorridorSavedStudy = {
  id: string;
  name: string;
  countyFips: string;
  countyName: string;
  savedAt: string;
  /** Study Vault frame id when persisted server-side */
  vaultFrameId: string | null;
  analysis: CorridorAnalysisResult;
};

function readAll(): CorridorSavedStudy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CorridorSavedStudy[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(studies: CorridorSavedStudy[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(studies.slice(0, 40)));
  } catch {
    /* quota */
  }
}

export function listCorridorStudies(countyFips?: string): CorridorSavedStudy[] {
  const all = readAll().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  if (!countyFips) return all;
  return all.filter((s) => s.countyFips === countyFips);
}

export function getCorridorStudy(id: string): CorridorSavedStudy | null {
  return readAll().find((s) => s.id === id) ?? null;
}

export function saveCorridorStudy(opts: {
  name: string;
  analysis: CorridorAnalysisResult;
  vaultFrameId?: string | null;
}): CorridorSavedStudy {
  const study: CorridorSavedStudy = {
    id: `cst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: opts.name.trim() || `Corridor study · ${opts.analysis.countyName}`,
    countyFips: opts.analysis.countyFips,
    countyName: opts.analysis.countyName,
    savedAt: new Date().toISOString(),
    vaultFrameId: opts.vaultFrameId ?? null,
    analysis: opts.analysis,
  };
  const next = [study, ...readAll().filter((s) => s.id !== study.id)];
  writeAll(next);
  return study;
}

export function deleteCorridorStudy(id: string): void {
  writeAll(readAll().filter((s) => s.id !== id));
}
