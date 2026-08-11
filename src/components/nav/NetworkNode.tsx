"use client";

import Image from "next/image";
import Link from "next/link";
import { ARCHIE_MARK_SRC } from "@/lib/navigation/networks";
import { cn } from "@/lib/utils";

type NetworkNodeProps = {
  href: string;
  label: string;
  active: boolean;
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
  className,
}: NetworkNodeProps) {
  return (
    <Link
      href={href}
      aria-label="Archie's Intelligence"
      title="Archie's Intelligence"
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative inline-flex h-10 shrink-0 items-center gap-2 rounded-[26px] border pl-1 pr-3 transition-[border-color,box-shadow,background-color,transform] duration-200",
        active
          ? "border-gold bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] shadow-[inset_0_-2px_0_0_var(--gold)]"
          : "border-[color-mix(in_srgb,var(--brand-word)_28%,transparent)] bg-transparent hover:border-[color-mix(in_srgb,var(--gold)_55%,transparent)] hover:bg-[color-mix(in_srgb,var(--gold)_8%,transparent)]",
        className,
      )}
    >
      <span className="relative h-8 w-8 overflow-hidden rounded-[20px] bg-white ring-1 ring-black/10">
        <Image
          src={ARCHIE_MARK_SRC}
          alt=""
          width={64}
          height={64}
          className="h-full w-full object-cover"
          priority
        />
      </span>
      <span
        className={cn(
          "hidden font-sans text-[11px] font-extrabold tracking-[0.07em] uppercase sm:inline",
          active ? "text-gold" : "text-[var(--brand-word)] group-hover:text-gold",
        )}
      >
        {label}
      </span>
      {active ? (
        <span
          aria-hidden
          className="absolute inset-x-4 -bottom-px h-px bg-gradient-to-r from-transparent via-gold to-transparent"
        />
      ) : null}
    </Link>
  );
}
