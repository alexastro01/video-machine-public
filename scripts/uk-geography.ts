import { readFileSync, writeFileSync } from "node:fs";
type Geometry = { type: string; coordinates: number[][][][] };
const all = JSON.parse(
  readFileSync("channel/geography/countries-50m.geojson", "utf8"),
).features as { properties: { ADMIN: string }; geometry: Geometry }[];
function ringContains(ring: number[][], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = ring[i],
      [c, d] = ring[j];
    if (b > y !== d > y && x < ((c - a) * (y - b)) / (d - b) + a)
      inside = !inside;
  }
  return inside;
}
function contains(g: Geometry, x: number, y: number) {
  const ps =
    g.type === "Polygon"
      ? [g.coordinates as unknown as number[][][]]
      : g.coordinates;
  return ps.some(
    (p) =>
      ringContains(p[0], x, y) &&
      !p.slice(1).some((h) => ringContains(h, x, y)),
  );
}
const f = all.filter((c) =>
  ["United Kingdom", "Ireland", "France"].includes(c.properties.ADMIN),
);
const cells: {
  x: number;
  z: number;
  land: string;
  seed: number;
  gx: number;
  gz: number;
  edge?: boolean;
  region: string;
}[] = [];
const uk = f.find((c) => c.properties.ADMIN === "United Kingdom");
if (!uk) throw new Error("UK source geometry missing");
const northernIreland = uk.geometry.coordinates.find((p) =>
  ringContains(p[0], -5.93, 54.6),
);
if (!northernIreland)
  throw new Error("Northern Ireland source polygon missing");
let ix = 0,
  gz = 0;
for (let lat = 49; lat <= 59.1; lat += 0.07, gz++) {
  let gx = 0;
  for (let lon = -11; lon <= 3; lon += 0.08, gx++) {
    const country = f.find((c) => contains(c.geometry, lon, lat));
    if (!country) continue;
    cells.push({
      x: +((lon + 4.5) * 0.57).toFixed(4),
      z: +(54 - lat).toFixed(4),
      land:
        country.properties.ADMIN === "United Kingdom"
          ? "uk"
          : country.properties.ADMIN === "Ireland"
            ? "ireland"
            : "france",
      region:
        country.properties.ADMIN === "Ireland"
          ? "ireland"
          : ringContains(northernIreland[0], lon, lat)
            ? "northern-ireland"
            : "other",
      seed: ((ix++ * 73) % 101) / 101,
      gx,
      gz,
    });
  }
}
const ukKeys = new Set(
  cells.filter((c) => c.land === "uk").map((c) => `${c.gx},${c.gz}`),
);
for (const c of cells)
  c.edge =
    c.land === "uk" &&
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dz]) => !ukKeys.has(`${c.gx + dx},${c.gz + dz}`));
writeFileSync("src/pixel/uk-map-cells.json", JSON.stringify(cells) + "\n");
const world = [];
for (let lat = -55; lat <= 80; lat += 5)
  for (let lon = -175; lon <= 180; lon += 5)
    if (all.some((f) => contains(f.geometry, lon, lat)))
      world.push([lon / 32, lat / 32]);
writeFileSync("src/pixel/uk-world-cells.json", JSON.stringify(world) + "\n");
console.log({ coastVoxels: cells.length, worldVoxels: world.length });
