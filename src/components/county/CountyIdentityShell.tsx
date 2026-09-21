import Link from "next/link";
import {
  countyMarketplacePath,
  type PublicCountyIdentity,
} from "@/lib/geo/county-route";

type CountyIdentityShellProps = {
  identity: Pick<PublicCountyIdentity, "canonicalName" | "state">;
};

export function CountyIdentityShell({ identity }: CountyIdentityShellProps) {
  const marketplaceHref = countyMarketplacePath(identity);

  return (
    <main
      data-county-identity=""
      className="min-h-dvh pb-[var(--story-bottom-clearance)] pt-[var(--story-safe-top)]"
    >
      <div
        className="relative h-20 max-h-[22vh] overflow-hidden md:h-28"
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

        <div className="mt-4 max-w-xl pb-16 md:mt-8">
          <h1 className="type-hero text-balance tracking-[-0.02em] text-ink md:text-5xl">
            {identity.canonicalName}
          </h1>
          <p className="mt-2 text-base text-[var(--muted)]">Texas</p>
          <p className="mt-6 text-base leading-relaxed text-ink/85">
            Explore property across {identity.canonicalName}.
          </p>
          <Link
            href={marketplaceHref}
            className="story-press mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-gold px-6 text-sm font-bold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Explore Properties
          </Link>
        </div>
      </div>
    </main>
  );
}
