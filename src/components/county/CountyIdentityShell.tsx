import type { ReactNode } from "react";
import Link from "next/link";
import {
  countyMarketplacePath,
  type PublicCountyIdentity,
} from "@/lib/geo/county-route";

type CountyIdentityShellProps = {
  identity: Pick<PublicCountyIdentity, "canonicalName" | "state">;
  children?: ReactNode;
};

export function CountyIdentityShell({
  identity,
  children,
}: CountyIdentityShellProps) {
  const marketplaceHref = countyMarketplacePath(identity);

  return (
    <main
      data-county-identity=""
      className="min-h-dvh pb-[var(--story-bottom-clearance)] pt-[var(--story-safe-top)]"
    >
      <div
        className="relative hidden h-20 max-h-[22vh] overflow-hidden [@media(min-height:500px)]:block md:h-28"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[var(--env-1)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(245,183,30,0.18),transparent_48%),radial-gradient(circle_at_88%_0%,rgba(18,63,56,0.4),transparent_42%),linear-gradient(180deg,transparent_28%,var(--background)_100%)]" />
      </div>

      <div className="relative z-[1] mx-auto max-w-5xl px-4 md:px-8">
        <nav aria-label="Story Home">
          <ol className="flex flex-wrap items-center gap-x-2 text-sm">
            <li>
              <Link
                href="/"
                className="story-press inline-flex min-h-11 items-center font-medium text-[var(--muted)] hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Story Home
              </Link>
            </li>
            <li aria-hidden className="text-[var(--muted)]">
              /
            </li>
            <li
              aria-current="page"
              className="inline-flex min-h-11 items-center text-ink"
            >
              {identity.canonicalName}
            </li>
          </ol>
        </nav>

        <div className="mt-2 max-w-xl pb-10 max-[499px]:mt-0 md:mt-8">
          <h1 className="type-hero text-balance tracking-[-0.02em] text-ink md:text-5xl">
            {identity.canonicalName}
          </h1>
          <p className="mt-2 text-base text-[var(--muted)]">Texas</p>
          <p className="mt-4 text-base leading-relaxed text-ink/85 md:mt-6">
            Explore property across {identity.canonicalName}.
          </p>
          <Link
            href={marketplaceHref}
            className="story-press mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-gold px-6 text-sm font-bold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold md:mt-8"
          >
            Explore Properties
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
}
