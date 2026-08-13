/**
 * Mark forms with meaningful unsaved edits so swipe-back / route motion
 * does not discard work. Pair with data-unsaved="true" on a form root.
 */

export function setUnsavedFlag(el: HTMLElement | null, unsaved: boolean) {
  if (!el) return;
  if (unsaved) el.setAttribute("data-unsaved", "true");
  else el.removeAttribute("data-unsaved");
}

export function hasUnsavedWork(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector("[data-unsaved='true']"));
}
