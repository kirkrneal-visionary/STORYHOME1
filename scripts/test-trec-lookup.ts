/**
 * TREC license lookup: live TREC search first, partial portal dataset only as
 * a fallback. A TREC result never carries office authority.
 * Isolated. No network (fetch is stubbed). Fictional license data.
 * Run: node --experimental-strip-types scripts/test-trec-lookup.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { purposeAfterTrecPromote } from "../src/lib/account/purpose.ts";
import { verifyTrecLicense } from "../src/lib/trec.ts";

type Call = { url: URL; init?: RequestInit };
let calls: Call[] = [];
let liveDocs: Record<string, object> = {};
let liveStatus = 200;
let datasetRows: object[] = [];

function reset(docs: Record<string, object>, status = 200, rows: object[] = []) {
  calls = [];
  liveDocs = docs;
  liveStatus = status;
  datasetRows = rows;
}

globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
  const url = new URL(String(input));
  calls.push({ url, init });
  if (url.hostname === "www.trec.texas.gov") {
    if (liveStatus !== 200) return new Response("{}", { status: liveStatus });
    const filter = url.searchParams.get("filter_by") ?? "";
    const ids = /customId:=\[([^\]]*)\]/.exec(filter)?.[1].split(",") ?? [];
    const hits = ids.filter((id) => liveDocs[id]).map((id) => ({ document: liveDocs[id] }));
    return Response.json({ found: hits.length, hits });
  }
  if (url.hostname === "data.texas.gov") return Response.json(datasetRows);
  throw new Error(`unexpected fetch ${url}`);
}) as typeof fetch;

const usedDataset = () => calls.some((c) => c.url.hostname === "data.texas.gov");

const agent = {
  customId: "111111-SA",
  firstName: "Pat",
  middleName: "",
  lastName: "Example",
  fullName: "Pat  Example",
  organizationName: "EXAMPLE, PAT",
  status: { value: "Active" },
  type: { subType: "Salesperson" },
  renewalInfo: { expirationDate: "2027-07-31 00:00:00" },
  sponsoringData: [
    { sponsorDate: "2019-01-01", sponsorLicenseNumber: "222220-B" },
    { sponsorDate: "2024-01-22", sponsorLicenseNumber: "222222-B" },
  ],
};
const sponsor = {
  customId: "222222-B",
  firstName: "Lee",
  lastName: "Sponsor",
  fullName: "Lee Q Sponsor",
  status: { value: "Active" },
  type: { subType: "Broker Individual" },
  sponsoringData: [],
};
const company = {
  customId: "3333333-BB",
  firstName: "Lee",
  lastName: "Sponsor",
  fullName: "",
  organizationName: "Example Realty, LLC",
  status: { value: "Active" },
  type: { subType: "Broker Company" },
  sponsoringData: [{ sponsorDate: "2026-11-24", sponsorLicenseNumber: "222222-B" }],
};
const inactive = {
  customId: "444444-SA",
  lastName: "Gone",
  fullName: "Sam Gone",
  status: { value: "Inactive" },
  type: { subType: "Salesperson" },
  renewalInfo: { expirationDate: "8/31/2028" },
};
const docs = {
  "111111-SA": agent,
  "222222-B": sponsor,
  "3333333-BB": company,
  "444444-SA": inactive,
};

// Digits only (the iPhone numeric keypad) finds an older license via live TREC.
reset(docs);
const ok = await verifyTrecLicense("111111", "example");
assert.equal(ok.found, true);
assert.equal(ok.approved, true);
assert.equal(ok.licenseNumber, "111111-SA");
assert.equal(ok.licenseType, "Sales Agent");
assert.equal(ok.accountKind, "agent");
assert.equal(ok.fullName, "Pat Example");
assert.equal(ok.expirationDate, "07/31/2027");
assert.equal(ok.sponsorLicenseNumber, "222222-B");
assert.equal(ok.sponsorName, "Lee Q Sponsor");
assert.equal(
  calls[0].url.searchParams.get("filter_by"),
  "customId:=[111111-SA,111111-B,111111-BB] && type.subType:=[Salesperson,Broker Individual,Broker Company]",
);
assert.ok(new Headers(calls[0].init?.headers).get("x-typesense-api-key"));
assert.equal(usedDataset(), false);

// Full number, any case, with or without the hyphen.
reset(docs);
assert.equal((await verifyTrecLicense(" 111111-sa ", "Example")).approved, true);
assert.equal(
  calls[0].url.searchParams.get("filter_by")?.startsWith("customId:=[111111-SA] && "),
  true,
);
reset(docs);
assert.equal((await verifyTrecLicense("111111SA", "Example")).licenseNumber, "111111-SA");

const wrongName = await verifyTrecLicense("111111", "Smith");
assert.equal(wrongName.found, true);
assert.equal(wrongName.approved, false);
assert.match(wrongName.reason ?? "", /name does not match/);

const off = await verifyTrecLicense("444444", "Gone");
assert.equal(off.found, true);
assert.equal(off.approved, false);
assert.match(off.reason ?? "", /"Inactive", not Active/);
assert.equal(off.expirationDate, "08/31/2028");

// A company license cannot be claimed with its designated broker's last name.
const asPerson = await verifyTrecLicense("3333333", "Sponsor");
assert.equal(asPerson.approved, false);
assert.equal(asPerson.fullName, "Example Realty, LLC");
assert.equal(asPerson.accountKind, "broker");
assert.equal(asPerson.sponsorName, "Lee Q Sponsor");

// Live TREC answered "no such license": no dataset call, honest not-found.
reset(docs);
const none = await verifyTrecLicense("555555", "Nobody");
assert.equal(none.found, false);
assert.equal(none.approved, false);
assert.equal(none.reason, "No TREC license found for that number.");
assert.equal(usedDataset(), false);

// Live TREC down: the portal dataset can still confirm a recent license.
reset({}, 503, [
  {
    license_type: "Sales Agent",
    license_number: "666666-SA",
    full_name: "NEW AGENT",
    last_name: "AGENT",
    status: "Active",
    related_license_number: "222222-B",
    related_license_full_name: "LEE Q SPONSOR",
  },
]);
const fallback = await verifyTrecLicense("666666", "Agent");
assert.equal(fallback.approved, true);
assert.equal(fallback.sponsorName, "LEE Q SPONSOR");
assert.equal(
  calls.find((c) => c.url.hostname === "data.texas.gov")?.url.searchParams.get("$where"),
  "license_number like '666666-%' OR license_number='666666'",
);

// Live TREC down and the partial dataset misses: an error, not "not found".
reset({}, 503, []);
await assert.rejects(verifyTrecLicense("777777", "Older"));

// Input that is not a license number never reaches TREC.
reset(docs);
assert.equal((await verifyTrecLicense("111111' OR '1'='1", undefined)).found, false);
assert.equal((await verifyTrecLicense("111111],[222222-B", undefined)).found, false);
assert.equal((await verifyTrecLicense("   ", undefined)).found, false);
assert.equal(calls.length, 0);

// TREC never grants office.
const trecSource = readFileSync(join(process.cwd(), "src/lib/trec.ts"), "utf8");
assert.doesNotMatch(trecSource, /managing_broker|account_purpose/);
for (const purpose of [
  "consumer",
  "individual_pro",
  "managing_broker",
  "other_professional",
  null,
  undefined,
] as const) {
  assert.notEqual(purposeAfterTrecPromote(purpose), "managing_broker");
}

console.log("trec-lookup: ok");
