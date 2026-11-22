import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildLandGeometry } from "../src/pixel/uk-scenery-model";
import terrain from "../src/pixel/uk-ireland-terrain.json";
const kitPath = pathToFileURL(
  path.resolve("scripts/vendor/geometry-quality-kit/mesh-topology-audit.js"),
).href;
const { auditTriangleSoup, auditMeshData } = await import(kitPath);
const reports = [];
for (const [name, polygons, north] of [
  ["republic", terrain.republic, false],
  ...terrain.chunks.map((chunk) => [
    `north-${chunk.seed}`,
    chunk.polygons,
    true,
  ]),
] as const) {
  const geometry = buildLandGeometry(
    polygons as number[][][][],
    north as boolean,
  );
  const positions = Array.from(geometry.getAttribute("position").array);
  const normals = Array.from(geometry.getAttribute("normal").array);
  const soup = auditTriangleSoup({ positions, normals });
  const verts: number[][] = [],
    faces: number[][] = [],
    keys = new Map<string, number>();
  for (let i = 0; i < positions.length; i += 9) {
    const face: number[] = [];
    for (let j = 0; j < 9; j += 3) {
      const p = positions.slice(i + j, i + j + 3);
      const key = p.map((n) => Math.round(n * 1e5)).join(",");
      let index = keys.get(key);
      if (index === undefined) {
        index = verts.length;
        keys.set(key, index);
        verts.push(p);
      }
      face.push(index);
    }
    faces.push(face);
  }
  const topology = auditMeshData(
    { verts, faces },
    { maxComponents: Infinity, duplicateDistance: 1e-7 },
  );
  reports.push({ name, triangles: positions.length / 9, soup, topology });
  geometry.dispose();
}
const report = {
  ok: reports.every((r) => r.soup.ok && r.topology.ok),
  reports,
};
mkdirSync("renders/uk-disappears/scenery-v3", { recursive: true });
writeFileSync(
  "renders/uk-disappears/scenery-v3/geometry-audit.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      ok: report.ok,
      solids: reports.length,
      triangles: reports.reduce((s, r) => s + r.triangles, 0),
      findings: reports
        .filter((r) => !r.soup.ok || !r.topology.ok)
        .map((r) => ({
          name: r.name,
          soup: r.soup.issues,
          topology: r.topology.issues,
        })),
    },
    null,
    2,
  ),
);
if (!report.ok) process.exitCode = 1;
