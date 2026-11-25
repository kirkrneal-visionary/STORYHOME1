/**
 * TREC (Texas Real Estate Commission) license verification.
 *
 * Source: the index behind TREC's public License Holder Search
 * (https://www.trec.texas.gov/license-search). It lists every current license.
 * Fallback: TREC's "Broker and Sales Agent License Holder Information" dataset
 * on the Texas Open Data Portal (Socrata). Since 2026 that dataset only holds
 * the newest ~6,000 licenses, so a miss there does not mean "no such license".
 *
 * We use it to gate realtor/broker approval onto Story Home: a pro is approved
 * only if their license number resolves to an ACTIVE record (and the name
 * matches, when provided). The sponsor fields also encode the
 * agent -> sponsoring-broker relationship, which we use for broker rosters.
 *
 * Pure module (server-usable): no secrets required — the data is public.
 */

const LIVE_SEARCH =
  "https://www.trec.texas.gov/ts/collections/licenses/documents/search";
// Search-only key that TREC's License Holder Search page ships to every browser.
const LIVE_SEARCH_KEY = "HvqEl9eBZY6YjQBAU8uW4e9KBGHRvqrd";
const DATASET = "https://data.texas.gov/resource/s7ft-44qi.json";
const USER_AGENT = "StoryHome-Verify/1.0";

/** TREC live sub-type -> the dataset's license_type label. */
const LIVE_TYPES: Record<string, string> = {
  Salesperson: "Sales Agent",
  "Broker Individual": "Broker Individual",
  "Broker Company": "Broker Company",
};
/** Sales agent, individual broker, business broker. */
const LICENSE_SUFFIXES = ["SA", "B", "BB"];

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

type LiveDoc = {
  customId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName?: string;
  organizationName?: string;
  status?: { value?: string };
  type?: { subType?: string };
  renewalInfo?: { expirationDate?: string };
  sponsoringData?: { sponsorLicenseNumber?: string; sponsorDate?: string }[];
};

type LicenseQuery = { digits: string; suffix: string | null };

function mapKind(licenseType?: string): TrecAccountKind | null {
  if (!licenseType) return null;
  if (licenseType.startsWith("Broker")) return "broker";
  if (licenseType === "Sales Agent") return "agent";
  return null;
}

function parseLicense(input: string): LicenseQuery | null {
  const raw = input.trim().toUpperCase().replace(/\s+/g, "");
  const m = /^(\d+)(?:-?([A-Z]+))?$/.exec(raw);
  return m ? { digits: m[1], suffix: m[2] ?? null } : null;
}

function soqlWhere({ digits, suffix }: LicenseQuery): string {
  // Records store numbers with a suffix (e.g. "855919-SA"). If the user typed
  // only the digits, match the "<digits>-…" form; otherwise match exactly.
  if (!suffix) {
    return `license_number like '${digits}-%' OR license_number='${digits}'`;
  }
  return `license_number='${digits}-${suffix}'`;
}

const clean = (value?: string) => value?.replace(/\s+/g, " ").trim() || undefined;

/** "2027-07-31 00:00:00" or "7/31/2027" -> "07/31/2027" (the dataset's format). */
function usDate(raw?: string): string | undefined {
  const iso = raw?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  const us = raw?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return us ? `${us[1].padStart(2, "0")}/${us[2].padStart(2, "0")}/${us[3]}` : raw;
}

function rowFromLive(doc: LiveDoc): TrecRow {
  const company = doc.type?.subType === "Broker Company";
  const sponsor = [...(doc.sponsoringData ?? [])].sort((a, b) =>
    (b.sponsorDate ?? "").localeCompare(a.sponsorDate ?? ""),
  )[0];
  return {
    license_type: LIVE_TYPES[doc.type?.subType ?? ""],
    license_number: doc.customId,
    // A company record carries its designated broker's personal name. Keep it
    // out of the last-name check so a person cannot verify as the company.
    full_name: company
      ? clean(doc.organizationName)
      : (clean(doc.fullName) ??
        clean([doc.firstName, doc.middleName, doc.lastName].join(" "))),
    last_name: company ? "" : clean(doc.lastName),
    status: doc.status?.value,
    license_expiration_date: usDate(doc.renewalInfo?.expirationDate),
    related_license_number: sponsor?.sponsorLicenseNumber,
  };
}

async function searchLive(licenseNumbers: string[]): Promise<LiveDoc[]> {
  const params = new URLSearchParams({
    q: "*",
    query_by: "customId",
    filter_by:
      `customId:=[${licenseNumbers.join(",")}] && ` +
      `type.subType:=[${Object.keys(LIVE_TYPES).join(",")}]`,
    per_page: "10",
  });
  const res = await fetch(`${LIVE_SEARCH}?${params}`, {
    headers: {
      "X-TYPESENSE-API-KEY": LIVE_SEARCH_KEY,
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`TREC search failed (${res.status})`);
  const body = (await res.json()) as { hits?: { document?: LiveDoc }[] };
  if (!Array.isArray(body.hits)) throw new Error("TREC search returned no hits");
  return body.hits.flatMap((hit) => (hit.document ? [hit.document] : []));
}

async function liveName(licenseNumber: string): Promise<string | undefined> {
  if (!/^\d+-[A-Z]+$/.test(licenseNumber)) return undefined;
  try {
    const [doc] = await searchLive([licenseNumber]);
    return doc ? rowFromLive(doc).full_name : undefined;
  } catch {
    return undefined;
  }
}

/** Prefer an exact/active row when several share a base number. */
function pickRow(rows: TrecRow[]): TrecRow | null {
  return (
    rows.find((r) => (r.status ?? "").toLowerCase() === "active") ??
    rows[0] ??
    null
  );
}

async function liveRow(query: LicenseQuery): Promise<TrecRow | null> {
  const numbers = query.suffix
    ? [`${query.digits}-${query.suffix}`]
    : LICENSE_SUFFIXES.map((suffix) => `${query.digits}-${suffix}`);
  const row = pickRow((await searchLive(numbers)).map(rowFromLive));
  if (row?.related_license_number) {
    row.related_license_full_name = await liveName(row.related_license_number);
  }
  return row;
}

async function datasetRow(query: LicenseQuery): Promise<TrecRow | null> {
  const url = `${DATASET}?$where=${encodeURIComponent(soqlWhere(query))}&$limit=5`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    // TREC data is public + reference data; cache briefly to avoid hammering.
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`TREC lookup failed (${res.status})`);
  return pickRow((await res.json()) as TrecRow[]);
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
  const query = parseLicense(license);
  if (!query) return notFound("No TREC license found for that number.");

  let row: TrecRow | null;
  try {
    row = await liveRow(query);
  } catch {
    row = await datasetRow(query);
    // The partial dataset cannot prove a license does not exist.
    if (!row) throw new Error("TREC license search is unavailable");
  }
  if (!row) return notFound("No TREC license found for that number.");

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
