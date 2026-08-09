/**
 * TREC (Texas Real Estate Commission) license verification.
 *
 * Source: the TREC "Broker and Sales Agent License Holder Information" dataset
 * on the Texas Open Data Portal (Socrata), updated daily and free to query.
 * We use it to gate realtor/broker approval onto Story Home: a pro is approved
 * only if their license number resolves to an ACTIVE record (and the name
 * matches, when provided). The dataset's related-license fields also encode the
 * agent -> sponsoring-broker relationship, which we use for broker rosters.
 *
 * Pure module (server-usable): no secrets required — the data is public.
 */

const DATASET = "https://data.texas.gov/resource/s7ft-44qi.json";

export type TrecAccountKind = "broker" | "agent";

export type TrecVerification = {
  found: boolean;
  /** True only when the license exists AND is Active AND (name matches if given). */
  approved: boolean;
  licenseNumber: string | null;
  licenseType: string | null; // "Broker Individual" | "Broker Company" | "Sales Agent"
  accountKind: TrecAccountKind | null;
  fullName: string | null;
  status: string | null; // "Active", "Inactive", "Expired…", "Revoked", etc.
  expirationDate: string | null;
  designatedSupervisor: boolean;
  sponsorLicenseNumber: string | null;
  sponsorName: string | null;
  reason: string | null;
};

type TrecRow = {
  license_type?: string;
  license_number?: string;
  full_name?: string;
  last_name?: string;
  status?: string;
  license_expiration_date?: string;
  designated_supervisor_flag?: string;
  related_license_number?: string;
  related_license_full_name?: string;
};

function mapKind(licenseType?: string): TrecAccountKind | null {
  if (!licenseType) return null;
  if (licenseType.startsWith("Broker")) return "broker";
  if (licenseType === "Sales Agent") return "agent";
  return null;
}

function soqlWhere(input: string): string {
  const raw = input.trim().toUpperCase();
  // Records store numbers with a suffix (e.g. "855919-SA"). If the user typed
  // only the digits, match the "<digits>-…" form; otherwise match exactly.
  if (/^\d+$/.test(raw)) {
    return `license_number like '${raw}-%' OR license_number='${raw}'`;
  }
  return `license_number='${raw.replace(/'/g, "''")}'`;
}

const notFound = (reason: string): TrecVerification => ({
  found: false,
  approved: false,
  licenseNumber: null,
  licenseType: null,
  accountKind: null,
  fullName: null,
  status: null,
  expirationDate: null,
  designatedSupervisor: false,
  sponsorLicenseNumber: null,
  sponsorName: null,
  reason,
});

export async function verifyTrecLicense(
  license: string,
  lastName?: string,
): Promise<TrecVerification> {
  if (!license?.trim()) return notFound("No license number provided.");

  const url = `${DATASET}?$where=${encodeURIComponent(soqlWhere(license))}&$limit=5`;
  const res = await fetch(url, {
    headers: { "User-Agent": "StoryHome-Verify/1.0", Accept: "application/json" },
    // TREC data is public + reference data; cache briefly to avoid hammering.
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`TREC lookup failed (${res.status})`);
  const rows = (await res.json()) as TrecRow[];
  if (!rows.length) return notFound("No TREC license found for that number.");

  // Prefer an exact/active row when several share a base number.
  const row =
    rows.find((r) => (r.status ?? "").toLowerCase() === "active") ?? rows[0];

  const status = row.status ?? null;
  const isActive = (status ?? "").toLowerCase() === "active";
  const nameOk =
    !lastName ||
    (row.last_name ?? "").toUpperCase().trim() ===
      lastName.toUpperCase().trim();

  let reason: string | null = null;
  if (!isActive) reason = `License status is "${status ?? "unknown"}", not Active.`;
  else if (!nameOk) reason = "License name does not match the name provided.";

  return {
    found: true,
    approved: isActive && nameOk,
    licenseNumber: row.license_number ?? null,
    licenseType: row.license_type ?? null,
    accountKind: mapKind(row.license_type),
    fullName: row.full_name ?? null,
    status,
    expirationDate: row.license_expiration_date ?? null,
    designatedSupervisor: (row.designated_supervisor_flag ?? "0") === "1",
    sponsorLicenseNumber: row.related_license_number || null,
    sponsorName: row.related_license_full_name || null,
    reason,
  };
}
