"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PropertyIntelligenceView } from "@/components/broker/intelligence/PropertyIntelligenceView";
import { ShiCorridorsView } from "@/components/broker/intelligence/ShiCorridorsView";
import { ShiFarmsView } from "@/components/broker/intelligence/ShiFarmsView";
import { ShiProspectsView } from "@/components/broker/intelligence/ShiProspectsView";
import { ShiStudyVaultView } from "@/components/broker/intelligence/ShiStudyVaultView";
import {
  parseArchieModule,
  writeLastArchieModule,
  type ArchieModule,
} from "@/lib/navigation/archieMemory";
import type { ShiSavedFrame } from "@/lib/shi/types";
import { SHI_PRODUCT } from "@/lib/shi/waves";
import { cn } from "@/lib/utils";

export type ShiSection = ArchieModule;

const MODULE_COPY: Record<
  ArchieModule,
  { title: string; blurb: string }
> = {
  research: {
    title: "Research",
    blurb:
      "Search · map · property record. Define a market area, analyze parcels, and save Map Memory or Farms.",
  },
  corridors: {
    title: "Corridors",
    blurb:
      "Access · traffic · growth. Custom Traffic tool on TxDOT AADT for your launch counties — planning counts, not live congestion.",
  },
  prospects: {
    title: "Prospects",
    blurb:
      "Your property opportunity pipeline. Tap real counts to filter, open Research or Farms, and keep tags and notes private.",
  },
  farms: {
    title: "Farms",
    blurb:
      "Know your territory. Return to a saved market area and review county-record changes since your last visit.",
  },
  vault: {
    title: "Study Vault",
    blurb:
      "Saved Market Frames and study folders. Reopen any frame into Research.",
  },
};

/**
 * Archie's Intelligence shell.
 * Modules: Research · Corridors · Prospects · Farms · Study Vault.
 */
export function ShiWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section: ShiSection = parseArchieModule(searchParams.get("section"));
  /** Keep Research (and its MapLibre map) mounted after first visit. */
  const [researchVisited, setResearchVisited] = useState(
    () => section === "research",
  );

  useEffect(() => {
    writeLastArchieModule(section);
    if (section === "research") setResearchVisited(true);
  }, [section]);

  const selectSection = useCallback(
    (next: ShiSection) => {
      writeLastArchieModule(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "research") params.delete("section");
      else {
        params.set("section", next);
        params.delete("openFrame");
        params.delete("folderId");
      }
      const q = params.toString();
      const base = pathname?.includes("/intelligence")
        ? "/portal/intelligence"
        : "/portal/intelligence";
      router.replace(q ? `${base}?${q}` : base, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openFrameInResearch = useCallback(
    (frame: ShiSavedFrame) => {
      writeLastArchieModule("research");
      const params = new URLSearchParams();
      params.set("openFrame", frame.id);
      if (frame.folderId) params.set("folderId", frame.folderId);
      const base = pathname?.includes("/intelligence")
        ? "/portal/intelligence"
        : "/portal/intelligence";
      router.replace(`${base}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  const copy = MODULE_COPY[section];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[18px] bg-white ring-1 ring-hairline shadow-sm">
          <Image
            src={SHI_PRODUCT.markSrc}
            alt=""
            width={48}
            height={48}
            className="h-full w-full object-cover"
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-gold uppercase">
            {SHI_PRODUCT.fullName}
          </p>
          <h2 className="font-serif text-2xl font-bold text-ink">{copy.title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            {copy.blurb}
          </p>
        </div>
      </header>

      <div className="relative">
        {researchVisited ? (
          <div
            className={cn(
              section === "research"
                ? "motion-safe:animate-[archieModuleIn_180ms_ease-out]"
                : "hidden",
            )}
            aria-hidden={section !== "research"}
          >
            <PropertyIntelligenceView
              onOpenVault={() => selectSection("vault")}
              onOpenFarms={() => selectSection("farms")}
            />
          </div>
        ) : null}

        {section === "corridors" ? (
          <div className="motion-safe:animate-[archieModuleIn_180ms_ease-out]">
            <ShiCorridorsView
              onOpenResearch={() => selectSection("research")}
            />
          </div>
        ) : null}

        {section === "prospects" ? (
          <div className="motion-safe:animate-[archieModuleIn_180ms_ease-out]">
            <ShiProspectsView
              onOpenFarms={() => selectSection("farms")}
              onOpenResearch={() => selectSection("research")}
            />
          </div>
        ) : null}

        {section === "farms" ? (
          <div className="motion-safe:animate-[archieModuleIn_180ms_ease-out]">
            <ShiFarmsView />
          </div>
        ) : null}

        {section === "vault" ? (
          <div className="motion-safe:animate-[archieModuleIn_180ms_ease-out]">
            <ShiStudyVaultView onOpenInResearch={openFrameInResearch} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
