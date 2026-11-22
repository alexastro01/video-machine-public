import { readFileSync, writeFileSync } from "node:fs";
import clipping, {
  type MultiPolygon,
  type Polygon,
  type Pair,
} from "polygon-clipping";

// Same local Natural Earth source as the approved Ireland close-up.
const features = JSON.parse(
  readFileSync("channel/geography/countries-50m.geojson", "utf8"),
).features as {
  properties: { ADMIN: string };
  geometry: { coordinates: MultiPolygon };
}[];
const project = ([lon, lat]: Pair): Pair => [
  +(0.57 * (lon + 4.5)).toFixed(6),
  +(54 - lat).toFixed(6),
];
const polygons = (name: string) => {
  const feature = features.find((f) => f.properties.ADMIN === name);
  if (!feature) throw Error(`Missing geographic source for ${name}`);
  return feature.geometry.coordinates.map((p) => p.map((r) => r.map(project)));
};
const uk = polygons("United Kingdom"),
  ireland = polygons("Ireland");
const chunks: { origin: Pair; polygons: MultiPolygon; seed: number }[] = [];
for (let z = -7.2; z < 4.5; z += 0.45)
  for (let x = -4.3; x < 4; x += 0.42) {
    const square: Polygon = [
      [
        [x, z],
        [x + 0.42, z],
        [x + 0.42, z + 0.45],
        [x, z + 0.45],
        [x, z],
      ],
    ];
    const part = clipping.intersection(uk, square);
    if (part.length)
      chunks.push({
        origin: [x + 0.21, z + 0.225],
        polygons: part,
        seed: chunks.length,
      });
  }
writeFileSync(
  "src/pixel/uk-whole-terrain.json",
  JSON.stringify({
    source:
      "Natural Earth 5.1.2, local countries-50m.geojson; schematic relief",
    uk,
    ireland,
    chunks,
  }) + "\n",
);
console.log(
  `Prepared ${chunks.length} source-clipped UK fragments; the Republic remains separate.`,
);
