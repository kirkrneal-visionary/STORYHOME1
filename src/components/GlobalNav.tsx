"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Bookmark,
  Home,
  LogIn,
  Menu,
  Search,
  Settings,
  User,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { useAuth } from "@/components/AuthContext";
import {
  FederatedNavDrawer,
  type FederatedDrawerLink,
} from "@/components/nav/FederatedNavDrawer";
import { HeaderMotionMenu } from "@/components/home/GhostExamplesControl";
import { NavPressButton } from "@/components/nav/NavPressButton";
import { NetworkContextRibbon } from "@/components/nav/NetworkContextRibbon";
import { NetworkDivider } from "@/components/nav/NetworkDivider";
import { NetworkNode } from "@/components/nav/NetworkNode";
import { NavIntentSettler, PrimaryNavLink } from "@/components/nav/PrimaryNavLink";
import { useArchieEntryHref } from "@/hooks/useArchieEntryHref";
import { useLivingHeader } from "@/hooks/useLivingHeader";
import { useVisualViewportInset } from "@/hooks/useVisualViewportInset";
import { mayManageBrokerage, mayUseStoryPro } from "@/lib/account/purpose";
import { accountLabel } from "@/lib/auth";
import {
  isMarketplacePath,
  isNetworkPath,
  isOfficePath,
  isProfilePath,
  isProWorkspacePath,
  isSettingsPath,
  isSuitesPath,
  primaryDockId,
} from "@/lib/navigation/nav-active";
import {
  ARCHIE_MARK_SRC,
  NAVIGATION_NETWORKS,
} from "@/lib/navigation/networks";
import { cn } from "@/lib/utils";

function shortKind(kind?: string, purpose?: string): string {
  if (purpose === "managing_broker") return "Office";
  if (purpose === "other_professional") return "Pro";
  if (kind === "broker") return "Broker";
  if (kind === "pro") return "Pro";
  if (kind === "seller") return "Seller";
  return "Consumer";
}

export default function GlobalNav() {
  const { role, setRole } = useApp();
  const { user, isLoggedIn } = useAuth();
  const pathname = usePathname();
  const isProAccount = mayUseStoryPro(user?.purpose, user?.kind);
  const isOfficeAccount = mayManageBrokerage(user?.purpose);
  const isPro = isProAccount && role === "professional";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPath, setDrawerPath] = useState(pathname);
  const archieEntryHref = useArchieEntryHref();
  const headerState = useLivingHeader(true);
  useVisualViewportInset();
  const dockId = primaryDockId(pathname);

  // Close the mobile drawer when the route changes (render-time adjust).
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const isHome = dockId === "home";
  const archie = NAVIGATION_NETWORKS.archie;
  const archieActive = dockId === "archie";
  const showArchieNode = isPro && isLoggedIn;
  const isSellerPath = pathname.startsWith("/seller");

  const hostLinks = useMemo(() => {
    const links: FederatedDrawerLink[] = [];
    if (isHome) {
      links.push(
        {
          href: "/marketplace?q=Lufkin%2C%20TX&intent=sale",
          label: "Buy",
          active: false,
        },
        {
          href: "/rent",
          label: "Rent",
          active: false,
        },
        { href: "/seller", label: "Sell", active: false },
        {
          href: "/network",
          label: "Agents",
          active: isNetworkPath(pathname),
        },
      );
    } else {
      links.push({
        href: "/marketplace",
        label: "Marketplace",
        active: isMarketplacePath(pathname),
      });
      if (isOfficeAccount && isLoggedIn) {
        links.push({
          href: "/office",
          label: "Office",
          active: isOfficePath(pathname),
        });
      }
      if (isPro && isLoggedIn) {
        links.push(
          {
            href: "/portal",
            label: "Story Pro",
            active: isProWorkspacePath(pathname),
          },
          {
            href: "/network",
            label: "Network",
            active: isNetworkPath(pathname),
          },
        );
      } else {
        links.push(
          {
            href: "/home",
            label: "My Home",
            active: pathname === "/home" || Boolean(pathname?.startsWith("/home/")),
          },
          {
            href: "/saved",
            label: "Suites",
            active: isSuitesPath(pathname),
          },
        );
      }
    }
    if (isLoggedIn) {
      links.push({
        href: "/settings",
        label: "Settings",
        active: isSettingsPath(pathname),
      });
    }
    return links;
  }, [isHome, isLoggedIn, isOfficeAccount, isPro, pathname]);

  if (isSellerPath) {
    return null;
  }

  return (
    <>
      <nav
        data-header-state={headerState}
        data-story-overlay-header
        className="story-overlay-header fixed top-0 left-0 z-50 flex w-full items-center justify-between gap-2 overflow-hidden px-3 md:px-5"
        style={{
          height: "var(--story-safe-top)",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {/* Mobile: menu left · brand center · actions right (Instagram placement) */}
        <NavPressButton
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:text-gold xl:hidden"
          aria-label="Open network menu"
          aria-expanded={drawerOpen}
          traceName="open-menu"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </NavPressButton>

        <Link
          href="/"
          className="story-living-brand absolute left-1/2 flex min-w-0 -translate-x-1/2 select-none items-center xl:static xl:translate-x-0"
          aria-label="StoryHome — Every home has a story"
        >
          <span className="story-living-mark h-9 w-9 items-center justify-center rounded-full bg-navy ring-1 ring-gold/50">
            <span className="story-wordmark text-[var(--type-caption)] text-paper">
              SH
            </span>
          </span>
          <span className="story-living-full flex min-w-0 flex-col">
            <span className="flex items-center gap-0.5">
              <span className="story-living-word story-wordmark text-[var(--type-brand)] text-[var(--brand-word)]">
                STORY
              </span>
              <span className="story-living-word story-wordmark text-[var(--type-brand)] text-[var(--brand-home)]">
                HOME
              </span>
              <span className="mt-1 self-start text-[var(--type-caption)] font-semibold text-[var(--brand-home)]">
                TM
              </span>
            </span>
            <span className="story-living-tagline story-wordmark-tagline -mt-0.5 text-[var(--brand-word)]">
              Every home has a story
            </span>
          </span>
        </Link>

        <div className="hidden min-w-0 items-center gap-5 overflow-hidden font-sans text-sm font-medium xl:flex">
          {isHome ? (
            <>
              <NavLink
                href="/marketplace?q=Lufkin%2C%20TX&intent=sale"
                active={false}
              >
                Buy
              </NavLink>
              <NavLink
                href="/rent"
                active={false}
              >
                Rent
              </NavLink>
              <NavLink href="/seller" active={false}>
                Sell
              </NavLink>
              <NavLink href="/network" active={false}>
                Agents
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                href="/marketplace"
                active={isMarketplacePath(pathname)}
              >
                Marketplace
              </NavLink>
              {isOfficeAccount && isLoggedIn ? (
                <NavLink
                  href="/office"
                  active={isOfficePath(pathname)}
                >
                  Office
                </NavLink>
              ) : null}
              {isPro && isLoggedIn ? (
                <>
                  <NavLink href="/portal" active={isProWorkspacePath(pathname)}>
                    Story Pro
                  </NavLink>
                  <NavLink
                    href="/network"
                    active={isNetworkPath(pathname)}
                  >
                    Network
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink
                    href="/home"
                    active={pathname === "/home" || Boolean(pathname?.startsWith("/home/"))}
                  >
                    My Home
                  </NavLink>
                  <NavLink
                    href="/saved"
                    active={isSuitesPath(pathname)}
                  >
                    Suites
                  </NavLink>
                </>
              )}
            </>
          )}

          {showArchieNode ? (
            <>
              <NetworkDivider />
              <NetworkNode
                href={archieEntryHref}
                label={archie.shortLabel}
                active={archieActive}
              />
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <HeaderMotionMenu className="hidden md:block" />
          {showArchieNode ? (
            <NetworkNode
              href={archieEntryHref}
              label={archie.shortLabel}
              active={archieActive}
              size="icon"
              className="xl:hidden"
            />
          ) : null}

          {isLoggedIn &&
            isProAccount &&
            (role === "professional" ? (
              <button
                type="button"
                onClick={() => setRole("consumer")}
                className="hidden h-9 items-center rounded-full border border-hairline bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--muted)] transition-colors hover:text-ink xl:inline-flex"
                title="Preview the site the way a buyer sees it"
              >
                View as buyer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRole("professional")}
                className="hidden h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 text-xs font-bold text-[var(--accent-contrast)] xl:inline-flex"
                title="Return to your Pro workspace"
              >
                ← Back to Pro
              </button>
            ))}

          {isLoggedIn && user ? (
            <>
              <Link
                href="/settings"
                aria-label="Settings"
                title="Settings"
                className={cn(
                  "hidden h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:text-gold sm:flex",
                  isSettingsPath(pathname) && "text-gold",
                )}
              >
                <Settings className="h-5 w-5" />
              </Link>
              <Link
                href="/profile"
                className="flex h-10 items-center gap-2 rounded-full pl-1 pr-1 font-bold text-navy sm:border sm:border-hairline sm:bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] sm:pr-3"
                aria-label="Profile"
                title={accountLabel(user)}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs text-paper ring-1 ring-gold/40">
                  {user.initials}
                </span>
                <span className="hidden flex-col leading-tight xl:flex">
                  <span className="max-w-[110px] truncate text-xs">
                    {user.name.split(" ")[0]}
                  </span>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wide text-navy/70">
                    {shortKind(user.kind, user.purpose)}
                  </span>
                </span>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-gold px-3 text-sm font-bold text-navy sm:px-4"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Log in</span>
            </Link>
          )}
        </div>
      </nav>

      {archieActive ? (
        <Suspense fallback={null}>
          <NetworkContextRibbon />
        </Suspense>
      ) : null}

      <Suspense fallback={null}>
        <FederatedNavDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          hostLinks={hostLinks}
          showArchie={Boolean(showArchieNode)}
          archieEntryHref={archieEntryHref}
        />
      </Suspense>

      <NavIntentSettler />

      {/* Same glass pill language phone → desktop (centered dock on md+) */}
      <nav
        aria-label="Primary"
        data-story-bottom-dock
        className="story-glass-nav story-bottom-dock fixed z-50 grid grid-cols-4 items-stretch justify-items-stretch"
      >
        <MobileTab href="/" label="Home" icon={Home} active={isHome} />
        {isPro && isLoggedIn ? (
          <>
            <MobileTab
              href="/portal"
              label="Pro"
              icon={Briefcase}
              active={dockId === "pro"}
            />
            <MobileTab
              href={archieEntryHref}
              label="Archie"
              icon={Briefcase}
              active={archieActive}
              mark
            />
          </>
        ) : (
          <>
            <MobileTab
              href="/saved"
              label="Suites"
              icon={Bookmark}
              active={dockId === "suites"}
            />
            <MobileTab
              href="/marketplace"
              label="Search"
              icon={Search}
              active={dockId === "search"}
            />
          </>
        )}
        <MobileTab
          href={isLoggedIn ? "/profile" : "/login"}
          label={isLoggedIn ? "Profile" : "Log in"}
          icon={User}
          active={dockId === "profile"}
        />
      </nav>
    </>
  );
}

function NavLink({
  href,
  active,
  children,
  className,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <PrimaryNavLink
      href={href}
      active={active}
      className={cn(
        "inline-flex min-h-11 items-center transition-colors",
        active ? "text-ink" : "text-[var(--muted)] hover:text-ink",
        className,
      )}
    >
      {children}
    </PrimaryNavLink>
  );
}

function MobileTab({
  href,
  label,
  icon: Icon,
  active,
  mark,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  /** Use Archie brand mark instead of lucide icon */
  mark?: boolean;
}) {
  return (
    <PrimaryNavLink
      href={href}
      active={active}
      pendingCue={false}
      className={cn(
        "story-dock-tab relative flex h-full min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-full",
        active ? "text-ink" : "text-[var(--muted)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "story-dock-active-fill",
          active && "story-dock-active-fill-on",
        )}
      />
      <span className="relative z-[1] flex flex-col items-center gap-0.5">
        {mark ? (
          <span className="story-dock-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ARCHIE_MARK_SRC} alt="" />
          </span>
        ) : (
          <Icon
            className={cn("story-dock-icon", active && "text-gold")}
            aria-hidden
          />
        )}
        <span className="text-[9px] font-semibold tracking-wide">{label}</span>
      </span>
    </PrimaryNavLink>
  );
}
