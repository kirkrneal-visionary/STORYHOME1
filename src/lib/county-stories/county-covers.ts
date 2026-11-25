/**
 * County cover and courthouse pictures for the County Stories row and county popup.
 * Each picture is a crop of a freely licensed original. Its creator, source page, license
 * and original size are recorded here; the popup credit line and the Photo credits page
 * read them from here. Counties without a picture keep the gradient cover and an initial
 * badge; nothing is invented.
 */
import { SERVICE_COUNTIES } from "@/lib/markets";
import { isCountyStoryCountyActive } from "@/lib/county-stories/activation";
import { countySlugFromName, publicCountyPath } from "@/lib/geo/county-route";

export const COUNTY_PHOTO_CREDITS_PATH = "/county-stories/photo-credits";

export type CountyPictureLicense = "CC BY 2.0" | "CC BY 4.0" | "CC BY-SA 4.0" | "CC0" | "Public domain";

const LICENSE_URLS: Record<CountyPictureLicense, string | null> = {
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/",
  "Public domain": null,
};

export type CountyPictureCredit = {
  /** Title of the original on its source page. */
  title: string;
  creator: string;
  site: "Wikimedia Commons" | "Flickr";
  sourceUrl: string;
  license: CountyPictureLicense;
  /** Pixel size of the original file the crops were cut from. */
  original: { width: number; height: number };
  /** Archive that holds a public-domain original. */
  courtesy?: string;
};

export type CountyPictureFile = { src: string; srcSet: string };

export type CountyStoryCoverPicture = {
  /** 4:5 crop for the homepage tile. */
  tile: CountyPictureFile;
  /** 16:9 crop for the top of the county popup. */
  wide: CountyPictureFile;
  alt: string;
  credit: CountyPictureCredit;
};

export type CountyStoryCourthousePicture = {
  /** Square crop for the round popup badge. */
  badge: CountyPictureFile;
  alt: string;
  credit: CountyPictureCredit;
};

export type CountyStoryCountyVisual = {
  fips: string;
  name: string;
  shortName: string;
  slug: string;
  href: string;
  cover: CountyStoryCoverPicture | null;
  courthouse: CountyStoryCourthousePicture | null;
  glow: { x: number; y: number };
};

const PICTURE_DIR = "/county-stories/pictures";

function pictureFile(name: string, widths: readonly number[]): CountyPictureFile {
  return {
    src: `${PICTURE_DIR}/${name}-${widths[0]}.webp`,
    srcSet: widths.map((width) => `${PICTURE_DIR}/${name}-${width}.webp ${width}w`).join(", "),
  };
}

function cover(slug: string, alt: string, credit: CountyPictureCredit): CountyStoryCoverPicture {
  return {
    tile: pictureFile(`${slug}-cover`, [560, 840]),
    wide: pictureFile(`${slug}-cover-wide`, [736, 1104]),
    alt,
    credit,
  };
}

function courthouse(slug: string, alt: string, credit: CountyPictureCredit): CountyStoryCourthousePicture {
  return { badge: pictureFile(`${slug}-courthouse`, [112, 168]), alt, credit };
}

const COMMONS = "https://commons.wikimedia.org/wiki/File:";

const COUNTY_IMAGES: Record<
  string,
  { cover?: CountyStoryCoverPicture; courthouse?: CountyStoryCourthousePicture }
> = {
  "48373": {
    cover: cover("polk", "Kayakers on Lake Livingston at Lake Livingston State Park", {
      title: "Lake Livingston State Park Canoeing",
      creator: "Larry D. Moore",
      site: "Wikimedia Commons",
      sourceUrl: `${COMMONS}Lake_Livingston_State_Park_Canoeing.jpg`,
      license: "CC BY 4.0",
      original: { width: 2667, height: 1500 },
    }),
    courthouse: courthouse("polk", "Polk County Courthouse in Livingston", {
      title: "Courthouse Polk County Texas",
      creator: "Jim Evans",
      site: "Wikimedia Commons",
      sourceUrl: `${COMMONS}Courthouse_Polk_County_Texas.jpg`,
      license: "CC BY-SA 4.0",
      original: { width: 2605, height: 1483 },
    }),
  },
  "48455": {
    cover: cover("trinity", "A kayaker below the railroad swing bridge over the Trinity River at Riverside", {
      title: "Kayaker and Swing Railroad Bridge over Trinity River, Riverside, Texas 1209081524",
      creator: "Patrick Feller",
      site: "Flickr",
      sourceUrl: "https://www.flickr.com/photos/32345848@N07/7967045618",
      license: "CC BY 2.0",
      original: { width: 3586, height: 2307 },
    }),
    courthouse: courthouse("trinity", "Trinity County Courthouse in Groveton", {
      title: "Trinity county tx courthouse 2015",
      creator: "Larry D. Moore",
      site: "Wikimedia Commons",
      sourceUrl: `${COMMONS}Trinity_county_tx_courthouse_2015.jpg`,
      license: "CC BY 4.0",
      original: { width: 2152, height: 1420 },
    }),
  },
  "48005": {
    cover: cover("angelina", "Railroad truss bridge over the Neches River", {
      title: "Through Truss Railroad Bridge over Neches River, west of US 59 1124111633 (6402593837)",
      creator: "Patrick Feller",
      site: "Wikimedia Commons",
      sourceUrl: `${COMMONS}Through_Truss_Railroad_Bridge_over_Neches_River,_west_of_US_59_1124111633_(6402593837).jpg`,
      license: "CC BY 2.0",
      original: { width: 2836, height: 1843 },
    }),
    courthouse: courthouse("angelina", "Angelina County Courthouse in Lufkin", {
      title: "Angelina County Courthouse, Lufkin, Texas 1708201604 (36514799203)",
      creator: "Patrick Feller",
      site: "Wikimedia Commons",
      sourceUrl: `${COMMONS}Angelina_County_Courthouse,_Lufkin,_Texas_1708201604_(36514799203).jpg`,
      license: "CC BY 2.0",
      original: { width: 6067, height: 4101 },
    }),
  },
  "48457": {
    cover: cover("tyler", "Pine savanna in the Big Thicket National Preserve, Hickory Creek Unit", {
      title: "Big Thicket National Preserve, Hickory Creek Unit, Tyler Co. TX",
      creator: "William L. Farr",
      site: "Wikimedia Commons",
      sourceUrl: `${COMMONS}Big_Thicket_National_Preserve,_Hickory_Creek_Unit,_Tyler_Co._TX.jpg`,
      license: "CC BY-SA 4.0",
      original: { width: 1800, height: 1200 },
    }),
    courthouse: courthouse("tyler", "Tyler County Courthouse in Woodville", {
      title: "Tyler county tx courthouse 2014",
      creator: "Larry D. Moore",
      site: "Wikimedia Commons",
      sourceUrl: `${COMMONS}Tyler_county_tx_courthouse_2014.jpg`,
      license: "CC BY 4.0",
      original: { width: 1820, height: 1456 },
    }),
  },
  "48407": {
    cover: cover("san-jacinto", "Boardwalk through the woods at Winters Bayou in Sam Houston National Forest", {
      title:
        "Winters Bayou Scenic Aera near the southeast end of the Lone Star Hiking Trail, Sam Houston National Forest",
      creator: "William L. Farr",
      site: "Wikimedia Commons",
      sourceUrl: `${COMMONS}Winters_Bayou_Scenic_Aera_near_the_southeast_end_of_the_Lone_Star_Hiking_Trail,_Sam_Houston_National_Forest.jpg`,
      license: "CC BY 4.0",
      original: { width: 1800, height: 1200 },
    }),
    courthouse: courthouse("san-jacinto", "San Jacinto County Courthouse in Coldspring", {
      title: "San jacinto tx county courthouse 2014",
      creator: "Larry D. Moore",
      site: "Wikimedia Commons",
      sourceUrl: `${COMMONS}San_jacinto_tx_county_courthouse_2014.jpg`,
      license: "CC BY 4.0",
      original: { width: 2179, height: 1453 },
    }),
  },
  "48291": {
    cover: cover("liberty", "Two horses in a pasture near Cleveland", {
      title: "Two horses stand amid lush surroundings near Cleveland in Liberty County, Texas LCCN2014633930",
      creator: "Carol M. Highsmith",
      site: "Wikimedia Commons",
      sourceUrl: `${COMMONS}Two_horses_stand_amid_lush_surroundings_near_Cleveland_in_Liberty_County,_Texas_LCCN2014633930.tif`,
      license: "Public domain",
      original: { width: 7360, height: 4912 },
      courtesy: "Carol M. Highsmith Archive, Library of Congress",
    }),
    courthouse: courthouse("liberty", "Liberty County Courthouse in Liberty", {
      title: "Liberty county tx courthouse 2014",
      creator: "Larry D. Moore",
      site: "Wikimedia Commons",
      sourceUrl: `${COMMONS}Liberty_county_tx_courthouse_2014.jpg`,
      license: "CC BY 4.0",
      original: { width: 2143, height: 1429 },
    }),
  },
  "48471": {
    cover: cover("walker", "Kayakers on Lake Raven at Huntsville State Park", {
      title: "Huntsville SP lake raven",
      creator: "Larry D. Moore",
      site: "Wikimedia Commons",
      sourceUrl: `${COMMONS}Huntsville_SP_lake_raven.jpg`,
      license: "CC BY 4.0",
      original: { width: 2176, height: 1450 },
    }),
    courthouse: courthouse("walker", "Walker County Courthouse in Huntsville", {
      title: "Walker County Courthouse Texas",
      creator: "Hvhappens",
      site: "Wikimedia Commons",
      sourceUrl: `${COMMONS}Walker_County_Courthouse_Texas.jpg`,
      license: "CC0",
      original: { width: 2232, height: 1604 },
    }),
  },
};

export function countyPictureLicenseUrl(license: CountyPictureLicense): string | null {
  return LICENSE_URLS[license];
}

/** Public-domain and CC0 pictures need no credit; they are still listed on the Photo credits page. */
export function countyPictureNeedsCredit(credit: CountyPictureCredit): boolean {
  return credit.license !== "Public domain" && credit.license !== "CC0";
}

export function countyPictureCreditLine(credit: CountyPictureCredit): string {
  const license = credit.license === "Public domain" ? "public domain" : credit.license;
  return `“${credit.title}” by ${credit.creator}, ${credit.site}, ${license}, cropped`;
}

/** Credits for the county popup: pictures that need credit, one entry per creator and license. */
export function countyPopupPhotoCredits(county: CountyStoryCountyVisual): CountyPictureCredit[] {
  const seen = new Set<string>();
  const credits: CountyPictureCredit[] = [];
  for (const picture of [county.cover, county.courthouse]) {
    if (!picture || !countyPictureNeedsCredit(picture.credit)) continue;
    const key = `${picture.credit.creator}\n${picture.credit.license}`;
    if (seen.has(key)) continue;
    seen.add(key);
    credits.push(picture.credit);
  }
  return credits;
}

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
