"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PropertyIntelligenceView } from "@/components/broker/intelligence/PropertyIntelligenceView";
import { ShiFarmsView } from "@/components/broker/intelligence/ShiFarmsView";
import { ShiProspectsView } from "@/components/broker/intelligence/ShiProspectsView";
import { ShiResearchModeSelector } from "@/components/broker/intelligence/ShiResearchModeSelector";
import { ShiStudyVaultView } from "@/components/broker/intelligence/ShiStudyVaultView";
import {
  parseArchieModule,
  writeLastArchieModule,
  type ArchieModule,
} from "@/lib/navigation/archieMemory";
import { track, type ArchieModuleProp } from "@/lib/analytics";
import type { ShiSavedFrame } from "@/lib/shi/types";
import {
  parseResearchMode,
  RESEARCH_MODE_STORAGE_KEY,
  type ResearchModeId,
} from "@/lib/shi/research-modes";
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
      "Choose a research mode, then search · map · property · Access desk. Same facts — a different professional lens.",
  },
  corridors: {
    title: "Access",
    blurb:
      "Redirects into Research Access desk. Same facts — one room.",
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
    track("archie_opened", { network: "archie" });
  }, []);

  useEffect(() => {
    writeLastArchieModule(section);
    if (section === "research") setResearchVisited(true);
    const moduleProp: ArchieModuleProp = section;
    track("archie_module_selected", { module: moduleProp });
  }, [section]);

  /* R2 — soft-hide Access tab: old Corridors deep links land in Research Access desk */
  useEffect(() => {
    if (section !== "corridors") return;
    setResearchVisited(true);
    writeLastArchieModule("research");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("section");
    params.set("mode", "access");
    const q = params.toString();
    router.replace(q ? `/portal/intelligence?${q}` : "/portal/intelligence?mode=access", {
      scroll: false,
    });
  }, [section, router, searchParams]);

  const urlMode = parseResearchMode(searchParams.get("researchMode"));
  const deepLink =
    Boolean(searchParams.get("propId")) ||
    Boolean(searchParams.get("openFrame")) ||
    searchParams.get("mode") === "access";
  const [pickingMode, setPickingMode] = useState(() => !urlMode && !deepLink);

  const setResearchMode = useCallback(
    (id: ResearchModeId, opts?: { pick?: boolean }) => {
      try {
        window.sessionStorage.setItem(RESEARCH_MODE_STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
      const params = new URLSearchParams(searchParams.toString());
      params.delete("section");
      params.set("researchMode", id);
      const q = params.toString();
      router.replace(q ? `/portal/intelligence?${q}` : "/portal/intelligence", {
        scroll: false,
      });
      if (opts?.pick !== false) setPickingMode(false);
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (urlMode) setPickingMode(false);
  }, [urlMode]);

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
      track("archie_study_reopened", { has_folder: Boolean(frame.folderId) });
      writeLastArchieModule("research");
      const params = new URLSearchParams();
      params.set("openFrame", frame.id);
      if (frame.folderId) params.set("folderId", frame.folderId);
      const savedMode = parseResearchMode(
        (frame.snapshot?.metrics as { researchMode?: string } | undefined)
          ?.researchMode,
      );
      params.set("researchMode", savedMode ?? "general");
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
        <div className="story-surface flex h-12 w-12 items-center justify-center overflow-hidden rounded-[18px]">
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
              section === "research" || section === "corridors"
                ? "motion-safe:animate-[archieModuleIn_180ms_ease-out]"
                : "hidden",
            )}
            aria-hidden={section !== "research" && section !== "corridors"}
          >
            {pickingMode ? (
              <ShiResearchModeSelector
                onSelect={(id) => setResearchMode(id)}
              />
            ) : null}
            <div className={cn(pickingMode && "hidden")}>
              <PropertyIntelligenceView
                researchMode={urlMode ?? "general"}
                onChangeResearchMode={() => setPickingMode(true)}
                onRestoreResearchMode={(id) => setResearchMode(id)}
                onOpenVault={() => selectSection("vault")}
                onOpenFarms={() => selectSection("farms")}
              />
            </div>
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
