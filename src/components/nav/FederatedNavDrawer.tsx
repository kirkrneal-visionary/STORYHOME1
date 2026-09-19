"use client";

import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { GhostExamplesControl } from "@/components/home/GhostExamplesControl";
import { NavPressButton } from "@/components/nav/NavPressButton";
import { PrimaryNavLink } from "@/components/nav/PrimaryNavLink";
import {
  writeLastArchieModule,
  type ArchieModule,
} from "@/lib/navigation/archieMemory";
import {
  ARCHIE_MARK_SRC,
  isArchieModuleActive,
  isArchiePath,
  NAVIGATION_NETWORKS,
} from "@/lib/navigation/networks";
import { cn } from "@/lib/utils";

export type FederatedDrawerLink = {
  href: string;
  label: string;
  active: boolean;
  unread?: boolean;
};

type FederatedNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  hostLinks: FederatedDrawerLink[];
  showArchie: boolean;
  archieEntryHref: string;
};

/**
 * Mobile federated network drawer — Story Home host links + Archie node.
 * Desktop keeps the top-bar node; this is the small-screen entry.
 */
export function FederatedNavDrawer({
  open,
  onClose,
  hostLinks,
  showArchie,
  archieEntryHref,
}: FederatedNavDrawerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const archie = NAVIGATION_NETWORKS.archie;
  const archieActive = isArchiePath(pathname);
  const section = searchParams.get("section");
  const mode = searchParams.get("mode");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] xl:hidden" role="presentation">
      <button
        type="button"
        aria-label="Close menu"
        className="story-scrim absolute inset-0 motion-safe:animate-[archieDrawerScrim_180ms_ease-out]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="story-chrome absolute top-0 right-0 flex h-full w-[min(100%,22rem)] flex-col border-l shadow-[-18px_0_40px_-24px_rgba(0,0,0,0.65)] motion-safe:animate-[archieDrawerIn_220ms_ease-out]"
      >
        <div
          className="flex items-center justify-between border-b border-hairline px-4"
          style={{ height: "var(--story-header-h)" }}
        >
          <div>
            <p
              id={titleId}
              className="font-mono text-[10px] font-bold tracking-[0.16em] text-gold uppercase"
            >
              Network menu
            </p>
            <p className="font-sans text-sm font-bold text-[var(--brand-word)]">
              Story Home
            </p>
          </div>
          <NavPressButton
            ref={closeRef}
            onClick={onClose}
            aria-label="Close network menu"
            traceName="close-menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-hairline text-ink transition-colors hover:text-gold"
          >
            <X className="h-5 w-5" />
          </NavPressButton>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
          <p className="mb-2 px-2 font-mono text-[10px] font-bold tracking-[0.14em] text-[var(--muted)] uppercase">
            Story Home
          </p>
          <nav aria-label="Story Home" className="flex flex-col gap-0.5">
            {hostLinks.map((link) => (
              <PrimaryNavLink
                key={`${link.href}-${link.label}`}
                href={link.href}
                active={link.active}
                onNavigate={onClose}
                className={cn(
                  "relative flex min-h-11 items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  link.active
                    ? "bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] text-gold"
                    : "text-[var(--brand-word)] hover:bg-white/5 hover:text-ink",
                )}
              >
                <span>{link.label}</span>
                {link.unread ? (
                  <span className="h-2 w-2 rounded-full bg-gold" />
                ) : null}
              </PrimaryNavLink>
            ))}
          </nav>

          <div className="mt-5 rounded-2xl border border-hairline px-3 py-3">
            <GhostExamplesControl />
          </div>

          {showArchie ? (
            <>
              <div
                aria-hidden
                className="my-4 h-px bg-[color-mix(in_srgb,var(--gold)_28%,var(--hairline))]"
              />
              <p className="mb-2 px-2 font-mono text-[10px] font-bold tracking-[0.14em] text-gold uppercase">
                Connected intelligence
              </p>
              <PrimaryNavLink
                href={archieEntryHref}
                active={archieActive}
                onNavigate={onClose}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-3 transition-[border-color,background-color] duration-200",
                  archieActive
                    ? "border-gold bg-[color-mix(in_srgb,var(--gold)_14%,transparent)]"
                    : "border-[color-mix(in_srgb,var(--brand-word)_28%,transparent)] bg-transparent hover:border-[color-mix(in_srgb,var(--gold)_55%,transparent)]",
                )}
              >
                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[18px] bg-white ring-1 ring-black/10">
                  <Image
                    src={ARCHIE_MARK_SRC}
                    alt=""
                    width={88}
                    height={88}
                    className="h-full w-full object-cover"
                  />
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block font-sans text-xs font-extrabold tracking-[0.07em] uppercase",
                      archieActive ? "text-gold" : "text-[var(--brand-word)]",
                    )}
                  >
                    {archie.shortLabel}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">
                    {archie.label}
                  </span>
                </span>
              </PrimaryNavLink>

              <div className="mt-2 flex flex-col gap-0.5 pl-1">
                {archie.modules.map((mod) => {
                  const id = (mod.id ?? "research") as ArchieModule;
                  const active =
                    archieActive && isArchieModuleActive(id, section, mode);
                  return (
                    <PrimaryNavLink
                      key={id}
                      href={mod.href}
                      active={active}
                      onNavigate={() => {
                        writeLastArchieModule(id);
                        onClose();
                      }}
                      className={cn(
                        "flex min-h-11 items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                        active
                          ? "bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] text-gold"
                          : "text-[var(--brand-word)]/80 hover:bg-white/5 hover:text-gold",
                      )}
                    >
                      {mod.label}
                    </PrimaryNavLink>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
