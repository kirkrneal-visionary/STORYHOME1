/** Raw Mapbox/MapLibre camera errors — never show these on screen. */
export function isRawMapEngineError(msg: string): boolean {
  return /LngLatLike|LngLat instance|Invalid LngLat|lat must be between|lng must be between/i.test(
    msg,
  );
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return "Unknown error";
}

/** User-facing Study Vault errors (never dump internal CAD keys). */
export function formatShiVaultError(err: unknown): string {
  if (err == null || err === "") return "";
  const msg = errorMessage(err);
  if (isRawMapEngineError(msg)) {
    return "";
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
