"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useMotionOptional } from "@/components/motion/MotionProvider";
import {
  beginNavIntent,
  getNavIntent,
  settleNavIntent,
  subscribeNavIntent,
} from "@/lib/navigation/nav-intent";
import {
  navHrefKey,
  navUiState,
  shouldCommitNavTap,
  type NavPoint,
} from "@/lib/navigation/nav-touch";
import { navTouchTrace } from "@/lib/navigation/nav-touch-trace";
import { cn } from "@/lib/utils";

function NavPendingCue() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      data-nav-pending-cue
      className="absolute inset-1 rounded-full bg-[color-mix(in_srgb,var(--navy)_28%,transparent)]"
    />
  );
}

function useNavIntentSnapshot() {
  return useSyncExternalStore(subscribeNavIntent, getNavIntent, () => null);
}

type PrimaryNavLinkProps = {
  href: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
  onNavigate?: () => void;
  "aria-label"?: string;
  title?: string;
};

/**
 * Shared destination control. Semantic link. 44×44 hit area via CSS.
 * Does not navigate on pointer-down. Scroll/drag across the control is ignored.
 */
export function PrimaryNavLink({
  href,
  active,
  children,
  className,
  onNavigate,
  "aria-label": ariaLabel,
  title,
}: PrimaryNavLinkProps) {
  const motion = useMotionOptional();
  const intent = useNavIntentSnapshot();
  const startRef = useRef<NavPoint | null>(null);
  const [pressed, setPressed] = useState(false);

  const pending = !active && intent?.key === navHrefKey(href);
  const state = navUiState({ active, pending, pressed });

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLAnchorElement>) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    setPressed(true);
    navTouchTrace("input", { href });
  }, [href]);

  const onPointerUp = useCallback(() => {
    setPressed(false);
  }, []);

  const onPointerCancel = useCallback(() => {
    setPressed(false);
    startRef.current = null;
  }, []);

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const from = startRef.current;
      const to = { x: e.clientX, y: e.clientY };
      const committed = shouldCommitNavTap(from, to);
      startRef.current = null;
      setPressed(false);
      navTouchTrace("handler", { href, committed });
      if (!committed) {
        e.preventDefault();
        return;
      }
      beginNavIntent(href);
      motion?.markNavigate(href);
      navTouchTrace("nav-start", { href, committed: true });
      onNavigate?.();
    },
    [href, motion, onNavigate],
  );

  return (
    <Link
      href={href}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={ariaLabel}
      title={title}
      data-nav-hit
      data-nav-state={state}
      className={cn("story-nav-hit story-press", className)}
    >
      <NavPendingCue />
      {children}
    </Link>
  );
}

/** Clears pending once the URL actually changes. Mount once in shared chrome. */
export function NavIntentSettler() {
  const pathname = usePathname();
  useEffect(() => {
    settleNavIntent(pathname);
    navTouchTrace("path-ready", { href: pathname });
  }, [pathname]);
  return null;
}
