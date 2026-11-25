/**
 * County cover and courthouse pictures for the County Stories row and county popup.
 * An image may be added only with its source and usage rights recorded in `source`.
 * Counties without one keep the gradient cover and an initial badge; nothing is invented.
 */
import { SERVICE_COUNTIES } from "@/lib/markets";
import { isCountyStoryCountyActive } from "@/lib/county-stories/activation";
import { countySlugFromName, publicCountyPath } from "@/lib/geo/county-route";

export type CountyStoryImage = {
  src: string;
  alt: string;
  source: string;
};

export type CountyStoryCountyVisual = {
  fips: string;
  name: string;
  shortName: string;
  slug: string;
  href: string;
  cover: CountyStoryImage | null;
  courthouse: CountyStoryImage | null;
  glow: { x: number; y: number };
};

const COUNTY_IMAGES: Record<
  string,
  { cover?: CountyStoryImage; courthouse?: CountyStoryImage }
> = {};

const GLOWS = [
  { x: 18, y: 30 },
  { x: 78, y: 22 },
  { x: 30, y: 68 },
  { x: 72, y: 58 },
  { x: 24, y: 48 },
  { x: 84, y: 38 },
  { x: 46, y: 26 },
] as const;

export const COUNTY_STORY_COUNTIES: CountyStoryCountyVisual[] = SERVICE_COUNTIES.filter(
  (county) => isCountyStoryCountyActive(county.fips),
).flatMap((county, index) => {
  const slug = countySlugFromName(county.name);
  if (!slug) return [];
  const images = COUNTY_IMAGES[county.fips] ?? {};
  return [
    {
      fips: county.fips,
      name: county.name,
      shortName: county.name.replace(/\s+County$/i, ""),
      slug,
      href: publicCountyPath(slug),
      cover: images.cover ?? null,
      courthouse: images.courthouse ?? null,
      glow: GLOWS[index % GLOWS.length]!,
    },
  ];
});
