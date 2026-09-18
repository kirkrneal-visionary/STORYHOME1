/**
 * Canonical Exact-number presentation.
 * SearchState stores a clean number string. Commas and $ are display only.
 */

export type ExactKind = "price" | "acres" | "sqft";

const INT_CAP = 12;
const ACRE_FRAC_CAP = 4;

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function groupInt(intPart: string): string {
  const raw = intPart.replace(/^0+(?=\d)/, "") || "0";
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function stripToBody(raw: string, allowDecimal: boolean): string {
  let body = "";
  let sawDecimal = false;
  for (const ch of raw) {
    if (isDigit(ch)) body += ch;
    else if (allowDecimal && ch === "." && !sawDecimal) {
      body += ".";
      sawDecimal = true;
    }
  }
  return body;
}

function splitBody(body: string): { intPart: string; frac: string | null; trailingDot: boolean } {
  if (!body || body === ".") return { intPart: "", frac: null, trailingDot: body === "." };
  const trailingDot = body.endsWith(".");
  const [intRaw = "", fracRaw] = body.split(".");
  const intPart = intRaw.replace(/^0+(?=\d)/, "").slice(0, INT_CAP);
  if (fracRaw == null) return { intPart, frac: null, trailingDot: false };
  return {
    intPart: intPart || "0",
    frac: fracRaw.slice(0, ACRE_FRAC_CAP),
    trailingDot,
  };
}

function canonicalFromParts(
  intPart: string,
  frac: string | null,
  trailingDot: boolean,
): string {
  if (!intPart && (frac == null || trailingDot)) return "";
  const whole = intPart || "0";
  if (frac == null || trailingDot) return whole;
  const trimmed = frac.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

function displayFromParts(
  kind: ExactKind,
  intPart: string,
  frac: string | null,
  trailingDot: boolean,
): string {
  if (!intPart && !trailingDot && frac == null) return kind === "price" ? "" : "";
  if (!intPart && trailingDot) return kind === "price" ? "$" : ".";
  const grouped = groupInt(intPart || "0");
  if (kind === "price") return `$${grouped}`;
  if (kind === "sqft" || frac == null) return trailingDot ? `${grouped}.` : grouped;
  return `${grouped}.${frac}`;
}

export function formatExactDisplay(canonical: string, kind: ExactKind): string {
  if (!canonical) return "";
  const allowDecimal = kind === "acres";
  const body = stripToBody(canonical, allowDecimal);
  const parts = splitBody(body);
  return displayFromParts(kind, parts.intPart, parts.frac, false);
}

export function interpretExactTyping(
  raw: string,
  kind: ExactKind,
): { display: string; canonical: string } {
  const allowDecimal = kind === "acres";
  const body = stripToBody(raw, allowDecimal);
  const parts = splitBody(body);
  return {
    display: displayFromParts(kind, parts.intPart, parts.frac, parts.trailingDot),
    canonical: canonicalFromParts(parts.intPart, parts.frac, parts.trailingDot),
  };
}

export function finalizeExact(canonical: string, kind: ExactKind): string {
  return interpretExactTyping(canonical, kind).canonical;
}

export function countNumericPrefix(
  text: string,
  caret: number,
  allowDecimal: boolean,
): number {
  let n = 0;
  let dec = false;
  const end = Math.max(0, Math.min(caret, text.length));
  for (let i = 0; i < end; i++) {
    const ch = text[i];
    if (isDigit(ch)) n += 1;
    else if (allowDecimal && ch === "." && !dec) {
      n += 1;
      dec = true;
    }
  }
  return n;
}

export function caretFromNumericCount(
  formatted: string,
  count: number,
  allowDecimal: boolean,
): number {
  if (count <= 0) {
    if (formatted.startsWith("$")) return 1;
    return 0;
  }
  let n = 0;
  let dec = false;
  for (let i = 0; i < formatted.length; i++) {
    const ch = formatted[i];
    if (isDigit(ch)) n += 1;
    else if (allowDecimal && ch === "." && !dec) {
      n += 1;
      dec = true;
    } else continue;
    if (n >= count) return i + 1;
  }
  return formatted.length;
}

export function exactKindFromTitle(title: string): ExactKind {
  if (title === "Price") return "price";
  if (title === "Acres") return "acres";
  return "sqft";
}

export function exactInputMode(kind: ExactKind): "numeric" | "decimal" {
  return kind === "acres" ? "decimal" : "numeric";
}
