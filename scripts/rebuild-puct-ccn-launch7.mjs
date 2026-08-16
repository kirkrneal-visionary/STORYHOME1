#!/usr/bin/env node
/**
 * Rebuild launch-7 PUCT CCN clip from official FTP shapefiles.
 * Requires: python3 + pyshp + pyproj + shapely
 *
 *   node scripts/rebuild-puct-ccn-launch7.mjs
 */
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const tmp = "/tmp/puct-ccn-rebuild";
mkdirSync(tmp, { recursive: true });

const py = `
import json
from pathlib import Path
import urllib.request
import zipfile
import shapefile
from pyproj import Transformer
from shapely.geometry import shape, mapping, box
from shapely.ops import transform as shp_transform, unary_union

TMP = Path(${JSON.stringify(tmp)})
OUT = Path(${JSON.stringify(join(root, "data/shi/puct-ccn-launch7.json"))})
WATER_URL = "https://ftp.puc.texas.gov/public/puct-info/industry/water/utilities/PUCT_CCN_WATER_TSMS.zip"
SEWER_URL = "https://ftp.puc.texas.gov/public/puct-info/industry/water/utilities/PUCT_CCN_SEWER_TSMS.zip"

COUNTIES = {
  '48373': (-95.2, 30.49, -94.54, 31.15),
  '48005': (-95.01, 31.03, -94.13, 31.53),
  '48455': (-95.43, 30.82, -94.84, 31.39),
  '48457': (-94.66, 30.53, -94.05, 31.06),
  '48407': (-95.36, 30.32, -94.83, 30.91),
  '48291': (-95.17, 29.89, -94.44, 30.49),
  '48471': (-95.86, 30.5, -95.33, 31.06),
}
xs=[b[0] for b in COUNTIES.values()]+[b[2] for b in COUNTIES.values()]
ys=[b[1] for b in COUNTIES.values()]+[b[3] for b in COUNTIES.values()]
union = box(min(xs)-0.05, min(ys)-0.05, max(xs)+0.05, max(ys)+0.05)

fwd = Transformer.from_crs(
  '+proj=lcc +lat_1=27.416666666666668 +lat_2=34.916666666666664 +lat_0=31.166666666666668 +lon_0=-100 +x_0=1000000 +y_0=1000000 +datum=NAD83 +units=m +no_defs',
  'EPSG:4326', always_xy=True)

def project_geom(geom):
  return shp_transform(lambda x,y: fwd.transform(x,y), geom)

def load(kind, shp):
  r = shapefile.Reader(str(shp))
  fields = [f[0] for f in r.fields[1:]]
  out=[]
  for sr in r.iterShapeRecords():
    if sr.shape.shapeTypeName not in ('POLYGON','POLYGONZ','POLYGONM'):
      continue
    rec = dict(zip(fields, sr.record))
    try:
      geom = project_geom(shape(sr.shape.__geo_interface__))
      geom = geom.simplify(0.00015, preserve_topology=True).intersection(union)
    except Exception:
      continue
    if geom.is_empty: continue
    if geom.geom_type == 'GeometryCollection':
      polys=[p for p in geom.geoms if p.geom_type in ('Polygon','MultiPolygon')]
      if not polys: continue
      geom = unary_union(polys)
    if geom.geom_type not in ('Polygon','MultiPolygon'): continue
    out.append({'properties':{
      'kind': kind,
      'ccnNo': (str(rec.get('CCN_NO') or '').strip() or None),
      'utility': (str(rec.get('UTILITY') or '').strip() or None),
      'dba': (str(rec.get('DBA_NAME') or '').strip() or None),
      'ccnType': (str(rec.get('CCN_TYPE') or '').strip() or None),
      'status': (str(rec.get('STATUS') or '').strip() or None),
      'county': (str(rec.get('COUNTY') or '').strip() or None),
    }, 'geometry': mapping(geom)})
  return out

TMP.mkdir(parents=True, exist_ok=True)
for name,url in [('water',WATER_URL),('sewer',SEWER_URL)]:
  zpath = TMP/f'{name}.zip'
  print('download', url)
  urllib.request.urlretrieve(url, zpath)
  with zipfile.ZipFile(zpath) as z: z.extractall(TMP)

water = load('water', TMP/'PUCT_CCN_WATER_TSMS_for_GIS'/'PUCT_CCN_WATER_TSMS')
sewer = load('sewer', TMP/'PUCT_CCN_SEWER_TSMS_for_GIS'/'PUCT_CCN_SEWER_TSMS')
payload = {
  'version': 'puct-ccn-launch7-v1',
  'source': 'PUCT CCN Water/Sewer TSMS shapefiles (official FTP)',
  'sourceUrl': 'https://ftp.puc.texas.gov/public/puct-info/industry/water/utilities/',
  'asOf': '2026-07-14',
  'honesty': 'Certificated service area from PUCT — not a guarantee that taps/sewer are connected or available tomorrow. Municipalities may serve without a CCN.',
  'features': water+sewer,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, separators=(',',':')))
print('wrote', OUT, 'features', len(payload['features']), 'bytes', OUT.stat().st_size)
`;

const r = spawnSync("python3", ["-c", py], { stdio: "inherit" });
process.exit(r.status ?? 1);
