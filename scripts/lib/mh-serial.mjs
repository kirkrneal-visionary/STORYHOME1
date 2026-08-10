/**
 * Parse mobile-home serial / HUD label numbers out of Texas CAD legal
 * descriptions and attribute bags. Covers Polk, Angelina, Liberty, Trinity,
 * and other BIS CAD legal formats verified against live FeatureServers.
 */

const SERIAL_PATTERNS = [
  /MH\s*SERIAL\s*#?\s*([A-Z0-9][A-Z0-9\-]{5,})/i,
  /SERIAL\s*#?\s*([A-Z0-9][A-Z0-9\-]{5,})/i,
  /\bSN\s*1?\s*[:#]?\s*([A-Z0-9][A-Z0-9\-]{5,})/i,
  /\bSERIAL\s+(\d+)\s+([A-Z0-9][A-Z0-9\-]{5,})/i, // "SERIAL 1 CAV150…"
];

const HUD_PATTERNS = [
  /MH\s*LABEL\s*#?\s*([A-Z0-9][A-Z0-9\-]{4,})/i,
  /(?:HUD|LABEL)\s*#?\s*([A-Z0-9][A-Z0-9\-]{4,})/i,
  /\bLABEL\s+(\d+)\s+([A-Z0-9][A-Z0-9\-]{4,})/i,
];

/** True when the legal text clearly describes a manufactured / mobile home. */
export function looksLikeMobileHome(text) {
  if (!text) return false;
  const t = String(text).toUpperCase();
  return (
    t.includes("SERIAL") ||
    t.includes("HUD") ||
    /\bMH\b/.test(t) ||
    t.includes("MH LABEL") ||
    t.includes("MH ONLY") ||
    t.includes("MOBILE HOME") ||
    t.includes("MANUFACTURED")
  );
}

function cleanId(raw) {
  if (!raw) return null;
  const s = String(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, "");
  // Reject bare years / too-short tokens ("2018", "RP").
  if (!s || s.length < 6) return null;
  if (/^\d{4}$/.test(s)) return null;
  return s;
}

/**
 * Extract the primary MH serial + HUD label from free text (legal desc).
 * Returns { serial, hud } with nulls when not found.
 * When only a HUD/LABEL is present (common in Liberty/Trinity), serial is
 * filled from that label so MLS still receives a searchable identifier.
 */
export function parseMhFromText(text) {
  if (!text) return { serial: null, hud: null };
  const t = String(text);
  let serial = null;
  let hud = null;

  for (const re of SERIAL_PATTERNS) {
    const m = t.match(re);
    if (!m) continue;
    serial = cleanId(m[2] || m[1]);
    if (serial) break;
  }

  for (const re of HUD_PATTERNS) {
    const m = t.match(re);
    if (!m) continue;
    hud = cleanId(m[2] || m[1]);
    if (hud) break;
  }

  // Liberty/Trinity often only publish MH LABEL — promote to serial for MLS.
  if (!serial && hud) serial = hud;

  return { serial, hud };
}

/**
 * Prefer explicit attribute fields, then fall back to legal-description parse.
 * `attrs` is a flat object of source attributes; `legal` is the joined legal.
 */
export function extractMhFields(attrs = {}, legal = null) {
  const pick = (...keys) => {
    for (const k of keys) {
      const v = attrs[k];
      if (v != null && String(v).trim()) return String(v).trim();
    }
    return null;
  };

  let serial = cleanId(
    pick(
      "mh_serial",
      "mh_serial_number",
      "serial_number",
      "serial_num",
      "serial",
      "sn1",
      "SN1",
    ),
  );
  let hud = cleanId(
    pick("mh_hud_label", "hud_label", "hud_num", "label_num", "label", "HUD"),
  );

  const fromLegal = parseMhFromText(legal);
  if (!serial) serial = fromLegal.serial;
  if (!hud) hud = fromLegal.hud;
  if (!serial && hud) serial = hud;

  const yearRaw = pick("mh_year", "year_built", "YEAR_BUILT");
  const year = yearRaw && /^\d{4}$/.test(String(yearRaw)) ? Number(yearRaw) : null;

  return {
    mh_serial_number: serial,
    mh_hud_label: hud,
    mh_make: pick("mh_make", "make", "mfr", "manufacturer"),
    mh_model: pick("mh_model", "model"),
    mh_year: year,
  };
}

/**
 * Map a CAD property-type code / prefix to our category.
 * Texas CAD conventions: R=Real, P=Personal, M=Mineral, A=Auto, B=Business, etc.
 * Returns 'real' | 'personal' | 'exclude' | null (unknown).
 */
export function categorizeProperty(codeOrPrefix) {
  if (codeOrPrefix == null || codeOrPrefix === "") return null;
  const s = String(codeOrPrefix).trim().toUpperCase();
  const letter = /^[A-Z]/.test(s) ? s[0] : s;
  if (letter === "R" || s === "REAL" || s.startsWith("REAL")) return "real";
  if (
    letter === "P" ||
    s === "PERSONAL" ||
    s.startsWith("PERSONAL") ||
    s.includes("MOBILE") ||
    s === "MH" ||
    s.startsWith("MH")
  ) {
    return "personal";
  }
  if (
    letter === "M" ||
    letter === "A" ||
    letter === "B" ||
    s.includes("MINERAL") ||
    s.includes("AUTO") ||
    s.includes("VEHICLE") ||
    s.includes("INDUSTRIAL")
  ) {
    return "exclude";
  }
  return null;
}
