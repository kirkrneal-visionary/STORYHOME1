import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  Store,
  UserRound,
  Users,
} from "lucide-react";
import type { UserRole } from "@/types/role";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When set, link only shows for these roles */
  roles?: UserRole[];
};

/** Primary destinations — Messages/Referrals hidden until real product ships. */
export const PRIMARY_NAV: NavItem[] = [
  {
    href: "/marketplace",
    label: "Marketplace",
    icon: Store,
  },
  {
    href: "/portal",
    label: "Story Pro",
    icon: Briefcase,
    roles: ["professional"],
  },
  {
    href: "/network",
    label: "Network",
    icon: Users,
    roles: ["professional"],
  },
];

export const PROFILE_NAV: NavItem = {
  href: "/profile",
  label: "Profile",
  icon: UserRound,
};

export function navForRole(role: UserRole): NavItem[] {
  return PRIMARY_NAV.filter(
    (item) => !item.roles || item.roles.includes(role),
  );
}

/** Mobile bottom bar: primary links + profile, capped at 5 */
export function mobileNavForRole(role: UserRole): NavItem[] {
  return [...navForRole(role), PROFILE_NAV].slice(0, 5);
}

export const BRAND = {
  name: "Story Home",
  mark: Building2,
} as const;
