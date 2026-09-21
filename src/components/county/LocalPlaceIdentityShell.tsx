import Link from "next/link";
import {
  localPlaceMarketplacePath,
  type PublicLocalPlaceIdentity,
} from "@/lib/geo/local-place-route";
import { publicCountyPath } from "@/lib/geo/county-route";

type LocalPlaceIdentityShellProps = {
  identity: PublicLocalPlaceIdentity;
};

export function LocalPlaceIdentityShell({
  identity,
}: LocalPlaceIdentityShellProps) {
  const countyHref = publicCountyPath(identity.county.slug);
  const marketplaceHref = localPlaceMarketplacePath(identity);

  return (
    <main
      data-local-place-identity=""
      className="min-h-dvh pb-[var(--story-bottom-clearance)] pt-[var(--story-safe-top)]"
    >
      <div
        className="relative hidden h-14 max-h-[14vh] overflow-hidden [@media(min-height:500px)]:block md:h-16"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[var(--env-1)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_80%,rgba(245,183,30,0.16),transparent_42%),linear-gradient(180deg,transparent_8%,var(--background)_100%)]" />
      </div>

      <div className="relative z-[1] mx-auto max-w-xl px-4 md:px-8">
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
            <li>
              <Link
                href={countyHref}
                className="story-press inline-flex min-h-11 items-center font-medium text-[var(--muted)] hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                {identity.county.canonicalName}
              </Link>
            </li>
            <li aria-hidden className="text-[var(--muted)]">
              /
            </li>
            <li
              aria-current="page"
              className="inline-flex min-h-11 items-center text-ink"
            >
              {identity.displayName}
            </li>
          </ol>
        </nav>

        <div className="mt-2 pb-16 max-[499px]:mt-0 [@media(max-height:499px)]:pb-8 md:mt-6">
          <h1 className="type-hero text-balance tracking-[-0.02em] text-ink">
            {identity.displayName}
          </h1>
          <p className="mt-2 text-base text-[var(--muted)] [@media(max-height:499px)]:mt-1">
            <Link
              href={countyHref}
              className="story-press inline-flex min-h-11 items-center hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {identity.county.canonicalName}
            </Link>
            , {identity.county.state}
          </p>
          <p className="mt-4 text-base leading-relaxed text-ink/85 [@media(max-height:499px)]:mt-2 [@media(max-height:499px)]:hidden">
            Explore property in {identity.displayName}.
          </p>
          <Link
            href={marketplaceHref}
            className="story-press mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-gold px-6 text-sm font-bold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold [@media(max-height:499px)]:mt-3 md:mt-7"
          >
            Explore Properties
          </Link>
        </div>
      </div>
    </main>
  );
}
