/** User-facing Study Vault errors (never dump internal CAD keys). */
export function formatShiVaultError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "Unknown error");
  if (
    /shi_study_folders|shi_market_frames|shi_frame_snapshots|schema cache|does not exist|relation/i.test(
      msg,
    )
  ) {
    return "Study Vault is not set up on this database yet. Apply Supabase migration 0023_shi_market_frames.sql (tables + shi-studies storage), then retry.";
  }
  if (/shi-studies|bucket|storage/i.test(msg)) {
    return "Map Memory storage is not ready. Ensure the shi-studies bucket from migration 0023 is applied, then retry save.";
  }
  if (/Sign in|Story Pro|403|401/i.test(msg)) {
    return msg;
  }
  return msg || "Study Vault request failed";
}
