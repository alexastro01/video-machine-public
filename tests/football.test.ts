import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { buildFootballGeometry } from "../src/pixel/football-model";

test("football has a closed round shell with flush pentagon and hexagon panels", () => {
  const geometry = buildFootballGeometry();
  const p = geometry.getAttribute("position"),
    index = geometry.getIndex()!;
  const edges = new Map<string, number>();
  let volume = 0;
  for (let i = 0; i < p.count; i++)
    assert.ok(
      Math.abs(new Vector3().fromBufferAttribute(p, i).length() - 0.27) < 1e-6,
    );
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    const [a, b, c] = ids.map((n) => new Vector3().fromBufferAttribute(p, n));
    const normal = new Vector3().crossVectors(
      b.clone().sub(a),
      c.clone().sub(a),
    );
    assert.ok(normal.length() > 1e-9, "No zero-area triangles");
    assert.ok(normal.dot(a) > 0, "Outward winding");
    volume += a.dot(new Vector3().crossVectors(b, c)) / 6;
    for (let j = 0; j < 3; j++) {
      const key = [ids[j], ids[(j + 1) % 3]].sort((x, y) => x - y).join(":");
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  assert.ok(
    [...edges.values()].every((count) => count === 2),
    "No holes or detached patches",
  );
  assert.equal(geometry.groups.filter((g) => g.materialIndex === 1).length, 12);
  assert.equal(geometry.groups.filter((g) => g.materialIndex === 0).length, 20);
  assert.ok(volume > 0.08 && volume < 0.083);
  geometry.dispose();
});
