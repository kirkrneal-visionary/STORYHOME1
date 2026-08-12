"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  isArchieModuleActive,
  NAVIGATION_NETWORKS,
} from "@/lib/navigation/networks";
import {
  writeLastArchieModule,
  type ArchieModule,
} from "@/lib/navigation/archieMemory";
import { cn } from "@/lib/utils";

/**
 * Thin Archie context ribbon under the federated top bar.
 * ARCHIE'S INTELLIGENCE · Research · Study Vault — gold active states.
 */
export function NetworkContextRibbon() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  const archie = NAVIGATION_NETWORKS.archie;

  function onModuleClick(module: ArchieModule) {
    writeLastArchieModule(module);
  }

  return (
    <div
      role="navigation"
      aria-label={`${archie.label} modules`}
      className="fixed top-[72px] left-0 z-40 flex h-10 w-full items-center border-b border-[color-mix(in_srgb,var(--gold)_28%,var(--hairline))] bg-[color-mix(in_srgb,var(--navy-deep)_92%,black)]/95 px-3 backdrop-blur-md motion-safe:animate-[archieRibbonIn_220ms_ease-out] md:px-6"
    >
      <div className="mx-auto flex w-full max-w-[90rem] items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:gap-3 [&::-webkit-scrollbar]:hidden">
        <span className="shrink-0 font-mono text-[9px] font-bold tracking-[0.14em] text-gold uppercase sm:text-[10px] sm:tracking-[0.16em]">
          Archie&apos;s Intelligence
        </span>
        <span
          aria-hidden
          className="hidden h-3.5 w-px shrink-0 bg-[color-mix(in_srgb,var(--gold)_35%,transparent)] sm:block"
        />
        <div className="flex items-center gap-0.5 sm:gap-1">
          {archie.modules.map((mod) => {
            const id = (mod.id ?? "research") as ArchieModule;
            const active = isArchieModuleActive(id, section);
            return (
              <Link
                key={id}
                href={mod.href}
                onClick={() => onModuleClick(id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-8 shrink-0 items-center rounded-md px-3 text-xs font-semibold tracking-wide transition-[color,background-color,transform] duration-200",
                  active
                    ? "bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] text-gold"
                    : "text-[var(--brand-word)]/75 hover:bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] hover:text-gold",
                )}
              >
                {mod.label}
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold motion-safe:animate-[archieGoldRail_240ms_ease-out]"
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
