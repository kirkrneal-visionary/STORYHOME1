#!/usr/bin/env python3
"""Apply the reviewed 22-place TIGER 2024 fixture. No network. Not a public API.

Source: Census TIGER/Line 2024 Texas Places (tl_2024_48_place), NAD83 to EPSG:4326.
Official shapefile parts are preserved. Polygon is normalized to MultiPolygon.
Statewide zip is not in the repo. Mapping is by reviewed GEOID, not place name.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "scripts/fixtures/p2b2b-local-place-boundaries.geojson"
RETRIEVED = "2026-09-21T17:43:00Z"
NORTH_CLEVELAND = "4851984"


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: p2b2b-apply-boundary-seed.py DATABASE")
    fc = json.loads(FIXTURE.read_text())
    feats = fc.get("features") or []
    if len(feats) != 22:
        raise SystemExit("fixture must contain exactly 22 places")
    bounds = []
    ids = []
    seen: set[str] = set()
    for feat in feats:
        p = feat["properties"]
        g = feat["geometry"]
        if p.get("geoid") == NORTH_CLEVELAND:
            raise SystemExit("North Cleveland must not be ingested")
        if g.get("type") != "MultiPolygon":
            raise SystemExit(f"{p['display_name']} is not MultiPolygon")
        if p["local_place_id"] in seen:
            raise SystemExit("duplicate uuid")
        seen.add(p["local_place_id"])
        geom = json.dumps(g, separators=(",", ":")).replace("'", "''")
        bounds.append(
            f"('{p['local_place_id']}'::uuid,ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON('{geom}'),4326)),"
            f"'{p['source']}','{p['source_vintage']}','{p['geoid']}','{RETRIEVED}'::timestamptz)"
        )
        ids.append(f"('{p['local_place_id']}'::uuid,'census_geoid','{p['geoid']}')")
        ids.append(f"('{p['local_place_id']}'::uuid,'gnis','{p['gnis']}')")
    sql = (
        "insert into public.local_place_external_ids "
        "(local_place_id, authority, external_id) values\n"
        + ",\n".join(ids)
        + ";\ninsert into public.local_place_boundaries "
        "(local_place_id, geom, source, source_vintage, source_geoid, retrieved_at) values\n"
        + ",\n".join(bounds)
        + ";\ndo $$\nbegin\n"
        "  if exists (select 1 from public.local_place_boundaries where not ST_IsValid(geom)) then\n"
        "    raise exception 'invalid_geometry';\n"
        "  end if;\n"
        "end $$;\n"
    )
    # stdin, not argv: 22 polygons exceed ARG_MAX for psql -c.
    run = subprocess.run(
        ["sudo", "-u", "postgres", "psql", "-v", "ON_ERROR_STOP=1", "-d", sys.argv[1], "-f", "-"],
        input=sql,
        capture_output=True,
        text=True,
    )
    if run.returncode != 0:
        raise SystemExit(run.stderr or run.stdout)
    print("p2b2b-boundary-seed: applied")


if __name__ == "__main__":
    main()
