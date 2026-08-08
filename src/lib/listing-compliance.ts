/**
 * Listing compliance engine for Story Pro.
 *
 * Validates an agent-entered listing against (1) federal Fair Housing
 * advertising rules, (2) Texas/TREC advertising and disclosure requirements,
 * and (3) basic data-integrity rules. Pure and framework-free so it can be
 * unit-verified in isolation.
 *
 * IMPORTANT: This is a best-effort automated pre-check to catch the most common
 * violations. It is not legal advice and does not replace broker review or the
 * requirements of the agent's local MLS and jurisdiction.
 */

import { PROPERTY_TYPES, type PropertyType } from "@/lib/listing-filters";
import { getCountyByName } from "@/lib/markets";

export type ComplianceSeverity = "error" | "warning";

export type ComplianceIssue = {
  code: string;
  field: string;
  severity: ComplianceSeverity;
  message: string;
  suggestion?: string;
  reference?: string;
};

export type ListingDraft = {
  streetAddress: string;
  city: string;
  countyName: string;
  state: string;
  zip: string;
  price: number;
  propertyType: PropertyType | "";
  beds: number;
  baths: number;
  sqft: number;
  acres: number;
  yearBuilt: number;
  description: string;
  brokerageName: string;
  listingAgentName: string;
  listingAgentLicense: string;
  photos: string[];
  /** Federal lead-based paint disclosure attached (pre-1978 homes). */
  leadPaintDisclosureProvided: boolean;
  /** Texas Seller's Disclosure Notice (Tex. Prop. Code §5.008) attached. */
  sellersDisclosureProvided: boolean;
};

export type ComplianceResult = {
  issues: ComplianceIssue[];
  errors: ComplianceIssue[];
  warnings: ComplianceIssue[];
  /** True when there are no blocking errors. */
  canPublish: boolean;
};

/**
 * Fair Housing advertising rules. Under the Fair Housing Act (42 U.S.C. §3604)
 * and HUD advertising guidance, ads may not state a preference, limitation, or
 * discrimination based on a protected class. Each rule matches language that
 * commonly expresses such a preference.
 *
 * `severity: "error"` = clear discriminatory preference (blocks publish).
 * `severity: "warning"` = language HUD/NAR flags as risky/steering (review).
 */
type FairHousingRule = {
  code: string;
  /** Word-boundary regex, case-insensitive. */
  pattern: RegExp;
  protectedClass: string;
  severity: ComplianceSeverity;
  message: string;
  suggestion: string;
};

export const FAIR_HOUSING_RULES: FairHousingRule[] = [
  {
    code: "FH_FAMILIAL_NO_CHILDREN",
    pattern: /\b(no children|no kids|adults? only|adult community|empty nesters?|no more than \w+ (children|kids))\b/i,
    protectedClass: "Familial status",
    severity: "error",
    message:
      "Excludes or discourages families with children (familial status).",
    suggestion:
      "Describe the home, not the occupants. For 55+ housing, only use age language if the property legally qualifies under HOPA.",
  },
  {
    code: "FH_FAMILIAL_MATURE",
    pattern: /\b(mature (couple|individual|person|tenant)|perfect for singles|bachelor pad)\b/i,
    protectedClass: "Familial status / age",
    severity: "warning",
    message: "May signal a preference about household make-up.",
    suggestion: "Focus on features (bedrooms, layout) rather than who should live there.",
  },
  {
    code: "FH_RELIGION",
    pattern: /\b(christian|catholic|jewish|muslim|church[- ]going|near (a )?church|mosque nearby|temple nearby)\b/i,
    protectedClass: "Religion",
    severity: "error",
    message: "References religion or religious institutions as a selling point.",
    suggestion:
      "Remove religious references. Cite distance to generic 'places of worship' only if listing all nearby amenities neutrally.",
  },
  {
    code: "FH_RACE_NATIONAL_ORIGIN",
    pattern: /\b(whites? only|no (blacks?|hispanics?|asians?|latinos?)|integrated neighborhood|ethnic|exclusive (neighborhood|community))\b/i,
    protectedClass: "Race / color / national origin",
    severity: "error",
    message: "States a racial, ethnic, or national-origin preference.",
    suggestion: "Remove any reference to the race, ethnicity, or origin of residents.",
  },
  {
    code: "FH_DISABILITY",
    pattern: /\b(no wheelchairs?|able[- ]bodied|must be (healthy|physically fit)|not for disabled)\b/i,
    protectedClass: "Disability",
    severity: "error",
    message: "Excludes or discourages persons with disabilities.",
    suggestion:
      "Describe accessibility features factually (e.g., 'step-free entry') instead of restricting who may apply.",
  },
  {
    code: "FH_SEX",
    pattern: /\b(male only|female only|men only|women only|gentlemen preferred)\b/i,
    protectedClass: "Sex",
    severity: "error",
    message: "States a preference based on sex.",
    suggestion: "Remove sex-based language.",
  },
  {
    code: "FH_STEERING",
    pattern: /\b(safe neighborhood|crime[- ]free|family[- ]friendly neighborhood|good for families)\b/i,
    protectedClass: "Steering",
    severity: "warning",
    message: "Subjective community claims can be considered steering.",
    suggestion:
      "Replace with verifiable, property-focused facts. Avoid characterizing the people or safety of an area.",
  },
];

const MAX_PRICE = 500_000_000;

/** Validate a listing draft. Returns categorized issues and a publish gate. */
export function validateListing(draft: ListingDraft): ComplianceResult {
  const issues: ComplianceIssue[] = [];

  // --- Required data-integrity fields ------------------------------------
  if (!draft.streetAddress.trim()) {
    issues.push(req("streetAddress", "Street address is required."));
  }
  if (!draft.city.trim()) {
    issues.push(req("city", "City is required."));
  }
  if (!/^\d{5}(-\d{4})?$/.test(draft.zip.trim())) {
    issues.push({
      code: "REQ_ZIP",
      field: "zip",
      severity: "error",
      message: "A valid 5-digit ZIP code is required.",
    });
  }

  // --- Service-area / jurisdiction ---------------------------------------
  if (draft.state.trim().toUpperCase() !== "TX") {
    issues.push({
      code: "AREA_STATE",
      field: "state",
      severity: "error",
      message:
        "Story Pro currently serves Texas only. Listings outside TX cannot be published yet.",
    });
  }
  const county = getCountyByName(draft.countyName);
  if (!county) {
    issues.push({
      code: "AREA_COUNTY",
      field: "countyName",
      severity: "error",
      message:
        "County is outside the active service area. Choose a supported county.",
      suggestion:
        "Supported: Polk, Trinity, Angelina, Tyler, San Jacinto, Liberty, Walker.",
    });
  }

  // --- Price & property facts --------------------------------------------
  if (!(draft.price > 0)) {
    issues.push(req("price", "List price must be greater than $0."));
  } else if (draft.price > MAX_PRICE) {
    issues.push({
      code: "PRICE_RANGE",
      field: "price",
      severity: "warning",
      message: "List price is unusually high — double-check for a typo.",
    });
  }
  if (!PROPERTY_TYPES.includes(draft.propertyType as PropertyType)) {
    issues.push(req("propertyType", "Select a valid property type."));
  }
  if (!(draft.sqft > 0)) {
    issues.push(req("sqft", "Living area (sqft) must be greater than 0."));
  }
  if (draft.beds < 0 || !Number.isFinite(draft.beds)) {
    issues.push(req("beds", "Bedrooms must be 0 or more."));
  } else if (draft.beds === 0 && draft.propertyType !== "Farm and Ranch") {
    issues.push({
      code: "BEDS_ZERO",
      field: "beds",
      severity: "warning",
      message: "0 bedrooms is unusual for this property type — confirm.",
    });
  }
  if (draft.baths < 0 || !Number.isFinite(draft.baths)) {
    issues.push(req("baths", "Bathrooms must be 0 or more."));
  }
  const currentYear = new Date().getFullYear();
  if (draft.yearBuilt && (draft.yearBuilt < 1800 || draft.yearBuilt > currentYear + 2)) {
    issues.push({
      code: "YEAR_RANGE",
      field: "yearBuilt",
      severity: "warning",
      message: `Year built ${draft.yearBuilt} looks out of range.`,
    });
  }

  // --- TREC advertising: broker identification ---------------------------
  // Tex. Occ. Code / TREC Rule 535.155 require ads to include the broker's name.
  if (!draft.brokerageName.trim()) {
    issues.push({
      code: "TREC_BROKER_NAME",
      field: "brokerageName",
      severity: "error",
      message:
        "Texas advertising rules require the responsible broker's name in the listing.",
      reference: "TREC Rule 535.155",
    });
  }
  if (!draft.listingAgentLicense.trim()) {
    issues.push({
      code: "TREC_LICENSE",
      field: "listingAgentLicense",
      severity: "error",
      message: "A TREC license number is required to publish a listing.",
      reference: "TREC licensing",
    });
  } else if (!/^\d{5,8}$/.test(draft.listingAgentLicense.trim())) {
    issues.push({
      code: "TREC_LICENSE_FORMAT",
      field: "listingAgentLicense",
      severity: "warning",
      message: "TREC license numbers are typically 5–8 digits — verify.",
    });
  }

  // --- Disclosures --------------------------------------------------------
  // Federal lead-based paint rule applies to housing built before 1978.
  if (draft.yearBuilt > 0 && draft.yearBuilt < 1978 && !draft.leadPaintDisclosureProvided) {
    issues.push({
      code: "DISC_LEAD_PAINT",
      field: "leadPaintDisclosureProvided",
      severity: "error",
      message:
        "Homes built before 1978 require a federal lead-based paint disclosure.",
      suggestion: "Attach the lead-based paint disclosure before publishing.",
      reference: "42 U.S.C. §4852d · 24 CFR Part 35",
    });
  }
  // Texas Seller's Disclosure Notice for most residential resales.
  if (!draft.sellersDisclosureProvided) {
    issues.push({
      code: "DISC_TX_SELLER",
      field: "sellersDisclosureProvided",
      severity: "warning",
      message:
        "Texas generally requires a Seller's Disclosure Notice for residential resales (some exemptions apply).",
      suggestion: "Attach the Seller's Disclosure Notice unless a statutory exemption applies.",
      reference: "Tex. Prop. Code §5.008",
    });
  }

  // --- Media --------------------------------------------------------------
  const validPhotos = draft.photos.filter((p) => p.trim());
  if (validPhotos.length === 0) {
    issues.push({
      code: "MEDIA_NO_PHOTO",
      field: "photos",
      severity: "warning",
      message: "Listings with at least one photo perform far better.",
    });
  }

  // --- Fair Housing language scan ----------------------------------------
  issues.push(...scanFairHousing(draft.description, "description"));

  // --- "primary bedroom" language nudge ----------------------------------
  if (/\bmaster (bed|bath|suite)/i.test(draft.description)) {
    issues.push({
      code: "LANG_PRIMARY",
      field: "description",
      severity: "warning",
      message: 'Many MLSs now prefer "primary" over "master".',
      suggestion: 'Consider "primary bedroom/bath/suite".',
    });
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return { issues, errors, warnings, canPublish: errors.length === 0 };
}

/** Scan free text for Fair Housing violations. Exposed for targeted checks. */
export function scanFairHousing(text: string, field: string): ComplianceIssue[] {
  if (!text.trim()) return [];
  const found: ComplianceIssue[] = [];
  for (const rule of FAIR_HOUSING_RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      found.push({
        code: rule.code,
        field,
        severity: rule.severity,
        message: `Fair Housing (${rule.protectedClass}): “${match[0]}” — ${rule.message}`,
        suggestion: rule.suggestion,
        reference: "Fair Housing Act · 42 U.S.C. §3604",
      });
    }
  }
  return found;
}

function req(field: string, message: string): ComplianceIssue {
  return { code: `REQ_${field.toUpperCase()}`, field, severity: "error", message };
}
