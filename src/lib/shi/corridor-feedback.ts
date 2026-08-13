/**
 * Professional feedback on Corridors analyses.
 * Never overwrites CAD/public records — separate quality signal only.
 */

export type CorridorFeedbackKind =
  | "stale_data"
  | "questionable_result"
  | "missing_information"
  | "incorrect_interpretation";

export type CorridorFeedback = {
  id: string;
  kind: CorridorFeedbackKind;
  modelVersion: string;
  countyFips: string;
  createdAt: string;
  note: string;
  /** Optional study / analysis fingerprint */
  analysisAt?: string;
};

export const CORRIDOR_FEEDBACK_LABELS: Record<CorridorFeedbackKind, string> = {
  stale_data: "Stale data",
  questionable_result: "Questionable result",
  missing_information: "Missing information",
  incorrect_interpretation: "Incorrect interpretation",
};

export const CORRIDOR_FEEDBACK_HONESTY =
  "Your flag is a private quality signal for Archie — it does not change county records or other agents’ data.";

const STORAGE_KEY = "archie.corridors.feedback.v1";

function readAll(): CorridorFeedback[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CorridorFeedback[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: CorridorFeedback[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 200)));
  } catch {
    /* quota */
  }
}

export function listCorridorFeedback(countyFips?: string): CorridorFeedback[] {
  const all = readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (!countyFips) return all;
  return all.filter((f) => f.countyFips === countyFips);
}

export function submitCorridorFeedback(opts: {
  kind: CorridorFeedbackKind;
  modelVersion: string;
  countyFips: string;
  note?: string;
  analysisAt?: string;
}): CorridorFeedback {
  const row: CorridorFeedback = {
    id: `cfb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    kind: opts.kind,
    modelVersion: opts.modelVersion,
    countyFips: opts.countyFips,
    createdAt: new Date().toISOString(),
    note: (opts.note || "").trim().slice(0, 500),
    analysisAt: opts.analysisAt,
  };
  writeAll([row, ...readAll()]);
  return row;
}
