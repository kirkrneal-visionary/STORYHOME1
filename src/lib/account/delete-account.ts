/**
 * Own-account delete. Does not touch county or CAD records.
 * Office name can remain; this login is removed.
 */

export const DELETE_CONFIRM_WORD = "DELETE";

export function confirmMatches(input: string | null | undefined): boolean {
  return (input ?? "").trim().toUpperCase() === DELETE_CONFIRM_WORD;
}

export function deleteWarning(purpose: string | null | undefined): string {
  const office =
    purpose === "managing_broker"
      ? " If this is the office login, the office name stays, but this login cannot run it."
      : "";
  return (
    "This login is gone. Homes, listings, and saved work on this login are removed. County records stay." +
    office
  );
}
