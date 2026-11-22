import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  ShapeUtils,
  Vector2,
} from "three";
import terrain from "./uk-ireland-terrain.json";
import { smooth } from "./timeline";

export type Point2 = [number, number];
export type Polygon2 = number[][][];
export type SceneryDebug = "beauty" | "regions" | "collapse" | "wireframe";
export const sceneryContract = {
  seed: 29,
  frame: "+Y up, -Z north / approach direction; sea Y=-0.02",
  internalCanvas: [540, 960],
  runway: {
    width: 2,
    length: 16,
    xMin: -3.4,
    xMax: 3.4,
    zMin: -11.75,
    zMax: 4.25,
    tileX: 0.4,
    tileZ: 0.5,
    top: 0.37,
  },
  map: { top: 0.44, bottom: -0.18, chunkWidth: 0.42, source: terrain.source },
  palette: {
    water: "#12283d",
    asphalt: "#475762",
    paint: "#e4dfc9",
    grass: "#7c956b",
    rock: "#4d6567",
    north: "#a3ab8d",
    foam: "#bdcfc9",
  },
};
export function seedUnit(value: number, seed = sceneryContract.seed) {
  const x = Math.sin(value * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
export function runwayFailureAt(
  x: number,
  z: number,
  seed = sceneryContract.seed,
) {
  const distance = (z - sceneryContract.runway.zMin) / 16;
  return (
    0.015 +
    distance * 0.82 +
    Math.abs(x) * 0.014 +
    (seedUnit(Math.round(x * 10) * 81 + Math.round(z * 10), seed) - 0.5) * 0.035
  );
}
export function fragmentPose(
  progress: number,
  start: number,
  seed: number,
  layer = 1,
) {
  const elapsed = Math.max(0, (progress - start - layer * 0.026) * 5.5);
  const drop = 1.2 * elapsed + 5.5 * elapsed * elapsed;
  const turn = Math.min(elapsed, 0.5) * 0.28;
  return {
    drop,
    rx: turn * (seedUnit(seed) - 0.5),
    rz: turn * (seedUnit(seed + 4) - 0.5),
    elapsed,
    visible: drop < 1.4,
  };
}
export function northernFailureAt(x: number, z: number, seed: number) {
  return (
    0.13 +
    ((-z - 0.4) / 4) * 0.2 +
    ((3.2 - x) / 5) * 0.27 +
    seedUnit(seed) * 0.07
  );
}
export function landHeight(x: number, z: number) {
  const peak = (px: number, pz: number, spread: number, height: number) =>
    height * Math.exp(-((x - px) ** 2 + (z - pz) ** 2) / spread);
  return (
    0.44 +
    peak(-1.9, -2.7, 1.0, 0.3) +
    peak(-2, 2.9, 0.6, 0.28) +
    peak(1.7, 1.5, 0.6, 0.22) +
    peak(1.7, -2.5, 0.4, 0.14)
  );
}
function cleanRing(ring: number[][]) {
  const out = ring.filter(
    (p, i) =>
      i === 0 ||
      Math.hypot(p[0] - ring[i - 1][0], p[1] - ring[i - 1][1]) > 1e-7,
  );
  if (
    out.length > 2 &&
    Math.hypot(out[0][0] - out.at(-1)![0], out[0][1] - out.at(-1)![1]) < 1e-7
  )
    out.pop();
  return out;
}
// One closed mesh per geographic polygon, with shared top/side datums.
// Top triangles are subdivided evenly so the relief has interior vertices.
export function buildLandGeometry(
  polygons: Polygon2[],
  north = false,
  origin: Point2 = [0, 0],
  debug: SceneryDebug = "beauty",
) {
  const positions: number[] = [],
    colors: number[] = [];
  const grass = new Color(
    north ? sceneryContract.palette.north : sceneryContract.palette.grass,
  );
  const rock = new Color(sceneryContract.palette.rock);
  const y = (p: number[], top: boolean) =>
    top ? landHeight(p[0], p[1]) : sceneryContract.map.bottom;
  const vertex = (p: number[], top: boolean) => [
    p[0] - origin[0],
    y(p, top),
    p[1] - origin[1],
  ];
  const emit = (a: number[], b: number[], c: number[], color: Color) => {
    positions.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
  };
  const mid = (a: number[], b: number[]) => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
  const topFace = (a: number[], b: number[], c: number[], depth: number) => {
    if (depth) {
      const ab = mid(a, b),
        bc = mid(b, c),
        ca = mid(c, a);
      topFace(a, ab, ca, depth - 1);
      topFace(ab, b, bc, depth - 1);
      topFace(ca, bc, c, depth - 1);
      topFace(ab, bc, ca, depth - 1);
      return;
    }
    const x = (a[0] + b[0] + c[0]) / 3,
      z = (a[1] + b[1] + c[1]) / 3;
    const tint =
      debug === "regions"
        ? 1
        : 0.97 + Math.sin(x * 1.4) * 0.035 + Math.cos(z * 1.7) * 0.025;
    emit(
      vertex(a, true),
      vertex(b, true),
      vertex(c, true),
      grass.clone().multiplyScalar(tint),
    );
    // Shared geographic colors avoid highlighting the triangulator's long
    // skinny triangles. Relief normals, not random face colors, describe hills.
    if (debug !== "regions") {
      for (const [i, point] of [a, b, c].entries()) {
        const color = grass
          .clone()
          .multiplyScalar(
            0.97 +
              Math.sin(point[0] * 1.4) * 0.035 +
              Math.cos(point[1] * 1.7) * 0.025,
          );
        const offset = colors.length - 9 + i * 3;
        colors[offset] = color.r;
        colors[offset + 1] = color.g;
        colors[offset + 2] = color.b;
      }
    }
  };
  const bottomFace = (a: number[], b: number[], c: number[], depth: number) => {
    if (depth) {
      const ab = mid(a, b),
        bc = mid(b, c),
        ca = mid(c, a);
      bottomFace(a, ab, ca, depth - 1);
      bottomFace(ab, b, bc, depth - 1);
      bottomFace(ca, bc, c, depth - 1);
      bottomFace(ab, bc, ca, depth - 1);
      return;
    }
    emit(vertex(a, false), vertex(c, false), vertex(b, false), rock);
  };
  for (const polygon of polygons) {
    const rings = polygon.map(cleanRing).filter((r) => r.length >= 3);
    if (!rings.length) continue;
    // In XZ, clockwise contours produce upward cap normals.
    rings.forEach((ring, i) => {
      const clockwise = ShapeUtils.isClockWise(
        ring.map((p) => new Vector2(...(p as Point2))),
      );
      if (clockwise !== (i === 0)) ring.reverse();
    });
    const points = rings.flat();
    const faces = ShapeUtils.triangulateShape(
      rings[0].map((p) => new Vector2(...(p as Point2))),
      rings.slice(1).map((r) => r.map((p) => new Vector2(...(p as Point2)))),
    );
    for (const [ia, ib, ic] of faces) {
      const [a, b, c] = [points[ia], points[ib], points[ic]];
      // Earcut cap winding is normalized below using its XZ signed area.
      const up =
        (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) > 0;
      const cap = up ? [a, b, c] : [a, c, b];
      topFace(cap[0], cap[1], cap[2], north ? 1 : 2);
      bottomFace(cap[0], cap[1], cap[2], north ? 1 : 2);
    }
    for (const ring of rings)
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i],
          b = ring[(i + 1) % ring.length];
        const subdivisions = north ? 2 : 4;
        for (let j = 0; j < subdivisions; j++) {
          const lerp = (t: number) => [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
          ];
          const p = lerp(j / subdivisions),
            q = lerp((j + 1) / subdivisions);
          const pa = vertex(p, true),
            qa = vertex(q, true),
            pb = vertex(p, false),
            qb = vertex(q, false);
          const tint = rock
            .clone()
            .multiplyScalar(0.9 + seedUnit(i, 13) * 0.18);
          emit(pa, pb, qa, tint);
          emit(pb, qb, qa, tint);
        }
      }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute("normal");
  const points = geometry.getAttribute("position");
  for (let i = 0; i < normals.count; i++)
    if (normals.getY(i) > 0.5) {
      const x = points.getX(i) + origin[0],
        z = points.getZ(i) + origin[1],
        h = 0.002;
      const dx = (landHeight(x + h, z) - landHeight(x - h, z)) / (h * 2);
      const dz = (landHeight(x, z + h) - landHeight(x, z - h)) / (h * 2);
      const length = Math.hypot(dx, 1, dz);
      normals.setXYZ(i, -dx / length, 1 / length, -dz / length);
    }
  geometry.computeBoundingBox();
  return geometry;
}
export function foamVisibility(progress: number, fresh: boolean) {
  return fresh ? smooth((progress - 0.4) / 0.3) : 0.25;
}

export function inRepublic(x: number, z: number) {
  return terrain.republic.some((polygon) => {
    let inside = false;
    const ring = polygon[0];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, az] = ring[i],
        [bx, bz] = ring[j];
      if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax)
        inside = !inside;
    }
    return inside;
  });
}
