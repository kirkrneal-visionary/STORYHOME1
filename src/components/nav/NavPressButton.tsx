"use client";

import { forwardRef, useCallback, useRef } from "react";
import {
  shouldCommitNavTap,
  type NavPoint,
} from "@/lib/navigation/nav-touch";
import { navTouchTrace } from "@/lib/navigation/nav-touch-trace";
import { cn } from "@/lib/utils";

type NavPressButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  traceName?: string;
};

/**
 * Menu / workspace buttons that must not fire after a scroll gesture.
 * Does not navigate on pointer-down.
 */
export const NavPressButton = forwardRef<HTMLButtonElement, NavPressButtonProps>(
  function NavPressButton(
    {
      className,
      onClick,
      onPointerDown,
      traceName = "button",
      type = "button",
      ...rest
    },
    ref,
  ) {
  const startRef = useRef<NavPoint | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      startRef.current = { x: e.clientX, y: e.clientY };
      navTouchTrace("input", { href: traceName });
      onPointerDown?.(e);
    },
    [onPointerDown, traceName],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const from = startRef.current;
      const to = { x: e.clientX, y: e.clientY };
      const committed = shouldCommitNavTap(from, to);
      startRef.current = null;
      navTouchTrace("handler", { href: traceName, committed });
      if (!committed) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClick?.(e);
    },
    [onClick, traceName],
  );

  return (
    <button
      ref={ref}
      type={type}
      data-nav-hit
      className={cn("story-nav-hit story-press", className)}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      {...rest}
    />
  );
  },
);
