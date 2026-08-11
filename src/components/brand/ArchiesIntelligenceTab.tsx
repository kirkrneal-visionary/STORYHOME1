"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  active?: boolean;
  onClick?: () => void;
  className?: string;
  /** Compact for denser bars */
  size?: "md" | "sm";
};

/**
 * Archie's Intelligence — premium Story Pro menu unit.
 * Custom infra: one white 30px-radius pill = mark + INTELLIGENCE (single hit target).
 * Pro-gated by parent portal; this is presentation only.
 */
export function ArchiesIntelligenceTab({
  active = false,
  onClick,
  className,
  size = "md",
}: Props) {
  const sm = size === "sm";
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label="Archie's Intelligence"
      title="Archie's Intelligence"
      onClick={onClick}
      className={cn(
        "group relative inline-flex shrink-0 items-center gap-2 border transition-[box-shadow,transform,border-color] duration-200",
        "bg-white text-navy",
        "rounded-[30px]",
        sm ? "h-9 pl-1.5 pr-3" : "h-11 pl-1.5 pr-3.5",
        active
          ? "border-gold shadow-[0_0_0_1px_rgba(212,175,55,0.45),0_8px_24px_-12px_rgba(23,51,94,0.45)]"
          : "border-hairline/80 shadow-[0_6px_18px_-14px_rgba(23,51,94,0.55)] hover:-translate-y-px hover:border-navy/20 hover:shadow-[0_10px_28px_-14px_rgba(23,51,94,0.4)]",
        className,
      )}
    >
      <span
        className={cn(
          "relative overflow-hidden rounded-[22px] bg-white ring-1 ring-navy/5",
          sm ? "h-7 w-7" : "h-8 w-8",
        )}
      >
        <Image
          src="/brand/archie-intelligence.png"
          alt=""
          width={64}
          height={64}
          className="h-full w-full object-cover"
          priority
        />
      </span>
      <span
        className={cn(
          "font-sans font-extrabold tracking-[0.06em] text-navy uppercase",
          sm ? "text-[10px]" : "text-[11px] md:text-xs",
        )}
      >
        Intelligence
      </span>
      {active ? (
        <span
          aria-hidden
          className="absolute inset-x-3 -bottom-[1px] h-px bg-gradient-to-r from-transparent via-gold to-transparent"
        />
      ) : null}
    </button>
  );
}
