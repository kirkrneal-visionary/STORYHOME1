/**
 * Process-wide last-tap-wins navigation intent.
 */

import { createNavIntentStore, type NavIntent } from "./nav-touch";

const store = createNavIntentStore();

export type { NavIntent };

export function subscribeNavIntent(onChange: () => void): () => void {
  return store.subscribe(onChange);
}

export function getNavIntent(): NavIntent | null {
  return store.get();
}

export function beginNavIntent(href: string): NavIntent {
  return store.begin(href);
}

export function isCurrentNavIntent(intent: NavIntent | null): boolean {
  return store.isCurrent(intent);
}

export function isPendingNavHref(href: string): boolean {
  return store.isPendingHref(href);
}

export function settleNavIntent(_pathname: string): void {
  store.settle();
}

export function clearNavIntent(): void {
  store.settle();
}

/** @internal tests */
export function resetNavIntentForTests(): void {
  store.reset();
}
