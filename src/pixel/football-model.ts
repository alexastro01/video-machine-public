import {
  BufferGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Vector3,
} from "three";

/** A single closed spherical shell: 12 black pentagons and 20 white hexagons. */
export function buildFootballGeometry(radius = 0.27, subdivisions = 4) {
  const base = new IcosahedronGeometry(1, 0);
  const source = base.getAttribute("position");
  const corners: Vector3[] = [];
  const lookup = new Map<string, number>();
  const key = (v: Vector3) =>
    v
      .toArray()
      .map((n) => n.toFixed(7))
      .join(",");
  const corner = (v: Vector3) => {
    const k = key(v);
    if (!lookup.has(k)) {
      lookup.set(k, corners.length);
      corners.push(v);
    }
    return lookup.get(k)!;
  };
  const faces: number[][] = [];
  for (let i = 0; i < source.count; i += 3)
    faces.push(
      [0, 1, 2].map((j) =>
        corner(new Vector3().fromBufferAttribute(source, i + j)),
      ),
    );
  base.dispose();
  const neighbours = corners.map(() => new Set<number>());
  for (const face of faces)
    for (let i = 0; i < 3; i++) {
      neighbours[face[i]].add(face[(i + 1) % 3]);
      neighbours[face[i]].add(face[(i + 2) % 3]);
    }
  const edgePoint = (a: number, b: number) =>
    corners[a]
      .clone()
      .lerp(corners[b], 1 / 3)
      .normalize();
  const panels: { material: number; points: Vector3[] }[] = faces.map(
    ([a, b, c]) => ({
      material: 0,
      points: [
        edgePoint(a, b),
        edgePoint(b, a),
        edgePoint(b, c),
        edgePoint(c, b),
        edgePoint(c, a),
        edgePoint(a, c),
      ],
    }),
  );
  corners.forEach((normal, i) => {
    const points = [...neighbours[i]].map((n) => edgePoint(i, n));
    const u = points[0]
      .clone()
      .addScaledVector(normal, -points[0].dot(normal))
      .normalize();
    const v = new Vector3().crossVectors(normal, u);
    points.sort(
      (a, b) => Math.atan2(a.dot(v), a.dot(u)) - Math.atan2(b.dot(v), b.dot(u)),
    );
    panels.push({ material: 1, points });
  });
  const positions: number[] = [],
    normals: number[] = [],
    indices: number[] = [];
  const vertices = new Map<string, number>();
  const emitVertex = (p: Vector3) => {
    p.normalize();
    const k = key(p);
    if (!vertices.has(k)) {
      vertices.set(k, positions.length / 3);
      positions.push(p.x * radius, p.y * radius, p.z * radius);
      normals.push(p.x, p.y, p.z);
    }
    return vertices.get(k)!;
  };
  const triangle = (a: Vector3, b: Vector3, c: Vector3) => {
    const normal = new Vector3().crossVectors(
      b.clone().sub(a),
      c.clone().sub(a),
    );
    if (normal.dot(a) < 0)
      indices.push(emitVertex(a), emitVertex(c), emitVertex(b));
    else indices.push(emitVertex(a), emitVertex(b), emitVertex(c));
  };
  const geometry = new BufferGeometry();
  for (const panel of panels) {
    const start = indices.length;
    const centre = panel.points
      .reduce((sum, p) => sum.add(p), new Vector3())
      .normalize();
    for (let edge = 0; edge < panel.points.length; edge++) {
      const a = panel.points[edge],
        b = panel.points[(edge + 1) % panel.points.length];
      const sample = (i: number, j: number) =>
        centre
          .clone()
          .multiplyScalar(1 - (i + j) / subdivisions)
          .addScaledVector(a, i / subdivisions)
          .addScaledVector(b, j / subdivisions)
          .normalize();
      for (let i = 0; i < subdivisions; i++)
        for (let j = 0; j < subdivisions - i; j++) {
          triangle(sample(i, j), sample(i + 1, j), sample(i, j + 1));
          if (i + j < subdivisions - 1)
            triangle(sample(i + 1, j), sample(i + 1, j + 1), sample(i, j + 1));
        }
    }
    geometry.addGroup(start, indices.length - start, panel.material);
  }
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
