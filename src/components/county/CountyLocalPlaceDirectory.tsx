import type { PublicCountyPlace } from "@/lib/geo/county-places";

type CountyLocalPlaceDirectoryProps = {
  countyName: string;
  places: readonly PublicCountyPlace[];
};

export function CountyLocalPlaceDirectory({
  countyName,
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
        {places.map((place) => (
          <li key={place.id} className="py-2">
            <p className="text-lg font-semibold tracking-[-0.01em] text-ink">
              {place.displayName}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
