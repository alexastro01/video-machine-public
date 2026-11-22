import { readFileSync, writeFileSync } from "node:fs";
import clipping, {
  type MultiPolygon,
  type Polygon,
  type Pair,
} from "polygon-clipping";

// Geographic silhouettes stay source-based. Relief is schematic, not DEM data.
const features = JSON.parse(
  readFileSync("channel/geography/countries-50m.geojson", "utf8"),
).features as {
  properties: { ADMIN: string };
  geometry: { type: string; coordinates: MultiPolygon };
}[];
const republicSource = features.find((f) => f.properties.ADMIN === "Ireland")!
  .geometry.coordinates;
const uk = features.find((f) => f.properties.ADMIN === "United Kingdom")!;
function contains(ring: Pair[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = ring[i],
      [c, d] = ring[j];
    if (b > y !== d > y && x < ((c - a) * (y - b)) / (d - b) + a)
      inside = !inside;
  }
  return inside;
}
const northSource = uk.geometry.coordinates.find((p) =>
  contains(p[0], -5.93, 54.6),
);
if (!northSource) throw new Error("Northern Ireland source polygon is missing");
const project = ([lon, lat]: Pair): Pair => [
  +(1.25 * (lon + 8.05)).toFixed(6),
  +(2.1 * (53.45 - lat)).toFixed(6),
];
const projectPolygon = (p: Polygon): Polygon => p.map((r) => r.map(project));
const republic = republicSource.map(projectPolygon);
const north = projectPolygon(northSource);
const chunks: { origin: Pair; polygons: MultiPolygon; seed: number }[] = [];
const size = 0.42;
for (let z = -4.62; z < 0; z += size)
  for (let x = -1.68; x < 3.78; x += size) {
    const box: Polygon = [
      [
        [x, z],
        [x + size, z],
        [x + size, z + size],
        [x, z + size],
        [x, z],
      ],
    ];
    const polygons = clipping.intersection(north, box);
    if (!polygons.length) continue;
    chunks.push({
      origin: [+(x + size / 2).toFixed(6), +(z + size / 2).toFixed(6)],
      polygons,
      seed: chunks.length,
    });
  }
const edgeKey = (a: Pair, b: Pair) =>
  [a.map((n) => n.toFixed(5)).join(","), b.map((n) => n.toFixed(5)).join(",")]
    .sort()
    .join("|");
const northernEdges = new Set(
  north[0].slice(1).map((b, i) => edgeKey(north[0][i], b)),
);
const coast: { a: Pair; b: Pair; fresh: boolean }[] = [];
for (const p of republic)
  for (const ring of p)
    for (let i = 1; i < ring.length; i++) {
      coast.push({
        a: ring[i - 1],
        b: ring[i],
        fresh: northernEdges.has(edgeKey(ring[i - 1], ring[i])),
      });
    }
const data = {
  source:
    "Natural Earth 5.1.2, 1:50m, public domain; saved countries-50m.geojson",
  projection: {
    center: [-8.05, 53.45],
    longitudeScale: 1.25,
    latitudeScale: 2.1,
    north: "-Z",
  },
  relief: "Schematic authored low-poly height field; not measured elevation",
  republic,
  north,
  chunks,
  coast,
};
if (!coast.some((c) => c.fresh))
  throw new Error("Source countries do not share a matching border");
writeFileSync("src/pixel/uk-ireland-terrain.json", JSON.stringify(data) + "\n");
console.log({
  republicPolygons: republic.length,
  northernChunks: chunks.length,
  newCoastSegments: coast.filter((e) => e.fresh).length,
});
