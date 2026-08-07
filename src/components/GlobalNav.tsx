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
  const { role, toggleRole, unreadMessages } = useApp();
  const pathname = usePathname();

  return (
    <>
      {/* DESKTOP TOP BAR */}
      <nav className="fixed top-0 left-0 z-50 flex h-[72px] w-full items-center justify-between border-b border-hairline bg-white px-6">
        <Link href="/marketplace" className="flex select-none flex-col">
          <div className="flex items-center gap-0.5 tracking-tighter">
            <span className="font-sans text-2xl font-extrabold text-navy">
              STORY
            </span>
            <span className="font-sans text-2xl font-extrabold text-gold">
              HOME
            </span>
            <span className="mt-1 self-start text-[8px] font-bold text-gold">
              TM
            </span>
          </div>
          <span className="-mt-1 font-mono text-[9px] font-bold tracking-[0.12em] text-navy">
            EVERY HOME HAS A STORY
          </span>
        </Link>

        <div className="hidden items-center gap-8 font-sans text-sm font-medium text-slate-text md:flex">
          <NavLink href="/marketplace" active={pathname.startsWith("/marketplace")}>
            Marketplace
          </NavLink>
          {role === "professional" && (
            <>
              <NavLink href="/network" active={pathname.startsWith("/network")}>
                Network
              </NavLink>
              <NavLink
                href="/referrals"
                active={pathname.startsWith("/referrals")}
              >
                Referrals
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

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleRole}
            className="relative flex h-9 w-[160px] cursor-pointer select-none items-center rounded-full bg-slate-100 p-1"
            aria-label="Switch Consumer / Pro role"
          >
            <span
              className={cn(
                "absolute top-1 bottom-1 w-[74px] rounded-full bg-white shadow-sm transition-all duration-300",
                role === "professional" ? "left-[81px]" : "left-1",
              )}
            />
            <span
              className={cn(
                "z-10 w-1/2 text-center text-xs font-semibold transition-colors",
                role === "consumer" ? "text-navy" : "text-slate-400",
              )}
            >
              Consumer
            </span>
            <span
              className={cn(
                "z-10 w-1/2 text-center text-xs font-semibold transition-colors",
                role === "professional" ? "text-teal-accent" : "text-slate-400",
              )}
            >
              Pro
            </span>
          </button>
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-hairline bg-slate-200 font-bold text-navy"
            aria-label="Profile"
          >
            SJ
          </Link>
        </div>
      </nav>

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 left-0 z-50 grid h-16 w-full grid-cols-5 items-center justify-items-center border-t border-hairline bg-white px-2 md:hidden">
        <MobileTab
          href="/marketplace"
          label="Home"
          icon={Home}
          active={pathname.startsWith("/marketplace")}
        />
        {role === "professional" ? (
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
            />
          </>
        ) : (
          <>
            <MobileTab
              href="/marketplace#saved"
              label="Saved"
              icon={Bookmark}
              active={false}
            />
            <div className="w-1" />
          </>
        )}
        <MobileTab
          href="/messages"
          label="Inbox"
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
        "transition-colors hover:text-navy",
        active ? "text-navy" : "text-slate-text",
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
        active ? "text-navy" : "text-slate-400 hover:text-navy",
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
