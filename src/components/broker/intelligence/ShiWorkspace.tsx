"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderKanban, Map } from "lucide-react";
import { ShiIcon } from "@/components/brand/ShiIcon";
import { PropertyIntelligenceView } from "@/components/broker/intelligence/PropertyIntelligenceView";
import { ShiStudyVaultView } from "@/components/broker/intelligence/ShiStudyVaultView";
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
 * Story Home Intelligence shell — Community-style submenu.
 * Research = cockpit · Study Vault = saved folders/frames (not crammed under the map).
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
      else params.set("section", next);
      const q = params.toString();
      const base = pathname?.includes("/intelligence")
        ? "/portal/intelligence"
        : "/portal/intelligence";
      router.replace(q ? `${base}?${q}` : base, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-gold">
          <ShiIcon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-[var(--muted)] uppercase">
            {SHI_PRODUCT.shortName} · {SHI_PRODUCT.subtitle}
          </p>
          <h2 className="font-serif text-2xl font-bold text-ink">
            {SHI_PRODUCT.fullName}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Research cockpit on the left rail · living map on the right · saved
            studies live in Study Vault — not crammed under the map.
          </p>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Story Home Intelligence sections"
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
              onClick={() => selectSection(id)}
              className={cn(
                "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "border-gold text-navy"
                  : "border-transparent text-[var(--muted)] hover:text-ink",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-gold")} />
              {label}
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
          <ShiStudyVaultView
            onOpenInResearch={() => selectSection("research")}
          />
        )}
      </div>
    </div>
  );
}
