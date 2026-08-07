"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";
import { UnreadDot } from "@/components/layout/UnreadDot";
import { useRole } from "@/components/providers/RoleProvider";
import { mobileNavForRole } from "@/lib/navigation";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-hairline bg-[var(--nav-surface)]/92 px-4 backdrop-blur-md md:hidden">
      <Logo compact />
      <RoleSwitcher compact />
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { role, hasUnreadMessages } = useRole();
  const items = mobileNavForRole(role);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-[var(--nav-surface)]/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Mobile primary"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-[repeat(auto-fit,minmax(0,1fr))] items-stretch">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                className={[
                  "relative flex h-full flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium tracking-wide transition-colors duration-200",
                  active
                    ? "text-[var(--nav-active-fg)]"
                    : "text-[var(--muted)]",
                ].join(" ")}
              >
                <span className="relative">
                  <Icon
                    className={[
                      "h-5 w-5 transition-transform duration-300",
                      active ? "scale-105" : "",
                    ].join(" ")}
                    strokeWidth={active ? 2 : 1.75}
                  />
                  {item.showUnread && (
                    <UnreadDot
                      visible={hasUnreadMessages}
                      className="-right-0.5 -top-0.5"
                    />
                  )}
                </span>
                <span className="truncate">{item.label}</span>
                {active && (
                  <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-[var(--accent)]" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
