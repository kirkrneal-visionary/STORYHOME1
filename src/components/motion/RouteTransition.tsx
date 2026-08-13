"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useMotionOptional } from "@/components/motion/MotionProvider";
import { continuumProfile, temperatureForPath } from "@/lib/motion/continuum";
import {
  excludeSpatialTransition,
  normalizePath,
} from "@/lib/motion/routes";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/tokens";

/**
 * Story Continuum content enter — temperature-aware, soft settle.
 * Enter-only (App Router swaps children immediately).
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const motionCtx = useMotionOptional();
  const prefersReduced = useReducedMotion();
  const reduced = Boolean(prefersReduced || motionCtx?.reducedMotion);

  const direction = motionCtx?.direction ?? "forward";
  const temperature = motionCtx?.temperature ?? temperatureForPath(pathname);
  const profile = continuumProfile(temperature);

  const durationKey = profile.durationKey;
  const duration = reduced
    ? MOTION_DURATION.micro
    : MOTION_DURATION[durationKey];

  const easeKey = profile.easeKey;
  const ease = MOTION_EASE[easeKey];
  const easeTuple = Array.isArray(ease) ? ease : MOTION_EASE.enterContinuum;

  const distance = motionCtx?.distancePx ?? 24;

  const skipSpatial =
    reduced ||
    excludeSpatialTransition(pathname) ||
    direction === "none" ||
    temperature === "still" ||
    profile.distanceScale === 0;

  const isLateral = direction === "lateral";

  // Lateral = soft dissolve (belonging across networks), not a shove.
  const xEnter =
    skipSpatial || isLateral
      ? 0
      : direction === "back"
        ? -distance * 0.55
        : distance;

  const opacityFrom = reduced
    ? (motionCtx?.opacity.reducedEnter ?? 0.9)
    : isLateral
      ? (motionCtx?.opacity.lateralFrom ?? 0.88)
      : profile.opacityFrom;

  // Browse forward — soft room-step (noticeable, not zoom theater)
  const scaleFrom =
    reduced || skipSpatial || isLateral || temperature !== "browse"
      ? 1
      : direction === "forward"
        ? 0.985
        : 1;

  const key = normalizePath(pathname);

  return (
    <div className="story-route-surface relative min-h-0 w-full flex-1">
      {/* Continuum underlay — peeks during swipe-back */}
      <div
        className="story-continuum-peek pointer-events-none absolute inset-0 z-0"
        aria-hidden
      />
      <motion.div
        key={key}
        initial={{
          opacity: opacityFrom,
          x: xEnter,
          scale: scaleFrom,
        }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{
          duration,
          ease: reduced ? "linear" : easeTuple,
        }}
        className="story-route-page relative z-[1] w-full will-change-transform"
        style={{ backfaceVisibility: "hidden" }}
        data-continuum-temp={temperature}
        data-nav-direction={direction}
      >
        {children}
      </motion.div>
    </div>
  );
}
