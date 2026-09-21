import Link from "next/link";
import type { PublicCountyPlace } from "@/lib/geo/county-places";
import { normalizeLocalPlaceKey } from "@/lib/geo/local-place-key";
import {
  publicLocalPlacePath,
  resolvePublicLocalPlace,
} from "@/lib/geo/local-place-route";

type CountyLocalPlaceDirectoryProps = {
  countyName: string;
  countySlug: string;
  places: readonly PublicCountyPlace[];
};

function activePlaceHref(
  countySlug: string,
  displayName: string,
): string | null {
  const resolved = resolvePublicLocalPlace(
    countySlug,
    normalizeLocalPlaceKey(displayName),
  );
  if (resolved.status === "ok") {
    return publicLocalPlacePath(
      resolved.identity.county.slug,
      resolved.identity.canonicalSlug,
    );
  }
  if (resolved.status === "redirect") return resolved.path;
  return null;
}

export function CountyLocalPlaceDirectory({
  countyName,
  countySlug,
  places,
}: CountyLocalPlaceDirectoryProps) {
  if (places.length === 0) return null;

  return (
    <section
      data-county-places=""
      aria-labelledby="county-places-heading"
      className="border-t border-hairline pt-8 pb-16"
    >
      <h2 id="county-places-heading" className="type-section text-ink">
        Places in {countyName}
      </h2>
      <ul className="mt-5 flex flex-col gap-1 md:mt-6 md:flex-row md:flex-wrap md:gap-x-12 md:gap-y-2">
        {places.map((place) => {
          const href = activePlaceHref(countySlug, place.displayName);
          return (
            <li key={place.id} className="py-2">
              {href ? (
                <Link
                  href={href}
                  className="story-press inline-flex min-h-11 items-center text-lg font-semibold tracking-[-0.01em] text-ink hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  {place.displayName}
                </Link>
              ) : (
                <p className="text-lg font-semibold tracking-[-0.01em] text-ink">
                  {place.displayName}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
