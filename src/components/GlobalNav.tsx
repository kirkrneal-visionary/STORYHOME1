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
import { NetworkContextRibbon } from "@/components/nav/NetworkContextRibbon";
import { NetworkDivider } from "@/components/nav/NetworkDivider";
import { NetworkNode } from "@/components/nav/NetworkNode";
import { useMotionOptional } from "@/components/motion/MotionProvider";
import { useArchieEntryHref } from "@/hooks/useArchieEntryHref";
import { useLivingHeader } from "@/hooks/useLivingHeader";
import { accountLabel } from "@/lib/auth";
import {
  isArchiePath,
  isStoryProPath,
  NAVIGATION_NETWORKS,
} from "@/lib/navigation/networks";
import { cn } from "@/lib/utils";

function shortKind(kind?: string): string {
  if (kind === "broker") return "Broker";
  if (kind === "pro") return "Pro";
  if (kind === "seller") return "Seller";
  return "Consumer";
}

export default function GlobalNav() {
  const { role, setRole } = useApp();
  const { user, isLoggedIn } = useAuth();
  const pathname = usePathname();
  const isProAccount = user?.kind === "pro" || user?.kind === "broker";
  const isPro = isProAccount && role === "professional";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPath, setDrawerPath] = useState(pathname);
  const archieEntryHref = useArchieEntryHref();
  const headerState = useLivingHeader(true);

  // Close the mobile drawer when the route changes (render-time adjust).
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const isHome = pathname === "/";
  const archie = NAVIGATION_NETWORKS.archie;
  const archieActive = isArchiePath(pathname);
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
          href: "/marketplace?q=Lufkin%2C%20TX&intent=rent",
          label: "Rent",
          active: false,
        },
        { href: "/seller", label: "Sell", active: false },
        {
          href: "/network",
          label: "Agents",
          active: pathname.startsWith("/network"),
        },
      );
    } else {
      links.push({
        href: "/marketplace",
        label: "Marketplace",
        active: pathname.startsWith("/marketplace"),
      });
      if (isPro && isLoggedIn) {
        links.push(
          {
            href: "/portal",
            label: "Story Pro",
            active: isStoryProPath(pathname),
          },
          {
            href: "/network",
            label: "Network",
            active: pathname.startsWith("/network"),
          },
        );
      } else {
        links.push(
          {
            href: "/home",
            label: "My Home",
            active: pathname.startsWith("/home"),
          },
          {
            href: "/saved",
            label: "Suites",
            active: pathname.startsWith("/saved"),
          },
          {
            href: "/following",
            label: "Following",
            active: pathname.startsWith("/following"),
          },
        );
      }
    }
    if (isLoggedIn) {
      links.push({
        href: "/settings",
        label: "Settings",
        active: pathname.startsWith("/settings"),
      });
    }
    return links;
  }, [isHome, isLoggedIn, isPro, pathname]);

  if (isSellerPath) {
    return null;
  }

  return (
    <>
      <nav
        data-header-state={headerState}
        className="story-chrome fixed top-0 left-0 z-50 flex w-full items-center justify-between border-b px-4 md:px-6"
        style={{ height: "var(--story-header-h)" }}
      >
        <Link
          href="/"
          className="story-living-brand flex min-w-0 select-none items-center"
          aria-label="StoryHome — Every home has a story"
        >
          <span className="story-living-mark h-9 w-9 items-center justify-center rounded-full bg-navy ring-1 ring-gold/50">
            <span className="font-serif text-[10px] font-bold leading-none tracking-tighter text-paper">
              SH
            </span>
          </span>
          <span className="story-living-full flex min-w-0 flex-col">
            <span className="flex items-center gap-0.5 tracking-tighter">
              <span className="story-living-word font-serif text-[var(--type-brand)] font-bold tracking-[-0.03em] text-[var(--brand-word)]">
                STORY
              </span>
              <span className="story-living-word font-serif text-[var(--type-brand)] font-bold tracking-[-0.03em] text-[var(--brand-home)]">
                HOME
              </span>
              <span className="mt-1 self-start text-[8px] font-bold text-[var(--brand-home)]">
                TM
              </span>
            </span>
            <span className="story-living-tagline -mt-1 font-mono text-[9px] font-bold tracking-[0.12em] text-[var(--brand-word)]">
              EVERY HOME HAS A STORY
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 font-sans text-sm font-medium md:flex">
          {isHome ? (
            <>
              <NavLink
                href="/marketplace?q=Lufkin%2C%20TX&intent=sale"
                active={false}
              >
                Buy
              </NavLink>
              <NavLink
                href="/marketplace?q=Lufkin%2C%20TX&intent=rent"
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
                active={pathname.startsWith("/marketplace")}
              >
                Marketplace
              </NavLink>
              {isPro && isLoggedIn ? (
                <>
                  <NavLink href="/portal" active={isStoryProPath(pathname)}>
                    Story Pro
                  </NavLink>
                  <NavLink
                    href="/network"
                    active={pathname.startsWith("/network")}
                  >
                    Network
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink
                    href="/home"
                    active={pathname.startsWith("/home")}
                  >
                    My Home
                  </NavLink>
                  <NavLink
                    href="/saved"
                    active={pathname.startsWith("/saved")}
                  >
                    Suites
                  </NavLink>
                  <NavLink
                    href="/following"
                    active={pathname.startsWith("/following")}
                  >
                    Following
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
          {showArchieNode ? (
            <NetworkNode
              href={archieEntryHref}
              label={archie.shortLabel}
              active={archieActive}
              size="icon"
              className="md:hidden"
            />
          ) : null}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-ink transition-colors hover:text-gold md:hidden"
            aria-label="Open network menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {isLoggedIn &&
            isProAccount &&
            (role === "professional" ? (
              <button
                type="button"
                onClick={() => setRole("consumer")}
                className="hidden h-9 items-center rounded-full border border-hairline bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--muted)] transition-colors hover:text-ink md:inline-flex"
                title="Preview the site the way a buyer sees it"
              >
                View as buyer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setRole("professional")}
                className="hidden h-9 items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 text-xs font-bold text-[var(--accent-contrast)] md:inline-flex"
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
                  "hidden h-10 w-10 items-center justify-center rounded-full border border-hairline text-ink transition-colors hover:text-gold sm:flex",
                  pathname.startsWith("/settings") && "text-gold",
                )}
              >
                <Settings className="h-5 w-5" />
              </Link>
              <Link
                href="/profile"
                className="flex h-10 items-center gap-2 rounded-full border border-hairline bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] pl-1 pr-2 font-bold text-navy sm:pr-3"
                aria-label="Profile"
                title={accountLabel(user)}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs text-paper">
                  {user.initials}
                </span>
                <span className="hidden flex-col leading-tight sm:flex">
                  <span className="max-w-[110px] truncate text-xs">
                    {user.name.split(" ")[0]}
                  </span>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wide text-navy/70">
                    {shortKind(user.kind)}
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

      <nav
        aria-label="Primary"
        className="story-glass-nav fixed z-50 grid grid-cols-4 items-center justify-items-center md:hidden"
        style={{
          left: "max(0.75rem, env(safe-area-inset-left))",
          right: "max(0.75rem, env(safe-area-inset-right))",
          bottom: "max(0.65rem, env(safe-area-inset-bottom))",
          height: "var(--story-bottom-nav-h)",
          paddingInline: "0.35rem",
        }}
      >
        <MobileTab href="/" label="Home" icon={Home} active={isHome} />
        {isPro && isLoggedIn ? (
          <>
            <MobileTab
              href="/portal"
              label="Pro"
              icon={Briefcase}
              active={isStoryProPath(pathname)}
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
              active={pathname.startsWith("/saved")}
            />
            <MobileTab
              href="/marketplace"
              label="Search"
              icon={Search}
              active={pathname.startsWith("/marketplace")}
            />
          </>
        )}
        <MobileTab
          href={isLoggedIn ? "/profile" : "/login"}
          label={isLoggedIn ? "Profile" : "Log in"}
          icon={User}
          active={
            pathname.startsWith("/profile") || pathname.startsWith("/login")
          }
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
  const motion = useMotionOptional();
  return (
    <Link
      href={href}
      onClick={() => motion?.markNavigate(href)}
      className={cn(
        "transition-colors",
        active ? "text-ink" : "text-[var(--muted)] hover:text-ink",
        className,
      )}
    >
      {children}
    </Link>
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
  const motion = useMotionOptional();
  return (
    <Link
      href={href}
      onClick={() => motion?.markNavigate(href)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "story-press relative flex h-11 w-full max-w-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-full",
        active ? "text-ink" : "text-[var(--muted)]",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-1 inset-x-1 rounded-full bg-[color-mix(in_srgb,var(--navy)_55%,transparent)] ring-1 ring-gold/40"
        />
      ) : null}
      <span className="relative z-[1] flex flex-col items-center gap-0.5">
        {mark ? (
          <span
            className={cn(
              "relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white ring-1",
              active ? "ring-gold" : "ring-black/10",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/archie-intelligence-sm.png"
              alt=""
              className="h-full w-full object-cover"
            />
          </span>
        ) : (
          <Icon
            className={cn("h-5 w-5", active && "text-gold")}
            aria-hidden
          />
        )}
        <span className="text-[9px] font-semibold tracking-wide">{label}</span>
      </span>
    </Link>
  );
}
