"use client";

import { useState } from "react";
import Link from "next/link";
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
import { DEMO_AGENT } from "@/lib/demo-data";
import { MyToolsView } from "@/components/broker/MyToolsView";
import { MyListingsView } from "@/components/broker/MyListingsView";
import { MyBuyersView } from "@/components/broker/MyBuyersView";
import { MySellersView } from "@/components/broker/MySellersView";
import { SharedHomesView } from "@/components/broker/SharedHomesView";
import { CommunityView } from "@/components/broker/CommunityView";
import { cn } from "@/lib/utils";

type PortalTab =
  | "tools"
  | "listings"
  | "buyers"
  | "sellers"
  | "clientHomes"
  | "community";

const TABS: { id: PortalTab; label: string; icon: typeof Calculator }[] = [
  { id: "tools", label: "My Tools", icon: Calculator },
  { id: "listings", label: "My Listings", icon: Building2 },
  { id: "buyers", label: "My Buyers", icon: Users },
  { id: "sellers", label: "My Sellers", icon: Home },
  { id: "clientHomes", label: "Client Homes", icon: KeyRound },
  { id: "community", label: "Community", icon: MessagesSquare },
];

export function BrokerPortal() {
  const { user, isLoggedIn } = useAuth();
  const [tab, setTab] = useState<PortalTab>("tools");

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
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-1">
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Story Pro · {user.name}
          </p>
          <h1 className="font-serif text-3xl font-bold text-ink md:text-4xl">
            Story Pro
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            List properties, manage clients, capture leads, and run the numbers —
            your agent workspace.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Broker portal sections"
          className="mt-6 flex gap-2 overflow-x-auto border-b border-hairline pb-px"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={cn(
                  "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "border-[var(--accent)] text-ink"
                    : "border-transparent text-[var(--muted)] hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
          <Link
            href={`/agents/${DEMO_AGENT.id}`}
            className="-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-[var(--muted)] transition-colors hover:text-ink"
          >
            <UserRound className="h-4 w-4" />
            Public Profile
          </Link>
        </div>

        <div className="mt-8">
          {tab === "tools" && <MyToolsView />}
          {tab === "listings" && <MyListingsView />}
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
