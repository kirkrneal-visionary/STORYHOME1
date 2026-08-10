import { getServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Parcel-grid vector tiles (MVT) served from our own PostGIS via the
 * `parcels_mvt` function. MapLibre requests /api/parcels/{z}/{x}/{y}. Empty
 * tiles return 204 so the map simply shows nothing there.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await params;
  const zi = Number(z);
  const xi = Number(x);
  const yi = Number(y.replace(/\.(pbf|mvt)$/, ""));
  if (![zi, xi, yi].every(Number.isFinite)) {
    return new Response("bad tile", { status: 400 });
  }

  const supabase = await getServerSupabase();
  if (!supabase) return new Response(null, { status: 204 });

  const { data, error } = await supabase.rpc("parcels_mvt", {
    z: zi,
    x: xi,
    y: yi,
  });
  if (error || data == null) return new Response(null, { status: 204 });

  // PostgREST returns a scalar bytea as a "\x…"-prefixed hex string.
  let buf: Buffer;
  if (typeof data === "string") {
    const hex = data.startsWith("\\x") ? data.slice(2) : data;
    buf = Buffer.from(hex, "hex");
  } else {
    buf = Buffer.from(data as ArrayBuffer);
  }
  if (buf.length === 0) return new Response(null, { status: 204 });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/x-protobuf",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
