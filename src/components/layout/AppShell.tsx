"use client";

import type { ReactNode } from "react";
import { DesktopNav } from "@/components/layout/DesktopNav";
import {
  MobileBottomNav,
  MobileTopBar,
} from "@/components/layout/MobileBottomNav";
import { RoleProvider } from "@/components/providers/RoleProvider";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <RoleProvider>
      <div className="min-h-dvh bg-[var(--background)] text-ink transition-colors duration-500">
        <DesktopNav />
        <MobileTopBar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6 md:pb-10 md:pt-8">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </RoleProvider>
  );
}
