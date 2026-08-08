"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Bookmark,
  Home,
  MessageSquare,
  User,
  Users,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { cn } from "@/lib/utils";

export default function GlobalNav() {
  const { role, toggleRole, unreadMessages, openReferralCount } = useApp();
  const pathname = usePathname();
  const isPro = role === "professional";

  // Seller portal is a standalone experience (no main app chrome)
  if (pathname.startsWith("/seller")) {
    return null;
  }

  return (
    <>
      <nav className="fixed top-0 left-0 z-50 flex h-[72px] w-full items-center justify-between border-b border-hairline bg-[var(--nav-surface)]/95 px-4 backdrop-blur-md md:px-6">
        <Link href="/marketplace" className="flex select-none flex-col">
          <div className="flex items-center gap-0.5 tracking-tighter">
            <span className="font-sans text-2xl font-extrabold text-[var(--brand-word)]">
              STORY
            </span>
            <span className="font-sans text-2xl font-extrabold text-[var(--brand-home)]">
              HOME
            </span>
            <span className="mt-1 self-start text-[8px] font-bold text-[var(--brand-home)]">
              TM
            </span>
          </div>
          <span className="-mt-1 font-mono text-[9px] font-bold tracking-[0.12em] text-[var(--brand-word)]">
            EVERY HOME HAS A STORY
          </span>
        </Link>

        <div className="hidden items-center gap-7 font-sans text-sm font-medium md:flex">
          <NavLink
            href="/marketplace"
            active={pathname.startsWith("/marketplace")}
          >
            Marketplace
          </NavLink>
          {isPro ? (
            <>
              <NavLink href="/network" active={pathname.startsWith("/network")}>
                Network
              </NavLink>
              <NavLink
                href="/referrals"
                active={pathname.startsWith("/referrals")}
                className="relative"
              >
                Referrals
                {openReferralCount > 0 && (
                  <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-gold" />
                )}
              </NavLink>
            </>
          ) : (
            <>
              <NavLink href="/saved" active={pathname.startsWith("/saved")}>
                Saved
              </NavLink>
              <NavLink
                href="/following"
                active={pathname.startsWith("/following")}
              >
                Following
              </NavLink>
            </>
          )}
          <NavLink
            href="/messages"
            active={pathname.startsWith("/messages")}
            className="relative"
          >
            Messages
            {unreadMessages && (
              <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-gold" />
            )}
          </NavLink>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={toggleRole}
            className="relative flex h-9 w-[150px] cursor-pointer select-none items-center rounded-full border border-hairline bg-[var(--surface)] p-1 md:w-[160px]"
            aria-label="Switch Consumer / Pro role"
          >
            <span
              className={cn(
                "absolute top-1 bottom-1 w-[70px] rounded-full bg-[var(--accent)] shadow-sm transition-all duration-300 md:w-[74px]",
                isPro ? "left-[76px] md:left-[81px]" : "left-1",
              )}
            />
            <span
              className={cn(
                "z-10 w-1/2 text-center text-xs font-semibold transition-colors",
                !isPro ? "text-[var(--accent-contrast)]" : "text-[var(--muted)]",
              )}
            >
              Consumer
            </span>
            <span
              className={cn(
                "z-10 w-1/2 text-center text-xs font-semibold transition-colors",
                isPro ? "text-[var(--accent-contrast)]" : "text-[var(--muted)]",
              )}
            >
              Pro
            </span>
          </button>
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-hairline bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] font-bold text-navy"
            aria-label="Profile"
          >
            SJ
          </Link>
        </div>
      </nav>

      <div className="fixed bottom-0 left-0 z-50 grid h-16 w-full grid-cols-5 items-center justify-items-center border-t border-hairline bg-[var(--nav-surface)]/96 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <MobileTab
          href="/marketplace"
          label="Home"
          icon={Home}
          active={pathname.startsWith("/marketplace")}
        />
        {isPro ? (
          <>
            <MobileTab
              href="/network"
              label="Network"
              icon={Users}
              active={pathname.startsWith("/network")}
            />
            <MobileTab
              href="/referrals"
              label="Referrals"
              icon={Briefcase}
              active={pathname.startsWith("/referrals")}
              unread={openReferralCount > 0}
            />
          </>
        ) : (
          <>
            <MobileTab
              href="/saved"
              label="Saved"
              icon={Bookmark}
              active={pathname.startsWith("/saved")}
            />
            <MobileTab
              href="/following"
              label="Following"
              icon={Users}
              active={pathname.startsWith("/following")}
            />
          </>
        )}
        <MobileTab
          href="/messages"
          label="Messages"
          icon={MessageSquare}
          active={pathname.startsWith("/messages")}
          unread={unreadMessages}
        />
        <MobileTab
          href="/profile"
          label="Profile"
          icon={User}
          active={pathname.startsWith("/profile")}
        />
      </div>
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
    <Link
      href={href}
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
  unread,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  unread?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-col items-center gap-0.5",
        active ? "text-ink" : "text-[var(--muted)]",
      )}
    >
      <Icon className="h-5 w-5" />
      {unread && (
        <span className="absolute top-0 right-1 h-1.5 w-1.5 rounded-full bg-gold" />
      )}
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
