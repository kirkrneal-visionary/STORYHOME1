/**
 * Story Home typography tokens — keep in sync with src/app/globals.css.
 * Ordinary UI uses the platform interface stack. Do not reintroduce
 * webfonts for application text.
 */

export const UI_FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const CODE_FONT_STACK =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

/** Map glyph atlas — not a CSS font. Do not substitute UI stack names. */
export const MAP_GLYPH_FONTS = {
  regular: "Noto Sans Regular",
  bold: "Noto Sans Bold",
} as const;

export const TYPE_ROLES = {
  heroMobile: { fontSizePx: 32, lineHeightPx: 38, weight: 600 },
  heroDesktop: { fontSizePx: 40, lineHeightPx: 46, weight: 600 },
  pageTitleMobile: { fontSizePx: 22, lineHeightPx: 28, weight: 600 },
  pageTitleDesktop: { fontSizePx: 24, lineHeightPx: 30, weight: 600 },
  section: { fontSizePx: 18, lineHeightPx: 24, weight: 600 },
  cardTitle: { fontSizePx: 16, lineHeightPx: 22, weight: 600 },
  ui: { fontSizePx: 15, lineHeightPx: 22, weight: 400 },
  prose: { fontSizePx: 16, lineHeightPx: 24, weight: 400 },
  meta: { fontSizePx: 13, lineHeightPx: 18, weight: 400 },
  control: { fontSizePx: 14, lineHeightPx: 20, weight: 500 },
  inputMobile: { fontSizePx: 16, lineHeightPx: 24, weight: 400 },
  caption: { fontSizePx: 12, lineHeightPx: 16, weight: 500 },
} as const;

export const EVIDENCE_LABELS = [
  "KNOWN",
  "CALCULATED",
  "ESTIMATED",
  "OBSERVED",
  "VERIFY",
  "UNKNOWN",
] as const;

export const SPACE = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  pageGutter: 16,
  cardPad: 14,
  related: 10,
  section: 20,
  controlMin: 44,
} as const;
