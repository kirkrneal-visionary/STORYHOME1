"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";

function client() {
  const s = getBrowserSupabase();
  if (!s) throw new Error("Supabase is not configured.");
  return s;
}

export type Home = {
  id: string;
  ownerId: string;
  nickname: string;
  address: string;
  city: string;
  countyName: string;
  state: string;
  zip: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  propertyType: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  photoUrl: string | null;
  photoPath: string | null;
  lotAcres: number | null;
  waterSource: string | null;
  sewerType: string | null;
  fenced: boolean;
  agExemption: boolean;
  roadFrontage: string | null;
  isFinanced: boolean | null;
  titleCompany: string | null;
  gfNumber: string | null;
  lender: string | null;
  loanAmount: number | null;
};

export type HomeStructure = {
  id: string;
  homeId: string;
  kind: string;
  kindOther: string | null;
  name: string;
  sizeSqft: number | null;
  yearBuilt: number | null;
  notes: string | null;
};

export type HomeFolder = { id: string; homeId: string; name: string };

export type AuditEntry = {
  id: string;
  action: string;
  scope: string | null;
  detail: string | null;
  at: string;
};

export type HomeRecord = {
  id: string;
  homeId: string;
  occurredOn: string;
  category: string;
  categoryOther: string | null;
  title: string;
  description: string | null;
  cost: number;
  contractor: string | null;
  warrantyUntil: string | null;
  isCapitalImprovement: boolean;
  receiptPath: string | null;
  receiptName: string | null;
};

export type HomeExpense = {
  id: string;
  homeId: string;
  spentOn: string;
  category: string;
  categoryOther: string | null;
  vendor: string | null;
  amount: number;
  taxYear: number | null;
  isCapitalImprovement: boolean;
  receiptPath: string | null;
  receiptName: string | null;
};

export type HomeDocument = {
  id: string;
  homeId: string;
  docType: string;
  docTypeOther: string | null;
  title: string;
  filePath: string | null;
  folderId: string | null;
  isClosingDoc: boolean;
  closingSlot: string | null;
  sensitive: boolean;
  createdAt: string;
};

export type HomeGrant = {
  id: string;
  homeId: string;
  granteeAgentId: string;
  scope: "full" | "report";
  status: "active" | "revoked";
  grantedAt: string;
  granteeName?: string;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const n = (v: any): number | null => (v == null ? null : Number(v));

const toHome = (r: any): Home => ({
  id: r.id,
  ownerId: r.owner_id,
  nickname: r.nickname,
  address: r.address,
  city: r.city,
  countyName: r.county_name,
  state: r.state,
  zip: r.zip,
  beds: n(r.beds),
  baths: n(r.baths),
  sqft: n(r.sqft),
  yearBuilt: n(r.year_built),
  propertyType: r.property_type,
  purchaseDate: r.purchase_date,
  purchasePrice: n(r.purchase_price),
  photoUrl: r.photo_url,
  photoPath: r.photo_path,
  lotAcres: n(r.lot_acres),
  waterSource: r.water_source,
  sewerType: r.sewer_type,
  fenced: Boolean(r.fenced),
  agExemption: Boolean(r.ag_exemption),
  roadFrontage: r.road_frontage,
  isFinanced: r.is_financed,
  titleCompany: r.title_company,
  gfNumber: r.gf_number,
  lender: r.lender,
  loanAmount: n(r.loan_amount),
});

const toRecord = (r: any): HomeRecord => ({
  id: r.id,
  homeId: r.home_id,
  occurredOn: r.occurred_on,
  category: r.category,
  categoryOther: r.category_other,
  title: r.title,
  description: r.description,
  cost: Number(r.cost ?? 0),
  contractor: r.contractor,
  warrantyUntil: r.warranty_until,
  isCapitalImprovement: Boolean(r.is_capital_improvement),
  receiptPath: r.receipt_path,
  receiptName: r.receipt_name,
});

const toExpense = (r: any): HomeExpense => ({
  id: r.id,
  homeId: r.home_id,
  spentOn: r.spent_on,
  category: r.category,
  categoryOther: r.category_other,
  vendor: r.vendor,
  amount: Number(r.amount ?? 0),
  taxYear: n(r.tax_year),
  isCapitalImprovement: Boolean(r.is_capital_improvement),
  receiptPath: r.receipt_path,
  receiptName: r.receipt_name,
});

const toDoc = (r: any): HomeDocument => ({
  id: r.id,
  homeId: r.home_id,
  docType: r.doc_type,
  docTypeOther: r.doc_type_other,
  title: r.title,
  filePath: r.file_path,
  folderId: r.folder_id,
  isClosingDoc: Boolean(r.is_closing_doc),
  closingSlot: r.closing_slot,
  sensitive: Boolean(r.sensitive),
  createdAt: r.created_at,
});

/* -------------------------------- Homes -------------------------------- */

export async function fetchMyHomes(ownerId: string): Promise<Home[]> {
  const { data, error } = await client()
    .from("homes")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toHome);
}

/** Homes shared with the current agent (via an active grant). */
export async function fetchSharedHomes(): Promise<Home[]> {
  const { data, error } = await client().from("homes").select("*");
  if (error) throw error;
  // RLS returns own homes + granted homes; caller filters to not-owned.
  return (data ?? []).map(toHome);
}

export async function createHome(
  ownerId: string,
  input: Partial<Home>,
): Promise<Home> {
  const { data, error } = await client()
    .from("homes")
    .insert({
      owner_id: ownerId,
      nickname: input.nickname || "My Home",
      address: input.address ?? "",
      city: input.city ?? "",
      county_name: input.countyName ?? "",
      state: input.state ?? "TX",
      zip: input.zip ?? "",
      beds: input.beds,
      baths: input.baths,
      sqft: input.sqft,
      year_built: input.yearBuilt,
      property_type: input.propertyType,
      purchase_date: input.purchaseDate || null,
      purchase_price: input.purchasePrice,
      photo_url: input.photoUrl || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toHome(data);
}

export async function deleteHome(id: string): Promise<void> {
  const { error } = await client().from("homes").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------- Records ------------------------------- */

export async function fetchRecords(homeId: string): Promise<HomeRecord[]> {
  const { data, error } = await client()
    .from("home_records")
    .select("*")
    .eq("home_id", homeId)
    .order("occurred_on", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toRecord);
}

export async function addRecord(
  ownerId: string,
  homeId: string,
  input: Partial<HomeRecord>,
): Promise<void> {
  const { error } = await client().from("home_records").insert({
    home_id: homeId,
    owner_id: ownerId,
    occurred_on: input.occurredOn || new Date().toISOString().slice(0, 10),
    category: input.category || "Other",
    category_other: input.categoryOther || null,
    title: input.title,
    description: input.description || null,
    cost: input.cost ?? 0,
    contractor: input.contractor || null,
    warranty_until: input.warrantyUntil || null,
    is_capital_improvement: input.isCapitalImprovement ?? false,
    receipt_path: input.receiptPath || null,
    receipt_name: input.receiptName || null,
  });
  if (error) throw error;
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await client().from("home_records").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------- Expenses ------------------------------ */

export async function fetchExpenses(homeId: string): Promise<HomeExpense[]> {
  const { data, error } = await client()
    .from("home_expenses")
    .select("*")
    .eq("home_id", homeId)
    .order("spent_on", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toExpense);
}

export async function addExpense(
  ownerId: string,
  homeId: string,
  input: Partial<HomeExpense>,
): Promise<void> {
  const { error } = await client().from("home_expenses").insert({
    home_id: homeId,
    owner_id: ownerId,
    spent_on: input.spentOn || new Date().toISOString().slice(0, 10),
    category: input.category || "Other",
    category_other: input.categoryOther || null,
    vendor: input.vendor || null,
    amount: input.amount ?? 0,
    tax_year:
      input.taxYear ??
      Number(new Date(input.spentOn || Date.now()).getFullYear()),
    is_capital_improvement: input.isCapitalImprovement ?? false,
    receipt_path: input.receiptPath || null,
    receipt_name: input.receiptName || null,
  });
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await client().from("home_expenses").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------ Documents ------------------------------ */

export async function fetchDocuments(homeId: string): Promise<HomeDocument[]> {
  const { data, error } = await client()
    .from("home_documents")
    .select("*")
    .eq("home_id", homeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toDoc);
}

/**
 * Downscale/compress large images in the browser before upload so phone photos
 * (often 3–10 MB) upload quickly. Non-images or already-small files pass through
 * unchanged; any failure falls back to the original file.
 */
export async function compressImageIfNeeded(
  file: File,
  maxDim = 1600,
  quality = 0.82,
): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!file.type.startsWith("image/") || file.size < 800 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", quality),
    );
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function uploadHomeFile(
  ownerId: string,
  homeId: string,
  file: File,
): Promise<string> {
  const path = `${ownerId}/${homeId}/${Date.now()}-${file.name}`;
  const { error } = await client()
    .storage.from("home-docs")
    .upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function addDocument(
  ownerId: string,
  homeId: string,
  input: {
    docType: string;
    docTypeOther?: string | null;
    title: string;
    filePath: string | null;
    folderId?: string | null;
    isClosingDoc?: boolean;
    closingSlot?: string | null;
    sensitive?: boolean;
  },
): Promise<void> {
  const { error } = await client().from("home_documents").insert({
    home_id: homeId,
    owner_id: ownerId,
    doc_type: input.docType,
    doc_type_other: input.docTypeOther || null,
    title: input.title,
    file_path: input.filePath,
    folder_id: input.folderId || null,
    is_closing_doc: input.isClosingDoc ?? false,
    closing_slot: input.closingSlot || null,
    sensitive: input.sensitive ?? false,
  });
  if (error) throw error;
}

export async function renameDocument(id: string, title: string): Promise<void> {
  const { error } = await client()
    .from("home_documents")
    .update({ title })
    .eq("id", id);
  if (error) throw error;
}

export async function signedUrlFor(path: string): Promise<string | null> {
  const { data, error } = await client()
    .storage.from("home-docs")
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await client().from("home_documents").delete().eq("id", id);
  if (error) throw error;
}

/* -------------------------------- Grants ------------------------------- */

export async function fetchGrants(homeId: string): Promise<HomeGrant[]> {
  const { data, error } = await client()
    .from("home_access_grants")
    .select("*, grantee:profiles!home_access_grants_grantee_agent_id_fkey(full_name)")
    .eq("home_id", homeId)
    .order("granted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    homeId: r.home_id,
    granteeAgentId: r.grantee_agent_id,
    scope: r.scope,
    status: r.status,
    grantedAt: r.granted_at,
    granteeName: r.grantee?.full_name,
  }));
}

export async function findProfileByEmail(
  email: string,
): Promise<{ id: string; full_name: string; account_kind: string } | null> {
  const { data, error } = await client()
    .from("profiles")
    .select("id, full_name, account_kind")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

export async function grantAccess(
  ownerId: string,
  homeId: string,
  granteeAgentId: string,
  scope: "full" | "report",
): Promise<void> {
  const { error } = await client()
    .from("home_access_grants")
    .upsert(
      {
        home_id: homeId,
        owner_id: ownerId,
        grantee_agent_id: granteeAgentId,
        scope,
        status: "active",
        revoked_at: null,
      },
      { onConflict: "home_id,grantee_agent_id" },
    );
  if (error) throw error;
}

export async function revokeGrant(id: string): Promise<void> {
  const { error } = await client()
    .from("home_access_grants")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/* ------------------------------ Directory ------------------------------ */

export type ProContact = {
  id: string;
  fullName: string;
  role: string;
  city: string | null;
};

export async function fetchPros(): Promise<ProContact[]> {
  const { data, error } = await client()
    .from("profiles")
    .select("id, full_name, professional_role, primary_market_city")
    .in("professional_role", [
      "inspector",
      "appraiser",
      "lender",
      "realtor_broker",
    ]);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    fullName: r.full_name,
    role: r.professional_role,
    city: r.primary_market_city,
  }));
}

/* ------------------------------ Update home ---------------------------- */

export async function updateHome(
  id: string,
  patch: Partial<Home>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  const map: Record<string, string> = {
    nickname: "nickname", address: "address", city: "city",
    countyName: "county_name", state: "state", zip: "zip", beds: "beds",
    baths: "baths", sqft: "sqft", yearBuilt: "year_built",
    propertyType: "property_type", purchaseDate: "purchase_date",
    purchasePrice: "purchase_price", photoPath: "photo_path",
    lotAcres: "lot_acres", waterSource: "water_source", sewerType: "sewer_type",
    fenced: "fenced", agExemption: "ag_exemption", roadFrontage: "road_frontage",
    isFinanced: "is_financed", titleCompany: "title_company",
    gfNumber: "gf_number", lender: "lender", loanAmount: "loan_amount",
  };
  for (const [k, col] of Object.entries(map)) {
    if (k in patch) row[col] = (patch as Record<string, unknown>)[k] ?? null;
  }
  if (Object.keys(row).length === 0) return;
  const { error } = await client().from("homes").update(row).eq("id", id);
  if (error) throw error;
}

/* ------------------------------ Structures ----------------------------- */

const toStructure = (r: any): HomeStructure => ({
  id: r.id, homeId: r.home_id, kind: r.kind, kindOther: r.kind_other,
  name: r.name, sizeSqft: n(r.size_sqft), yearBuilt: n(r.year_built),
  notes: r.notes,
});

export async function fetchStructures(homeId: string): Promise<HomeStructure[]> {
  const { data, error } = await client()
    .from("home_structures").select("*").eq("home_id", homeId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toStructure);
}

export async function addStructure(
  ownerId: string, homeId: string, input: Partial<HomeStructure>,
): Promise<void> {
  const { error } = await client().from("home_structures").insert({
    home_id: homeId, owner_id: ownerId, kind: input.kind || "Other",
    kind_other: input.kindOther || null, name: input.name || "",
    size_sqft: input.sizeSqft, year_built: input.yearBuilt,
    notes: input.notes || null,
  });
  if (error) throw error;
}

export async function deleteStructure(id: string): Promise<void> {
  const { error } = await client().from("home_structures").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------- Folders ------------------------------- */

export async function fetchFolders(homeId: string): Promise<HomeFolder[]> {
  const { data, error } = await client()
    .from("home_folders").select("*").eq("home_id", homeId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, homeId: r.home_id, name: r.name }));
}

export async function addFolder(
  ownerId: string, homeId: string, name: string,
): Promise<void> {
  const { error } = await client().from("home_folders").insert({
    home_id: homeId, owner_id: ownerId, scope: "documents", name,
  });
  if (error) throw error;
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await client().from("home_folders").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------ Disclosure ----------------------------- */

export async function fetchDisclosure(
  homeId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await client()
    .from("home_disclosures").select("data").eq("home_id", homeId).maybeSingle();
  if (error) return {};
  return (data?.data as Record<string, unknown>) ?? {};
}

export async function saveDisclosure(
  ownerId: string, homeId: string, data: Record<string, unknown>,
): Promise<void> {
  const { error } = await client().from("home_disclosures").upsert(
    { home_id: homeId, owner_id: ownerId, data, updated_at: new Date().toISOString() },
    { onConflict: "home_id" },
  );
  if (error) throw error;
}

/* -------------------------------- Audit -------------------------------- */

export async function fetchAudit(homeId: string): Promise<AuditEntry[]> {
  const { data, error } = await client()
    .from("home_access_audit").select("*").eq("home_id", homeId)
    .order("at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.id, action: r.action, scope: r.scope, detail: r.detail, at: r.at,
  }));
}

export async function logAudit(
  ownerId: string, homeId: string,
  action: string, scope: string | null, detail: string | null,
): Promise<void> {
  await client().from("home_access_audit").insert({
    home_id: homeId, owner_id: ownerId, actor_id: ownerId,
    action, scope, detail,
  });
}

/* -------------------------------- Export ------------------------------- */

export async function exportHomeData(homeId: string): Promise<string> {
  const [home, records, expenses, docs, grants, structures, disclosure] =
    await Promise.all([
      client().from("homes").select("*").eq("id", homeId).maybeSingle(),
      client().from("home_records").select("*").eq("home_id", homeId),
      client().from("home_expenses").select("*").eq("home_id", homeId),
      client().from("home_documents").select("*").eq("home_id", homeId),
      client().from("home_access_grants").select("*").eq("home_id", homeId),
      client().from("home_structures").select("*").eq("home_id", homeId),
      client().from("home_disclosures").select("data").eq("home_id", homeId).maybeSingle(),
    ]);
  return JSON.stringify(
    {
      home: home.data,
      records: records.data,
      expenses: expenses.data,
      documents: docs.data,
      grants: grants.data,
      structures: structures.data,
      disclosure: disclosure.data?.data ?? {},
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

/** Curated East Texas banks & credit unions (static until a data source is added). */
export const LOCAL_BANKS: { name: string; type: string; area: string }[] = [
  { name: "First Bank & Trust East Texas", type: "Bank", area: "Lufkin" },
  { name: "Commercial Bank of Texas", type: "Bank", area: "Nacogdoches / Lufkin" },
  { name: "BancorpSouth (Cadence)", type: "Bank", area: "Livingston" },
  { name: "Texas Bank and Trust", type: "Bank", area: "East Texas" },
  { name: "Southside Bank", type: "Bank", area: "Tyler / East Texas" },
  { name: "TDECU", type: "Credit Union", area: "Southeast Texas" },
  { name: "Education First FCU", type: "Credit Union", area: "East Texas" },
  { name: "Neches FCU", type: "Credit Union", area: "East Texas" },
];
