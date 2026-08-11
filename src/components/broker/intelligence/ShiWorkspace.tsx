"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PropertyIntelligenceView } from "@/components/broker/intelligence/PropertyIntelligenceView";
import { ShiStudyVaultView } from "@/components/broker/intelligence/ShiStudyVaultView";
import {
  parseArchieModule,
  writeLastArchieModule,
  type ArchieModule,
} from "@/lib/navigation/archieMemory";
import type { ShiSavedFrame } from "@/lib/shi/types";
import { SHI_PRODUCT } from "@/lib/shi/waves";

export type ShiSection = ArchieModule;

/**
 * Archie's Intelligence shell.
 * Module switching lives in the federated context ribbon (Wave N2).
 * Research = 3-split workbench · Study Vault = saved folders/frames.
 */
export function ShiWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section: ShiSection = parseArchieModule(searchParams.get("section"));

  useEffect(() => {
    writeLastArchieModule(section);
  }, [section]);

  const selectSection = useCallback(
    (next: ShiSection) => {
      writeLastArchieModule(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "research") params.delete("section");
      else {
        params.set("section", next);
        // Leaving research — drop reopen params so they don't linger.
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
          <h2 className="font-serif text-2xl font-bold text-ink">
            {section === "vault" ? "Study Vault" : "Research"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            {section === "vault"
              ? "Saved Market Frames and study folders. Reopen any frame into Research."
              : "Three-panel research: search · map · property record. Market Frames analyze below."}
          </p>
        </div>
      </header>

      <div
        key={section}
        className="motion-safe:animate-[archieModuleIn_200ms_ease-out]"
      >
        {section === "research" ? (
          <PropertyIntelligenceView
            onOpenVault={() => selectSection("vault")}
          />
        ) : (
          <ShiStudyVaultView onOpenInResearch={openFrameInResearch} />
        )}
      </div>
    </div>
  );
}
