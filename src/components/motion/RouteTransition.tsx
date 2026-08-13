"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useMotionOptional } from "@/components/motion/MotionProvider";
import {
  excludeSpatialTransition,
  isArchieRoute,
  normalizePath,
} from "@/lib/motion/routes";

/**
 * Content-surface enter transition.
 *
 * App Router replaces `children` immediately on navigation, so exit animations
 * are unreliable and can leave overlays. We animate ENTER only — still reads as
 * spatial forward/back — and keep GlobalNav/Footer outside this wrapper.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const motionCtx = useMotionOptional();
  const prefersReduced = useReducedMotion();
  const reduced = Boolean(prefersReduced || motionCtx?.reducedMotion);

  const direction = motionCtx?.direction ?? "forward";
  const distance = motionCtx?.distancePx ?? 18;
  const duration = reduced
    ? (motionCtx?.duration.micro ?? 0.12)
    : isArchieRoute(pathname)
      ? (motionCtx?.duration.fast ?? 0.18)
      : (motionCtx?.duration.standard ?? 0.28);
  const ease = motionCtx?.ease.enter ?? [0.16, 1, 0.3, 1];

  const skipSpatial =
    reduced ||
    excludeSpatialTransition(pathname) ||
    direction === "none" ||
    direction === "lateral";

  const xEnter = skipSpatial
    ? 0
    : direction === "back"
      ? -distance * 0.65
      : distance;

  const key = normalizePath(pathname);

  return (
    <div className="story-route-surface relative min-h-0 w-full flex-1">
      <motion.div
        key={key}
        initial={{
          opacity: reduced ? (motionCtx?.opacity.reducedEnter ?? 0.9) : 0.98,
          x: xEnter,
        }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration,
          ease: reduced ? "linear" : ease,
        }}
        className="story-route-page w-full will-change-transform"
        style={{ backfaceVisibility: "hidden" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
