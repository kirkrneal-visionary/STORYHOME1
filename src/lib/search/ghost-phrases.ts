/**
 * Homepage idle examples — one config for desktop and narrow screens.
 * County fields are rotation metadata only. They never write the query,
 * select a county filter, or change the user's location.
 */

export type GhostCounty =
  | "polk"
  | "trinity"
  | "angelina"
  | "tyler"
  | "san_jacinto"
  | "liberty"
  | "walker";

export type GhostPhrase = {
  id: string;
  county: GhostCounty;
  full: string;
  narrow: string;
};

export const GHOST_COUNTIES: GhostCounty[] = [
  "polk",
  "trinity",
  "angelina",
  "tyler",
  "san_jacinto",
  "liberty",
  "walker",
];

export const GHOST_STATIC_HINT = {
  full: "Search homes or describe what you want…",
  narrow: "Search homes or describe what you want…",
} as const;

/** Rent has no inventory — do not animate Buy examples under Rent. */
export const GHOST_RENT_HINT = {
  full: "Rentals are not listed yet",
  narrow: "Rentals are not listed yet",
} as const;

export const GHOST_PHRASES: GhostPhrase[] = [
  {
    id: "polk-corrigan-acres",
    county: "polk",
    full: "A little more land in Corrigan—5 acres or more…",
    narrow: "5+ acres in Corrigan",
  },
  {
    id: "polk-onalaska-beds",
    county: "polk",
    full: "Three bedrooms in Onalaska, under $350k…",
    narrow: "3 bed in Onalaska under $350k",
  },
  {
    id: "trinity-groveton-acres",
    county: "trinity",
    full: "Room to spread out—10+ acres in Groveton…",
    narrow: "10+ acres in Groveton",
  },
  {
    id: "trinity-garage",
    county: "trinity",
    full: "A home in Trinity with a garage under $300k…",
    narrow: "Trinity home with garage under $300k",
  },
  {
    id: "angelina-lufkin-pool",
    county: "angelina",
    full: "A pool at home in Lufkin, under $450k…",
    narrow: "Lufkin pool under $450k",
  },
  {
    id: "angelina-diboll-beds",
    county: "angelina",
    full: "Three bedrooms and two baths in Diboll…",
    narrow: "3 bed 2 bath in Diboll",
  },
  {
    id: "tyler-woodville-hoa",
    county: "tyler",
    full: "A home in Woodville without an HOA…",
    narrow: "Woodville home, no HOA",
  },
  {
    id: "tyler-colmesneil-acres",
    county: "tyler",
    full: "More land with the house—5+ acres in Colmesneil…",
    narrow: "5+ acres in Colmesneil",
  },
  {
    id: "san-jacinto-coldspring",
    county: "san_jacinto",
    full: "A Coldspring home on at least 2 acres…",
    narrow: "Coldspring, 2+ acres",
  },
  {
    id: "san-jacinto-shepherd",
    county: "san_jacinto",
    full: "Shepherd homes with a garage, under $325k…",
    narrow: "Shepherd garage under $325k",
  },
  {
    id: "liberty-dayton-beds",
    county: "liberty",
    full: "Four bedrooms in Dayton, no more than $400k…",
    narrow: "4 bed in Dayton under $400k",
  },
  {
    id: "liberty-office",
    county: "liberty",
    full: "A home in Liberty with a separate office…",
    narrow: "Liberty home with office",
  },
  {
    id: "walker-huntsville-hoa",
    county: "walker",
    full: "Three bedrooms and no HOA in Huntsville…",
    narrow: "3 bed, no HOA in Huntsville",
  },
  {
    id: "walker-new-waverly",
    county: "walker",
    full: "Somewhere with 5–15 acres in New Waverly…",
    narrow: "5–15 acres in New Waverly",
  },
];

export const GHOST_PHRASES_NARROW = GHOST_PHRASES.map((row) => row.narrow);

function phrasesByCounty(): Record<GhostCounty, GhostPhrase[]> {
  const out = Object.fromEntries(
    GHOST_COUNTIES.map((county) => [county, [] as GhostPhrase[]]),
  ) as Record<GhostCounty, GhostPhrase[]>;
  for (const phrase of GHOST_PHRASES) {
    out[phrase.county].push(phrase);
  }
  return out;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/**
 * One county, then another. Every county gets a turn before any county repeats.
 * Alternate the two examples inside each county. Reshuffle after a full pass
 * and swap if the next pass would start on the county that just finished.
 */
export function createGhostRotation(random: () => number = Math.random) {
  const grouped = phrasesByCounty();
  let pass = shuffle(GHOST_COUNTIES, random);
  let index = 0;
  const cursor: Record<GhostCounty, number> = {
    polk: 0,
    trinity: 0,
    angelina: 0,
    tyler: 0,
    san_jacinto: 0,
    liberty: 0,
    walker: 0,
  };
  let lastId: string | null = null;

  function take(): GhostPhrase {
    if (index >= pass.length) {
      const previousLast = pass[pass.length - 1];
      pass = shuffle(GHOST_COUNTIES, random);
      if (pass[0] === previousLast && pass.length > 1) {
        const swapAt = pass.findIndex((county, i) => i > 0 && county !== previousLast);
        if (swapAt > 0) {
          [pass[0], pass[swapAt]] = [pass[swapAt], pass[0]];
        }
      }
      index = 0;
    }

    const county = pass[index];
    index += 1;
    const examples = grouped[county];
    let pick = cursor[county] % examples.length;
    let phrase = examples[pick];
    if (phrase.id === lastId) {
      pick = (pick + 1) % examples.length;
      phrase = examples[pick];
    }
    cursor[county] = pick + 1;
    lastId = phrase.id;
    return phrase;
  }

  return { next: take };
}
