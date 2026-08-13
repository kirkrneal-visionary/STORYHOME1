"use client";

import Image from "next/image";
import Link from "next/link";
import { useMotionOptional } from "@/components/motion/MotionProvider";
import { ARCHIE_MARK_SRC } from "@/lib/navigation/networks";
import { cn } from "@/lib/utils";

type NetworkNodeProps = {
  href: string;
  label: string;
  active: boolean;
  /** icon = mobile mark-only control */
  size?: "md" | "icon";
  className?: string;
};

/**
 * Federated network node — distinct from host text links.
 * Inactive: navy/transparent, thin border, light label, restrained gold.
 * Active (in Archie): gold border + rail cue.
 */
export function NetworkNode({
  href,
  label,
  active,
  size = "md",
  className,
}: NetworkNodeProps) {
  const motion = useMotionOptional();
  const iconOnly = size === "icon";
  return (
    <Link
      href={href}
      onClick={() => motion?.markNavigate(href)}
      aria-label="Archie's Intelligence"
      title="Archie's Intelligence"
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative inline-flex shrink-0 items-center border transition-[border-color,box-shadow,background-color,transform] duration-200",
        iconOnly
          ? "h-10 w-10 justify-center rounded-full p-0.5"
          : "h-10 gap-2 rounded-[26px] pl-1 pr-3",
        active
          ? "border-gold bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] shadow-[inset_0_-2px_0_0_var(--gold)]"
          : "border-[color-mix(in_srgb,var(--brand-word)_28%,transparent)] bg-transparent hover:border-[color-mix(in_srgb,var(--gold)_55%,transparent)] hover:bg-[color-mix(in_srgb,var(--gold)_8%,transparent)]",
        className,
      )}
    >
      <span
        className={cn(
          "relative overflow-hidden bg-white ring-1 ring-black/10",
          iconOnly ? "h-8 w-8 rounded-full" : "h-8 w-8 rounded-[20px]",
        )}
      >
        <Image
          src={ARCHIE_MARK_SRC}
          alt=""
          width={64}
          height={64}
          className="h-full w-full object-cover"
          priority
        />
      </span>
      {iconOnly ? null : (
        <span
          className={cn(
            "font-sans text-[11px] font-extrabold tracking-[0.07em] uppercase",
            active
              ? "text-gold"
              : "text-[var(--brand-word)] group-hover:text-gold",
          )}
        >
          {label}
        </span>
      )}
      {active && !iconOnly ? (
        <span
          aria-hidden
          className="absolute inset-x-4 -bottom-px h-px bg-gradient-to-r from-transparent via-gold to-transparent"
        />
      ) : null}
    </Link>
  );
}
