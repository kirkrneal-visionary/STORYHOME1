"use client";

import { useCallback } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderKanban, Map } from "lucide-react";
import { PropertyIntelligenceView } from "@/components/broker/intelligence/PropertyIntelligenceView";
import { ShiStudyVaultView } from "@/components/broker/intelligence/ShiStudyVaultView";
import type { ShiSavedFrame } from "@/lib/shi/types";
import { SHI_PRODUCT } from "@/lib/shi/waves";
import { cn } from "@/lib/utils";

export type ShiSection = "research" | "vault";

const SECTIONS: {
  id: ShiSection;
  label: string;
  icon: typeof Map;
}[] = [
  { id: "research", label: "Research", icon: Map },
  { id: "vault", label: "Study Vault", icon: FolderKanban },
];

/**
 * Archie's Intelligence shell — Community-style submenu.
 * Research = 3-split workbench · Study Vault = saved folders/frames.
 */
export function ShiWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("section");
  const section: ShiSection = raw === "vault" ? "vault" : "research";

  const selectSection = useCallback(
    (next: ShiSection) => {
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
          <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-[var(--muted)] uppercase">
            {SHI_PRODUCT.fullName} · {SHI_PRODUCT.subtitle}
          </p>
          <h2 className="font-serif text-2xl font-bold text-ink">
            {SHI_PRODUCT.fullName}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Three-panel research: search · map · property record. Market Frames
            analyze below. Saved studies live in Study Vault.
          </p>
        </div>
      </header>

      <div
        role="tablist"
        aria-label={`${SHI_PRODUCT.fullName} sections`}
        className="flex gap-2 overflow-x-auto border-b border-hairline pb-px"
      >
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={label}
              title={label}
              onClick={() => selectSection(id)}
              className={cn(
                "-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "border-gold text-navy"
                  : "border-transparent text-[var(--muted)] hover:text-ink",
              )}
            >
              <Icon
                className={cn("h-4 w-4 shrink-0", active && "text-gold")}
                aria-hidden
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div>
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
