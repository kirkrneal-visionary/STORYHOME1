/**
 * Research map engine — Mapbox GL draws the world; Story Home owns the land.
 *
 * Founder Interpreter (build process only — not a product):
 * - Intent: 3D should feel like standing on the land (sky + horizon), without
 *   renting Mapbox streets, satellite, or terrain tiles.
 * - UX: When a public token is set, Research uses Mapbox fog/lights. Otherwise
 *   MapLibre stays the canvas. Same CAD, USGS imagery, 3DEP mesh either way.
 * - Data meaning: A map *load* may bill Mapbox. Tile bytes stay ours.
 *   Visual atmosphere never changes Archie / 3DEP numbers.
 */

export const RESEARCH_MAPBOX_TOKEN_ENV = "NEXT_PUBLIC_MAPBOX_TOKEN";
export const RESEARCH_MAPBOX_SKY_BLUE = "#3d86cf";
export const RESEARCH_MAPBOX_SKY_HAZE = "#e8f2fb";

export type ResearchMapEngine = "mapbox" | "maplibre";

export type EnvLike = {
  NEXT_PUBLIC_MAPBOX_TOKEN?: string;
  [key: string]: string | undefined;
};

export function researchMapboxToken(env: EnvLike = process.env): string | null {
  const raw = env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() || "";
  if (!raw.startsWith("pk.")) return null;
  return raw;
}

export function researchMapEngine(env: EnvLike = process.env): ResearchMapEngine {
  return researchMapboxToken(env) ? "mapbox" : "maplibre";
}

export function isAllowedMapboxTelemetryUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname === "events.mapbox.com") return true;
    if (u.hostname !== "api.mapbox.com") return false;
    return (
      u.pathname.startsWith("/map-sessions") ||
      u.pathname.startsWith("/events") ||
      u.pathname.startsWith("/metrics")
    );
  } catch {
    return false;
  }
}

/** Mapbox-hosted streets / satellite / DEM / styles — never load these. */
export function isForbiddenMapboxDataUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("mapbox://")) return true;
  if (!/mapbox\.com/i.test(url)) return false;
  return !isAllowedMapboxTelemetryUrl(url);
}

export function storyMapTransformRequest(url: string): { url: string } {
  if (isForbiddenMapboxDataUrl(url)) {
    return { url: "data:application/json,{}" };
  }
  if (!url || /^https?:\/\//i.test(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return { url };
  }
  if (url.startsWith("/")) {
    if (typeof window !== "undefined" && window.location?.origin) {
      return { url: `${window.location.origin}${url}` };
    }
  }
  return { url };
}

export type ResearchMapboxFog = {
  range: [number, number];
  color: string;
  "high-color": string;
  "space-color": string;
  "horizon-blend": number;
  "star-intensity": number;
};

/**
 * Daytime air. Pitch opens the horizon; never a night sky with stars.
 */
export function researchMapboxFogForPitch(pitch: number): ResearchMapboxFog {
  const lookingOut = Math.min(1, Math.max(0, (pitch - 8) / 55));
  return {
    range: [0.6 + lookingOut * 0.4, 6 + lookingOut * 6],
    color: RESEARCH_MAPBOX_SKY_HAZE,
    "high-color": RESEARCH_MAPBOX_SKY_BLUE,
    "space-color": "#5aa0dc",
    "horizon-blend": 0.06 + lookingOut * 0.08,
    "star-intensity": 0,
  };
}

export const RESEARCH_MAPBOX_LIGHTS = [
  {
    id: "ambient",
    type: "ambient" as const,
    properties: {
      color: "#d7e6f5",
      intensity: 0.42,
    },
  },
  {
    id: "sun",
    type: "directional" as const,
    properties: {
      color: "#fff4e4",
      intensity: 0.52,
      direction: [198, 48],
      "cast-shadows": true,
      "shadow-intensity": 0.28,
    },
  },
];

export type AtmosphereMap = {
  getPitch: () => number;
  setFog?: (fog: ResearchMapboxFog | null) => unknown;
  setSky?: (sky: Record<string, unknown>) => unknown;
  setLights?: (lights: typeof RESEARCH_MAPBOX_LIGHTS | null) => unknown;
};

export function applyResearchAtmosphere(
  map: AtmosphereMap,
  opts: {
    engine: ResearchMapEngine;
    on: boolean;
    maplibreSky?: (pitch: number) => Record<string, unknown>;
    maplibreSkyOff?: Record<string, unknown>;
  },
): void {
  if (opts.engine === "mapbox") {
    try {
      map.setFog?.(opts.on ? researchMapboxFogForPitch(map.getPitch()) : null);
    } catch {
      /* fog optional while style loads */
    }
    try {
      map.setLights?.(opts.on ? RESEARCH_MAPBOX_LIGHTS : null);
    } catch {
      /* lights optional on older styles */
    }
    return;
  }
  try {
    const sky = opts.on
      ? opts.maplibreSky?.(map.getPitch())
      : opts.maplibreSkyOff;
    if (sky) map.setSky?.(sky);
  } catch {
    /* sky optional while style loads */
  }
}

export function styleJsonForResearchEngine<T extends Record<string, unknown>>(
  style: T,
  engine: ResearchMapEngine,
): T {
  if (engine !== "mapbox") return style;
  const next = { ...style };
  delete next.sky;
  return next;
}

export const RESEARCH_MAP_ENGINE_COPY = {
  mapbox:
    "3D engine is Mapbox. Streets, imagery, parcels, and elevation tiles stay Story Home’s.",
  maplibre:
    "3D engine is MapLibre until a public Mapbox token is set. Tiles stay Story Home’s either way.",
} as const;
