/** Agent-private prospect tags — not CAD fields. */
export const SHI_PROSPECT_TAG_MAX = 12;
export const SHI_PROSPECT_TAG_LEN = 24;

/**
 * Normalize tag list for storage: trim, collapse spaces, case-insensitive
 * dedupe, hard caps. Empty / junk tags dropped.
 */
export function normalizeProspectTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const t = raw.trim().replace(/\s+/g, " ").slice(0, SHI_PROSPECT_TAG_LEN);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= SHI_PROSPECT_TAG_MAX) break;
  }
  return out;
}

export function parseTagInput(text: string): string[] {
  return normalizeProspectTags(
    text
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
