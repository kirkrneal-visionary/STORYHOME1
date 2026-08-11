"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Calculator,
  Home,
  KeyRound,
  MessagesSquare,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";
import { ShiIcon } from "@/components/brand/ShiIcon";
import { MyToolsView } from "@/components/broker/MyToolsView";
import { MyListingsView } from "@/components/broker/MyListingsView";
import { MyBuyersView } from "@/components/broker/MyBuyersView";
import { MySellersView } from "@/components/broker/MySellersView";
import { SharedHomesView } from "@/components/broker/SharedHomesView";
import { CommunityView } from "@/components/broker/CommunityView";
import { ShiWorkspace } from "@/components/broker/intelligence/ShiWorkspace";
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
  { id: "intelligence", label: SHI_PRODUCT.menuLabel, icon: ShiIcon },
  { id: "buyers", label: "My Buyers", icon: Users },
  { id: "sellers", label: "My Sellers", icon: Home },
  { id: "clientHomes", label: "Client Homes", icon: KeyRound },
  { id: "community", label: "Community", icon: MessagesSquare },
];

const TAB_IDS = new Set<string>(TABS.map((t) => t.id));

function resolveInitialTab(
  pathname: string | null,
  searchTab: string | null,
): PortalTab {
  if (pathname?.endsWith("/intelligence") || pathname?.includes("/portal/intelligence")) {
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

  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6 md:pb-12">
      <div
        className={cn(
          "mx-auto",
          tab === "intelligence" ? "max-w-[90rem]" : "max-w-6xl",
        )}
      >
        <header className="flex flex-col gap-1">
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Story Pro · {user.name}
          </p>
          <h1 className="font-serif text-3xl font-bold text-ink md:text-4xl">
            Story Pro
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            List properties, research your market with SHI, manage clients, and
            run the numbers — your agent workspace.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Broker portal sections"
          className="mt-6 flex gap-2 overflow-x-auto border-b border-hairline pb-px"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            const isShi = id === "intelligence";
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={isShi ? SHI_PRODUCT.fullName : label}
                title={isShi ? SHI_PRODUCT.fullName : undefined}
                onClick={() => selectTab(id)}
                className={cn(
                  "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? isShi
                      ? "border-gold text-navy"
                      : "border-[var(--accent)] text-ink"
                    : "border-transparent text-[var(--muted)] hover:text-ink",
                  isShi && !active && "text-navy/80",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isShi && (active ? "text-gold" : "text-navy"),
                  )}
                />
                {label}
              </button>
            );
          })}
          <Link
            href={`/agents/${user.id}`}
            className="-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition-colors hover:text-ink"
          >
            <UserRound className="h-4 w-4" />
            Public Profile
          </Link>
        </div>

        <div className="mt-8">
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
    <div className="mx-auto max-w-lg px-4 pb-24 pt-[120px] text-center md:px-6">
      <h1 className="font-serif text-3xl font-bold text-ink">{title}</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">{description}</p>
      <Link
        href={cta.href}
        className="mt-8 inline-flex h-12 items-center rounded-xl bg-gold px-6 text-sm font-bold text-navy"
      >
        {cta.label}
      </Link>
    </div>
  );
}
