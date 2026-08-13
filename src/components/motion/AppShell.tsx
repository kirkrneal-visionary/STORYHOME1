"use client";

import { RouteTransition } from "@/components/motion/RouteTransition";
import { SwipeBack } from "@/components/motion/SwipeBack";
import { useMotionOptional } from "@/components/motion/MotionProvider";

/**
 * Persistent application content shell.
 * GlobalNav / Footer remain siblings outside this component (root layout).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const motion = useMotionOptional();
  return (
    <div
      className="story-app-shell relative flex min-h-0 w-full flex-1 flex-col"
      data-continuum-temp={motion?.temperature}
      data-nav-direction={motion?.direction}
    >
      <SwipeBack />
      <RouteTransition>{children}</RouteTransition>
    </div>
  );
}
