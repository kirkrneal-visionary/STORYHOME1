"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardPaste,
  Home,
  ImagePlus,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Trees,
  X,
} from "lucide-react";
import {
  validateListing,
  type ComplianceIssue,
} from "@/lib/listing-compliance";
import {
  parseMlsPaste,
  toListingDraft,
  type ProListing,
} from "@/lib/pro-listings";
import {
  AVAILABLE_COUNTIES,
  cadFreshnessLabel,
  searchParcels,
  searchParcelsStatewide,
  type CountyParcel,
} from "@/lib/supabase/parcels";
import {
  summarizeTracts,
  type LinkedParcel,
} from "@/lib/supabase/listing-parcels";
import { txCountyNameByFips } from "@/lib/tx-counties";
import { LISTING_STATUSES, PROPERTY_TYPES } from "@/lib/listing-filters";
import { SERVICE_COUNTIES } from "@/lib/markets";
import {
  CheckboxField,
  NumberField,
  SelectField,
  TextAreaField,
  TextField,
  toNumber,
} from "@/components/broker/ui";
import { CadCountyStatusPanel } from "@/components/broker/CadCountyStatusPanel";
import { cn } from "@/lib/utils";

const COUNTY_OPTIONS = [
  { value: "", label: "— Select county —" },
  ...SERVICE_COUNTIES.map((c) => ({ value: c.name, label: c.name })),
  // Out-of-area examples so compliance can demonstrate the service-area rule.
  { value: "Harris County", label: "Harris County (out of area)" },
  { value: "Dallas County", label: "Dallas County (out of area)" },
];

const TYPE_OPTIONS = [
  { value: "", label: "— Select type —" },
  ...PROPERTY_TYPES.map((t) => ({ value: t, label: t })),
];

const STATUS_OPTIONS = LISTING_STATUSES.map((s) => ({ value: s, label: s }));

export function ListingForm({
  initial,
  initialTracts = [],
  onSave,
  onCancel,
}: {
  initial: ProListing;
  initialTracts?: LinkedParcel[];
  onSave: (listing: ProListing, tracts: LinkedParcel[]) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ProListing>(initial);
  const [tracts, setTracts] = useState<LinkedParcel[]>(initialTracts);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importNote, setImportNote] = useState("");
  const [attemptedPublish, setAttemptedPublish] = useState(false);

  const compliance = useMemo(
    () => validateListing(toListingDraft(form)),
    [form],
  );

  function set<K extends keyof ProListing>(key: K, value: ProListing[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleImport() {
    const parsed = parseMlsPaste(importText);
    const keys = Object.keys(parsed);
    if (keys.length === 0) {
      setImportNote(
        "No recognizable fields found. Use lines like 'Price: $425,000'.",
      );
      return;
    }
    setForm((prev) => ({ ...prev, ...parsed, source: "mls-import" }));
    setImportNote(`Imported ${keys.length} field(s) from MLS paste.`);
  }

  function updatePhoto(index: number, value: string) {
    setForm((prev) => {
      const photos = [...prev.photos];
      photos[index] = value;
      return { ...prev, photos };
    });
  }
  function addPhoto() {
    setForm((prev) => ({ ...prev, photos: [...prev.photos, ""] }));
  }
  function removePhoto(index: number) {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }
  function makePrimary(index: number) {
    setForm((prev) => {
      const photos = [...prev.photos];
      const [chosen] = photos.splice(index, 1);
      return { ...prev, photos: [chosen, ...photos] };
    });
  }

  // Tracts drive the listing's location, total acreage, CAD link, and MH
  // serial → MLS auto-fill. Applied here (not in an effect) so we never fight
  // the agent's manual edits except when the parcel set actually changes.
  function updateTracts(next: LinkedParcel[]) {
    setTracts(next);
    if (next.length > 0) {
      const primary = next.find((t) => t.isPrimary) ?? next[0];
      const sum = summarizeTracts(next);
      const serialFromCad =
        next.map((t) => t.mhSerialNumber).find(Boolean) || "";
      const hudFromCad = next.map((t) => t.mhHudLabel).find(Boolean) || "";
      const isMh =
        next.some((t) => t.propertyCategory === "personal") ||
        Boolean(serialFromCad);
      setForm((prev) => ({
        ...prev,
        cadPropId: primary.propId,
        streetAddress: primary.situsAddress || prev.streetAddress,
        city: primary.situsCity || prev.city,
        countyName: txCountyNameByFips(primary.countyFips) || prev.countyName,
        zip: primary.situsZip || prev.zip,
        acres:
          sum.totalAcres > 0 ? Number(sum.totalAcres.toFixed(4)) : prev.acres,
        mhSerialNumber: serialFromCad || prev.mhSerialNumber,
        mhHudLabel: hudFromCad || prev.mhHudLabel,
        propertyType: isMh
          ? "Mobile / Manufactured"
          : prev.propertyType,
      }));
    } else {
      setForm((prev) => ({ ...prev, cadPropId: "" }));
    }
  }

  function handleSave() {
    setAttemptedPublish(true);
    if (!compliance.canPublish) return;
    onSave({ ...form, photos: form.photos.filter((p) => p.trim()) }, tracts);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-serif text-2xl font-bold text-ink">
          {initial.streetAddress ? "Edit listing" : "New listing"}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-ink"
        >
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>

      {/* MLS import */}
      <section className="rounded-xl border border-hairline bg-[var(--surface)] p-4">
        <button
          type="button"
          onClick={() => setImportOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-semibold text-ink"
        >
          <ClipboardPaste className="h-4 w-4 text-gold" />
          Import from your MLS (copy &amp; paste)
        </button>
        {importOpen && (
          <div className="mt-3">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={6}
              placeholder={`Paste MLS detail lines, e.g.\nAddress: 512 Pine Ave\nCity: Lufkin\nCounty: Angelina County\nPrice: $425,000\nBeds: 3\nBaths: 2\nSqFt: 1,850\nYear Built: 2006\nMLS#: ETX2048`}
              className="w-full rounded-md border border-hairline bg-[var(--background)] px-3 py-2 font-mono text-xs text-ink outline-none focus:border-gold"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleImport}
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)]"
              >
                Parse &amp; fill fields
              </button>
              {importNote && (
                <span className="text-xs text-[var(--muted)]">{importNote}</span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Multi-tract CAD parcel manager — auto-fills location, totals land,
          flags homes vs. lots, MH serials, and combines the legal description */}
      <TractManager tracts={tracts} onChange={updateTracts} />
      <CadCountyStatusPanel />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: form fields */}
        <div className="space-y-5">
          {tracts.some((t) => t.needsAgentDetail) && (
            <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
              <p className="text-sm font-semibold text-ink">
                CAD details incomplete — agent entry required
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                One or more linked tracts (for example Tyler County geometry-only
                parcels) are missing ownership, legal, or improvement detail.
                Fill the fields below so the MLS listing is complete.
              </p>
            </div>
          )}

          <FieldGroup title="Location">
            <TextField
              id="lf-address"
              label="Street address"
              value={form.streetAddress}
              onChange={(v) => set("streetAddress", v)}
              placeholder="123 Main St"
            />
            <div className="grid grid-cols-2 gap-4">
              <TextField
                id="lf-city"
                label="City"
                value={form.city}
                onChange={(v) => set("city", v)}
              />
              <SelectField
                id="lf-county"
                label="County"
                value={form.countyName}
                onChange={(v) => set("countyName", v)}
                options={COUNTY_OPTIONS}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField
                id="lf-state"
                label="State"
                value={form.state}
                onChange={(v) => set("state", v)}
              />
              <TextField
                id="lf-zip"
                label="ZIP"
                value={form.zip}
                onChange={(v) => set("zip", v)}
              />
            </div>
          </FieldGroup>

          <FieldGroup title="Price & type">
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                id="lf-price"
                label="List price"
                prefix="$"
                value={String(form.price || "")}
                onChange={(v) => set("price", toNumber(v))}
                step="1000"
              />
              <SelectField
                id="lf-status"
                label="Status"
                value={form.status}
                onChange={(v) => set("status", v as ProListing["status"])}
                options={STATUS_OPTIONS}
              />
            </div>
            <SelectField
              id="lf-type"
              label="Property type"
              value={form.propertyType}
              onChange={(v) => set("propertyType", v as ProListing["propertyType"])}
              options={TYPE_OPTIONS}
            />
          </FieldGroup>

          <FieldGroup title="Property facts">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <NumberField
                id="lf-beds"
                label="Beds"
                value={String(form.beds || "")}
                onChange={(v) => set("beds", toNumber(v))}
                step="1"
              />
              <NumberField
                id="lf-baths"
                label="Baths"
                value={String(form.baths || "")}
                onChange={(v) => set("baths", toNumber(v))}
                step="0.5"
              />
              <NumberField
                id="lf-sqft"
                label="Living area"
                suffix="sqft"
                value={String(form.sqft || "")}
                onChange={(v) => set("sqft", toNumber(v))}
                step="10"
              />
              <NumberField
                id="lf-acres"
                label="Acres"
                value={String(form.acres || "")}
                onChange={(v) => set("acres", toNumber(v))}
                step="0.01"
              />
              <NumberField
                id="lf-year"
                label="Year built"
                value={String(form.yearBuilt || "")}
                onChange={(v) => set("yearBuilt", toNumber(v))}
                step="1"
              />
            </div>
            {(form.propertyType === "Mobile / Manufactured" ||
              form.mhSerialNumber ||
              tracts.some((t) => t.mhSerialNumber || t.needsAgentDetail)) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  id="lf-mh-serial"
                  label="Mobile home serial #"
                  value={form.mhSerialNumber}
                  onChange={(v) => set("mhSerialNumber", v.toUpperCase())}
                  placeholder="From CAD legal or agent entry"
                />
                <TextField
                  id="lf-mh-hud"
                  label="HUD / label #"
                  value={form.mhHudLabel}
                  onChange={(v) => set("mhHudLabel", v.toUpperCase())}
                  placeholder="Optional HUD label"
                />
              </div>
            )}
          </FieldGroup>

          <FieldGroup title="Marketing description">
            <TextAreaField
              id="lf-desc"
              label="Public remarks"
              value={form.description}
              onChange={(v) => set("description", v)}
              rows={5}
              placeholder="Describe the property's features — not the ideal occupants."
            />
          </FieldGroup>

          <FieldGroup title="Brokerage & license (TREC)">
            <div className="grid grid-cols-2 gap-4">
              <TextField
                id="lf-broker"
                label="Brokerage"
                value={form.brokerageName}
                onChange={(v) => set("brokerageName", v)}
              />
              <TextField
                id="lf-mls"
                label="MLS #"
                value={form.mlsNumber}
                onChange={(v) => set("mlsNumber", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TextField
                id="lf-agent"
                label="Listing agent"
                value={form.listingAgentName}
                onChange={(v) => set("listingAgentName", v)}
              />
              <TextField
                id="lf-license"
                label="TREC license #"
                value={form.listingAgentLicense}
                onChange={(v) => set("listingAgentLicense", v)}
              />
            </div>
          </FieldGroup>

          <FieldGroup title="Photos">
            <div className="space-y-2">
              {form.photos.length === 0 && (
                <p className="text-xs text-[var(--muted)]">
                  No photos yet. Add an image URL below.
                </p>
              )}
              {form.photos.map((photo, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={photo}
                    onChange={(e) => updatePhoto(i, e.target.value)}
                    placeholder="https://…/photo.jpg"
                    className="h-9 flex-1 rounded-md border border-hairline bg-[var(--background)] px-3 font-mono text-xs text-ink outline-none focus:border-gold"
                  />
                  {i === 0 ? (
                    <span className="inline-flex items-center gap-1 rounded bg-gold px-2 py-1 font-mono text-[10px] font-bold text-navy uppercase">
                      <Star className="h-3 w-3" /> Primary
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => makePrimary(i)}
                      className="rounded border border-hairline px-2 py-1 font-mono text-[10px] font-semibold text-[var(--muted)] hover:text-ink"
                    >
                      Make primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="Remove photo"
                    className="rounded border border-hairline p-1.5 text-[var(--muted)] hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addPhoto}
                className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-2 text-xs font-semibold text-ink"
              >
                <ImagePlus className="h-4 w-4" /> Add photo
              </button>
            </div>
          </FieldGroup>

          <FieldGroup title="Required disclosures">
            <CheckboxField
              id="lf-leadpaint"
              label="Lead-based paint disclosure attached (required for homes built before 1978)."
              checked={form.leadPaintDisclosureProvided}
              onChange={(v) => set("leadPaintDisclosureProvided", v)}
            />
            <CheckboxField
              id="lf-sellerdisc"
              label="Texas Seller's Disclosure Notice attached (Tex. Prop. Code §5.008)."
              checked={form.sellersDisclosureProvided}
              onChange={(v) => set("sellersDisclosureProvided", v)}
            />
          </FieldGroup>
        </div>

        {/* Right: live compliance panel */}
        <div className="lg:sticky lg:top-[88px] lg:self-start">
          <CompliancePanel
            issues={compliance.issues}
            canPublish={compliance.canPublish}
            errorCount={compliance.errors.length}
            warningCount={compliance.warnings.length}
          />

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!compliance.canPublish}
              className={cn(
                "h-11 rounded-lg px-5 text-sm font-bold transition-opacity",
                compliance.canPublish
                  ? "bg-gold text-navy hover:opacity-90"
                  : "cursor-not-allowed bg-gold/30 text-navy/50",
              )}
            >
              {compliance.canPublish
                ? "Publish listing"
                : `Fix ${compliance.errors.length} error${compliance.errors.length === 1 ? "" : "s"} to publish`}
            </button>
            {attemptedPublish && !compliance.canPublish && (
              <p className="text-center text-xs text-red-300">
                Listing cannot be published until all compliance errors are
                resolved.
              </p>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-lg border border-hairline text-sm font-semibold text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompliancePanel({
  issues,
  canPublish,
  errorCount,
  warningCount,
}: {
  issues: ComplianceIssue[];
  canPublish: boolean;
  errorCount: number;
  warningCount: number;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2">
        {canPublish ? (
          <ShieldCheck className="h-5 w-5 text-teal-soft" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-red-300" />
        )}
        <h4 className="font-serif text-lg font-bold text-ink">
          Compliance check
        </h4>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {canPublish
          ? warningCount > 0
            ? `Ready to publish — ${warningCount} advisory warning${warningCount === 1 ? "" : "s"} to review.`
            : "All checks passed. Ready to publish."
          : `${errorCount} blocking error${errorCount === 1 ? "" : "s"} · ${warningCount} warning${warningCount === 1 ? "" : "s"}.`}
      </p>

      {issues.length === 0 ? (
        <p className="mt-4 rounded-lg border border-teal-soft/40 bg-teal-soft/10 p-3 text-sm text-ink">
          No issues detected. Automated pre-check only — broker review still
          applies.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {issues.map((issue, i) => (
            <li
              key={`${issue.code}-${i}`}
              className={cn(
                "rounded-lg border p-3 text-sm",
                issue.severity === "error"
                  ? "border-red-400/40 bg-red-500/10"
                  : "border-gold/40 bg-gold/10",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                    issue.severity === "error"
                      ? "bg-red-400/20 text-red-200"
                      : "bg-gold/20 text-gold",
                  )}
                >
                  {issue.severity}
                </span>
                <span className="font-mono text-[10px] text-[var(--muted)] uppercase">
                  {issue.field}
                </span>
              </div>
              <p className="mt-1.5 text-ink">{issue.message}</p>
              {issue.suggestion && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Fix: {issue.suggestion}
                </p>
              )}
              {issue.reference && (
                <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">
                  {issue.reference}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TractManager({
  tracts,
  onChange,
}: {
  tracts: LinkedParcel[];
  onChange: (next: LinkedParcel[]) => void;
}) {
  // "" = statewide (all ingested counties); a source key narrows to one county.
  const [countyFilter, setCountyFilter] = useState<string>("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CountyParcel[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  async function run() {
    setSearching(true);
    setSearched(true);
    try {
      setResults(
        countyFilter
          ? await searchParcels(countyFilter, query)
          : await searchParcelsStatewide(query),
      );
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function addTract(p: CountyParcel) {
    if (tracts.some((t) => t.source === p.source && t.propId === p.propId)) return;
    const linked: LinkedParcel = {
      source: p.source,
      propId: p.propId,
      countyFips: p.countyFips,
      isPrimary: tracts.length === 0,
      situsAddress: p.situsAddress,
      situsCity: p.situsCity,
      situsZip: p.situsZip,
      legalAcreage: p.legalAcreage,
      improvementValue: p.improvementValue,
      legalDescription: p.legalDescription,
      mhSerialNumber: p.mhSerialNumber,
      mhHudLabel: p.mhHudLabel,
      detailLevel: p.detailLevel,
      needsAgentDetail: p.needsAgentDetail,
      ingestedAt: p.ingestedAt,
      propertyCategory: p.propertyCategory,
    };
    onChange([...tracts, linked]);
    setResults([]);
    setSearched(false);
    setQuery("");
  }

  function removeTract(t: LinkedParcel) {
    const next = tracts.filter(
      (x) => !(x.source === t.source && x.propId === t.propId),
    );
    if (t.isPrimary && next.length > 0 && !next.some((x) => x.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
  }

  function setPrimary(t: LinkedParcel) {
    onChange(
      tracts.map((x) => ({
        ...x,
        isPrimary: x.source === t.source && x.propId === t.propId,
      })),
    );
  }

  const sum = summarizeTracts(tracts);

  return (
    <section className="rounded-xl border border-hairline bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-gold" />
        <h4 className="text-sm font-semibold text-ink">
          Parcels / tracts — search Texas CAD by parcel ID, address, or owner
        </h4>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Search Real + Personal CAD parcels across the 7 launch counties. MH
        serial numbers from CAD legal descriptions auto-fill the MLS fields.
        Geometry-only counties (e.g. Tyler) require agent detail entry.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void run();
            }
          }}
          placeholder="Parcel ID, address, owner, or MH serial #"
          className="h-10 min-w-[200px] flex-1 rounded-lg border border-hairline bg-[var(--background)] px-3 text-sm text-ink outline-none focus:border-gold"
        />
        <select
          value={countyFilter}
          onChange={(e) => setCountyFilter(e.target.value)}
          title="Optional: narrow to one county"
          className="h-10 rounded-lg border border-hairline bg-[var(--background)] px-2 text-sm text-ink"
        >
          <option value="">All Texas counties</option>
          {AVAILABLE_COUNTIES.map((c) => (
            <option key={c.source} value={c.source}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={run}
          disabled={searching}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-gold px-4 text-sm font-bold text-navy disabled:opacity-60"
        >
          <Search className="h-4 w-4" /> {searching ? "…" : "Search"}
        </button>
      </div>

      {searched && !searching && results.length === 0 && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          No matching parcels. Try the CAD Property ID, just the street name, or
          the owner’s last name.
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
          {results.map((p) => {
            const added = tracts.some(
              (t) => t.source === p.source && t.propId === p.propId,
            );
            return (
              <li
                key={`${p.source}-${p.propId}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-[var(--background)] p-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {p.situsAddress || p.legalDescription}
                  </p>
                  <p className="truncate font-mono text-[11px] text-[var(--muted)]">
                    {txCountyNameByFips(p.countyFips) ?? p.source} · Prop {p.propId}
                    {p.propertyCategory ? ` · ${p.propertyCategory}` : ""}
                    {p.ownerName ? ` · ${p.ownerName}` : ""}
                    {p.legalAcreage != null ? ` · ${p.legalAcreage} ac` : ""}
                    {p.mhSerialNumber ? ` · SN ${p.mhSerialNumber}` : ""}
                    {p.needsAgentDetail ? " · needs agent detail" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addTract(p)}
                  disabled={added}
                  className="shrink-0 rounded-lg border border-gold px-3 py-1.5 text-xs font-bold text-gold disabled:opacity-40"
                >
                  {added ? "Added" : "Add tract"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tracts.length > 0 && (
        <div className="mt-3 space-y-2">
          {tracts.map((t) => {
            const isHome =
              (t.improvementValue ?? 0) > 0 ||
              t.propertyCategory === "personal" ||
              Boolean(t.mhSerialNumber);
            const fresh = cadFreshnessLabel(t.ingestedAt);
            return (
              <div
                key={`${t.source}-${t.propId}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-hairline bg-[var(--background)] p-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    title={isHome ? "Has a structure / MH" : "Land only"}
                    className={cn(
                      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                      isHome
                        ? "bg-teal-soft/20 text-teal-soft"
                        : "bg-gold/15 text-gold",
                    )}
                  >
                    {isHome ? <Home className="h-3 w-3" /> : <Trees className="h-3 w-3" />}
                    {t.mhSerialNumber ? "MH" : isHome ? "Home" : "Land"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {t.situsAddress || t.legalDescription || `Parcel ${t.propId}`}
                    </p>
                    <p className="truncate font-mono text-[11px] text-[var(--muted)]">
                      {txCountyNameByFips(t.countyFips) ?? t.source} · Prop {t.propId}
                      {t.legalAcreage != null ? ` · ${t.legalAcreage} ac` : ""}
                      {t.mhSerialNumber ? ` · SN ${t.mhSerialNumber}` : ""}
                      {" · "}
                      <span className={fresh.stale ? "text-gold" : ""}>
                        {fresh.label}
                      </span>
                      {t.needsAgentDetail ? " · agent detail needed" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPrimary(t)}
                    title={t.isPrimary ? "Primary tract" : "Set as primary"}
                    className={cn(
                      "rounded p-1.5",
                      t.isPrimary ? "text-gold" : "text-[var(--muted)] hover:text-gold",
                    )}
                  >
                    <Star className={cn("h-4 w-4", t.isPrimary && "fill-gold")} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTract(t)}
                    title="Remove tract"
                    className="rounded p-1.5 text-[var(--muted)] hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          <div className="rounded-lg bg-[color-mix(in_srgb,var(--gold)_12%,var(--surface))] px-3 py-2 font-mono text-[11px] font-bold text-ink">
            {sum.tractCount} tract{sum.tractCount === 1 ? "" : "s"} ·{" "}
            {sum.totalAcres.toFixed(2)} ac total · {sum.homes} home
            {sum.homes === 1 ? "" : "s"} + {sum.lots} lot
            {sum.lots === 1 ? "" : "s"}
          </div>
          {sum.legalCombined && (
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">
              Combined legal: {sum.legalCombined}
            </p>
          )}
          <p className="text-[11px] text-[var(--muted)]">
            The starred tract is primary (map pin + address). Building sqft / year
            built come from CAD improvements where available; otherwise enter them
            under Property facts.
          </p>
        </div>
      )}
    </section>
  );
}

function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
