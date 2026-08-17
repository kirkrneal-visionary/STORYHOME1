/**
 * ARCHIE-NEIGHBORS N1 — thin CAD parcel neighbors (touches / near).
 *
 * Founder Interpreter (build process only — not a product):
 * - Intent: close the gap between “same owner within 1 mi (centroids)” and
 *   parcels that actually touch / nearly touch on owned CAD polygons.
 * - UX: Archie Nearby / findings can name adjoining CAD neighbors when RPC
 *   returns rows; empty → existing honesty (no invented boundaries).
 * - Data meaning: CAD MultiPolygon adjacency / small buffer — not survey,
 *   not ROW proof, not assemblage advice.
 * - Acceptance: launch-7 + Story Pro · soft-fail empty · armor · no MLS.
 */

export const PARCEL_NEIGHBORS_VERSION = "parcel-neighbors-n1" as const;

/** Default digitizing-gap buffer (meters). Not a survey tolerance claim. */
export const PARCEL_NEIGHBORS_BUFFER_M = 2;

export const PARCEL_NEIGHBORS_HONESTY =
  "CAD polygon neighbors (touches or within a small buffer). Calculated from owned county parcels — not a survey boundary, not proof of legal adjoining, not assemblage advice.";

export type ParcelNeighborRelation = "touches" | "near";

export type ParcelNeighborHit = {
  propId: string;
  source: string;
  countyFips: string | null;
  ownerName: string | null;
  cadOwnerId: string | null;
  legalAcreage: number | null;
  relation: ParcelNeighborRelation;
  distanceM: number | null;
  /** True when CAD owner id matches the subject (exact ownership link). */
  sameOwnerExact: boolean;
};

export type ParcelNeighborsResult = {
  version: typeof PARCEL_NEIGHBORS_VERSION;
  subjectPropId: string;
  subjectSource: string;
  neighbors: ParcelNeighborHit[];
  touchesCount: number;
  nearCount: number;
  sameOwnerExactCount: number;
  honesty: string;
  /** RPC unavailable / subject geom missing / soft-fail */
  available: boolean;
  note: string;
};

type RpcRow = {
  prop_id?: string;
  source?: string;
  county_fips?: string | null;
  owner_name?: string | null;
  cad_owner_id?: string | null;
  legal_acreage?: number | null;
  relation?: string;
  distance_m?: number | null;
};

function asRelation(raw: string | undefined): ParcelNeighborRelation {
  return raw === "touches" ? "touches" : "near";
}

/**
 * Call PostGIS parcel_neighbors via the authenticated Supabase client.
 * Soft-fails to available:false + empty list — never invents neighbors.
 */
export async function fetchParcelNeighbors(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }> };
  propId: string;
  source: string;
  subjectCadOwnerId?: string | null;
  bufferM?: number;
  limit?: number;
}): Promise<ParcelNeighborsResult> {
  const propId = opts.propId.trim();
  const source = opts.source.trim();
  const base: ParcelNeighborsResult = {
    version: PARCEL_NEIGHBORS_VERSION,
    subjectPropId: propId,
    subjectSource: source,
    neighbors: [],
    touchesCount: 0,
    nearCount: 0,
    sameOwnerExactCount: 0,
    honesty: PARCEL_NEIGHBORS_HONESTY,
    available: false,
    note: "Neighbors unavailable.",
  };

  if (!propId || !source) {
    return { ...base, note: "propId and source required." };
  }

  try {
    const { data, error } = await opts.supabase.rpc("parcel_neighbors", {
      p_prop_id: propId,
      p_source: source,
      p_buffer_m: opts.bufferM ?? PARCEL_NEIGHBORS_BUFFER_M,
      p_limit: opts.limit ?? 24,
    });

    if (error) {
      return {
        ...base,
        note: "PostGIS neighbors RPC unavailable — Archie will not invent adjoining boundaries.",
      };
    }

    const subjectOwner = (opts.subjectCadOwnerId ?? "").trim();
    const rows = Array.isArray(data) ? (data as RpcRow[]) : [];
    const neighbors: ParcelNeighborHit[] = [];

    for (const r of rows) {
      const nProp = String(r.prop_id ?? "").trim();
      const nSource = String(r.source ?? "").trim();
      if (!nProp || !nSource) continue;
      const cadOwnerId = r.cad_owner_id != null ? String(r.cad_owner_id) : null;
      const sameOwnerExact =
        Boolean(subjectOwner) &&
        cadOwnerId != null &&
        subjectOwner === cadOwnerId.trim();
      const dist =
        r.distance_m != null && Number.isFinite(Number(r.distance_m))
          ? Number(r.distance_m)
          : null;
      neighbors.push({
        propId: nProp,
        source: nSource,
        countyFips: r.county_fips != null ? String(r.county_fips) : null,
        ownerName: r.owner_name != null ? String(r.owner_name) : null,
        cadOwnerId,
        legalAcreage:
          r.legal_acreage != null && Number.isFinite(Number(r.legal_acreage))
            ? Number(r.legal_acreage)
            : null,
        relation: asRelation(r.relation),
        distanceM: dist,
        sameOwnerExact,
      });
    }

    const touchesCount = neighbors.filter((n) => n.relation === "touches").length;
    const nearCount = neighbors.filter((n) => n.relation === "near").length;
    const sameOwnerExactCount = neighbors.filter((n) => n.sameOwnerExact).length;

    return {
      version: PARCEL_NEIGHBORS_VERSION,
      subjectPropId: propId,
      subjectSource: source,
      neighbors,
      touchesCount,
      nearCount,
      sameOwnerExactCount,
      honesty: PARCEL_NEIGHBORS_HONESTY,
      available: true,
      note:
        neighbors.length === 0
          ? "No CAD polygon neighbors within the small buffer — not a claim that the parcel is isolated."
          : PARCEL_NEIGHBORS_HONESTY,
    };
  } catch {
    return {
      ...base,
      note: "Neighbors lookup failed — Archie will not invent adjoining boundaries.",
    };
  }
}

/** Pure helper for armor / Node — classify same-owner adjoining from hits. */
export function sameOwnerAdjoining(neighbors: ParcelNeighborHit[]): {
  touches: ParcelNeighborHit[];
  near: ParcelNeighborHit[];
} {
  return {
    touches: neighbors.filter((n) => n.sameOwnerExact && n.relation === "touches"),
    near: neighbors.filter((n) => n.sameOwnerExact && n.relation === "near"),
  };
}
