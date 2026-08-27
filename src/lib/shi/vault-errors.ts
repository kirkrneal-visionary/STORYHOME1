/** User-facing Study Vault errors (never dump internal CAD keys). */
export function formatShiVaultError(err: unknown): string {
  let msg = "Unknown error";
  if (err instanceof Error) msg = err.message;
  else if (typeof err === "string") msg = err;
  else if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    msg = (err as { message: string }).message;
  }
  if (
    /shi_study_folders|shi_market_frames|shi_frame_snapshots|schema cache|does not exist|relation/i.test(
      msg,
    )
  ) {
    return "Study Vault is not set up on this account yet. Try again in a moment.";
  }
  if (/shi-studies|bucket|storage/i.test(msg)) {
    return "Map Memory photos could not be stored right now. Try saving again.";
  }
  if (/Sign in|Story Pro|403|401/i.test(msg)) {
    return msg;
  }
  return msg || "Study Vault request failed";
}
