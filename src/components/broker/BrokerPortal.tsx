"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calculator,
  Home,
  KeyRound,
  MessagesSquare,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { MyToolsView } from "@/components/broker/MyToolsView";
import { MyListingsView } from "@/components/broker/MyListingsView";
import { MyBuyersView } from "@/components/broker/MyBuyersView";
import { MySellersView } from "@/components/broker/MySellersView";
import { SharedHomesView } from "@/components/broker/SharedHomesView";
import { CommunityView } from "@/components/broker/CommunityView";
import { ShiWorkspace } from "@/components/broker/intelligence/ShiWorkspace";
import { track, type PortalTabProp } from "@/lib/analytics";
import { SHI_PRODUCT } from "@/lib/shi/waves";
import { cn } from "@/lib/utils";

type PortalTab =
  | "tools"
  | "listings"
  | "buyers"
  | "sellers"
  | "clientHomes"
  | "community"
  | "intelligence";

type TabIcon = ComponentType<{ className?: string; size?: number }>;

const TABS: { id: PortalTab; label: string; icon: TabIcon }[] = [
  { id: "tools", label: "My Tools", icon: Calculator },
  { id: "listings", label: "My Listings", icon: Building2 },
  { id: "buyers", label: "My Buyers", icon: Users },
  { id: "sellers", label: "My Sellers", icon: Home },
  { id: "clientHomes", label: "Client Homes", icon: KeyRound },
  { id: "community", label: "Community", icon: MessagesSquare },
];

const TAB_IDS = new Set<string>([
  ...TABS.map((t) => t.id),
  "intelligence",
]);

function resolveInitialTab(
  pathname: string | null,
  searchTab: string | null,
): PortalTab {
  if (
    pathname?.endsWith("/intelligence") ||
    pathname?.includes("/portal/intelligence")
  ) {
    return "intelligence";
  }
  if (searchTab && TAB_IDS.has(searchTab)) {
    return searchTab as PortalTab;
  }
  return "tools";
}

type BrokerPortalProps = {
  /** Force opening a tab (e.g. /portal/intelligence). */
  initialTab?: PortalTab;
};

export function BrokerPortal({ initialTab }: BrokerPortalProps = {}) {
  const { user, isLoggedIn } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  // URL is the source of truth (avoids syncing tab state in an effect).
  const tab: PortalTab =
    initialTab ?? resolveInitialTab(pathname, searchParams.get("tab"));

  function selectTab(next: PortalTab) {
    const tabProp: PortalTabProp =
      next === "tools" ||
      next === "listings" ||
      next === "buyers" ||
      next === "sellers" ||
      next === "intelligence" ||
      next === "community"
        ? next
        : "other";
    track("portal_tab_opened", { tab: tabProp });
    if (next === "intelligence") {
      router.replace("/portal/intelligence", { scroll: false });
      return;
    }
    if (pathname?.includes("/portal/intelligence")) {
      router.replace(`/portal?tab=${next}`, { scroll: false });
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/portal?${params.toString()}`, { scroll: false });
  }

  if (!isLoggedIn) {
    return (
      <Gate
        title="Story Pro"
        description="Log in with a professional account to access your tools, listings, buyers, and sellers."
        cta={{ href: "/login?next=/portal", label: "Log in to continue" }}
      />
    );
  }

  if (user?.kind !== "pro" && user?.kind !== "broker") {
    return (
      <Gate
        title="For professionals"
        description="Story Pro is available to realtor, broker, and other pro accounts. Switch to a professional account to continue."
        cta={{ href: "/login?next=/portal", label: "Use a pro account" }}
      />
    );
  }

  const inArchie = tab === "intelligence";

  return (
    <div
      className={cn(
        "min-h-dvh px-4 pb-24 md:px-6 md:pb-12",
        /* 72 nav + 40 Archie ribbon when in Intelligence */
        inArchie ? "pt-[128px]" : "pt-[96px]",
      )}
    >
      <div
        className={cn("mx-auto", inArchie ? "max-w-[90rem]" : "max-w-6xl")}
      >
        {inArchie ? (
          <div className="mb-3">
            <Link
              href="/portal?tab=tools"
              className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Story Pro
            </Link>
          </div>
        ) : (
          <>
            <header className="flex flex-col gap-1">
              <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                Story Pro · {user.name}
              </p>
              <h1 className="font-serif text-3xl font-bold text-ink md:text-4xl">
                Story Pro
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                List properties, manage clients, and run the numbers — your
                agent workspace. Open {SHI_PRODUCT.fullName} from the top bar
                network node.
              </p>
            </header>

            <div
              role="tablist"
              aria-label="Broker portal sections"
              className="mt-6 flex items-center gap-2 overflow-x-auto rounded-2xl border border-hairline/80 bg-[color-mix(in_srgb,var(--surface)_88%,var(--paper))]/90 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-md"
            >
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={label}
                    onClick={() => selectTab(id)}
                    className={cn(
                      "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors",
                      active
                        ? "bg-navy text-gold shadow-sm"
                        : "text-[var(--muted)] hover:bg-white/70 hover:text-ink",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">{label}</span>
                  </button>
                );
              })}
              <Link
                href={`/agents/${user.id}`}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-[var(--muted)] transition-colors hover:bg-white/70 hover:text-ink"
              >
                <UserRound className="h-4 w-4" />
                Public Profile
              </Link>
            </div>
          </>
        )}

        <div className={cn(inArchie ? "mt-2" : "mt-8")}>
          {tab === "tools" && <MyToolsView />}
          {tab === "listings" && <MyListingsView />}
          {tab === "intelligence" && <ShiWorkspace />}
          {tab === "buyers" && <MyBuyersView />}
          {tab === "sellers" && <MySellersView />}
          {tab === "clientHomes" && <SharedHomesView />}
          {tab === "community" && <CommunityView />}
        </div>
      </div>
    </div>
  );
}

function Gate({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 pb-24 pt-[96px] text-center">
      <h1 className="font-serif text-3xl font-bold text-ink">{title}</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">{description}</p>
      <Link
        href={cta.href}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-navy px-5 text-sm font-bold text-gold"
      >
        {cta.label}
      </Link>
    </div>
  );
}
