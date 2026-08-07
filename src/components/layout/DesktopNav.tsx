"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";
import { UnreadDot } from "@/components/layout/UnreadDot";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { useRole } from "@/components/providers/RoleProvider";
import { navForRole } from "@/lib/navigation";

export function DesktopNav() {
  const pathname = usePathname();
  const { role, hasUnreadMessages } = useRole();
  const items = navForRole(role);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-hairline bg-[var(--nav-surface)]/92 backdrop-blur-md md:block">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
        <Logo />

        <nav className="flex flex-1 items-center gap-1" aria-label="Primary">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
                  active
                    ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]"
                    : "text-[var(--muted)] hover:bg-[var(--nav-hover-bg)] hover:text-ink",
                ].join(" ")}
              >
                <span className="relative">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {item.showUnread && (
                    <UnreadDot visible={hasUnreadMessages} className="-right-0.5 -top-0.5" />
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <RoleSwitcher />
          <UserAvatar />
        </div>
      </div>
    </header>
  );
}
