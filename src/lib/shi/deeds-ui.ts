/**
 * DEEDS UI offer — Founder Interpreter (build process only, not a product).
 *
 * Intent: do not show empty Deeds topics to users while we own no clerk index.
 * UX: Ask chip, evidence panel, and source-strip row stay out of the product.
 * Data: backend registry / API may still exist for ops; user reveal stays closed.
 * Acceptance: DEEDS_USER_UI_OFFERED false → no Deeds surface in user UI.
 *
 * Flip to true only when a launch-7 county is ready + peer-grade with real rows.
 */
export const DEEDS_USER_UI_OFFERED = false as const;
