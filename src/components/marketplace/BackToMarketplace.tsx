"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useMotionOptional } from "@/components/motion/MotionProvider";

/**
 * Returns to Marketplace with directional back + cache restore on remount.
 * Prefers history.back when the previous entry is Marketplace.
 */
export function BackToMarketplace({
  overlay = false,
}: {
  /** When true, sits on photo plane — light text, no top padding. */
  overlay?: boolean;
} = {}) {
  const router = useRouter();
  const motion = useMotionOptional();

  return (
    <button
      type="button"
      onClick={() => {
        motion?.markBack();
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push("/marketplace");
      }}
      className={
        overlay
          ? "story-press inline-flex items-center gap-2 rounded-full border border-white/20 bg-navy/45 px-3 py-1.5 text-sm text-paper backdrop-blur-md hover:border-gold/50 hover:text-gold"
          : "story-press inline-flex items-center gap-2 pt-6 text-sm text-[var(--muted)] hover:text-ink"
      }
    >
      <ArrowLeft className="h-4 w-4" /> Back to Marketplace
    </button>
  );
}

/** Fallback link for no-JS / crawlers */
export function BackToMarketplaceLink() {
  return (
    <Link
      href="/marketplace"
      className="inline-flex items-center gap-2 pt-6 text-sm text-[var(--muted)] hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" /> Back to Marketplace
    </Link>
  );
}
