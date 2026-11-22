import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Object3D,
  Vector2,
  type InstancedMesh,
  type Mesh,
  type OrthographicCamera,
  type PerspectiveCamera,
} from "three";
import terrain from "./uk-ireland-terrain.json";
import {
  buildLandGeometry,
  foamVisibility,
  fragmentPose,
  inRepublic,
  landHeight,
  northernFailureAt,
  runwayFailureAt,
  sceneryContract as contract,
  seedUnit,
  type SceneryDebug,
} from "./uk-scenery-model";
import { smooth } from "./timeline";

type Item = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  anchor?: [number, number];
  layer?: number;
};
const box = (
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
  anchor?: [number, number],
): Item => ({ x, y, z, w, h, d, color, anchor });

function Instances({
  items,
  progress = 0,
  seed = 29,
  basic = false,
  emissive = false,
  debug = "beauty",
}: {
  items: Item[];
  progress?: number;
  seed?: number;
  basic?: boolean;
  emissive?: boolean;
  debug?: SceneryDebug;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const object = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    const m = mesh.current!;
    for (const [i, item] of items.entries()) {
      const [ax, az] = item.anchor ?? [item.x, item.z];
      const start = runwayFailureAt(ax, az, seed);
      const pose = fragmentPose(
        progress,
        start,
        Math.round(ax * 100) * 97 + Math.round(az * 100),
        item.layer ?? 1,
      );
      object.rotation.set(pose.rx, 0, pose.rz);
      object.position
        .set(item.x - ax, item.y, item.z - az)
        .applyEuler(object.rotation);
      object.position.x += ax;
      object.position.y -= pose.drop;
      object.position.z += az;
      object.scale.set(item.w, item.h, item.d);
      if (!pose.visible) object.scale.setScalar(0);
      object.updateMatrix();
      m.setMatrixAt(i, object.matrix);
      const color =
        debug === "collapse"
          ? new Color().setHSL(start * 0.6, 0.45, 0.5)
          : new Color(item.color);
      if (emissive) color.multiplyScalar(pose.elapsed > 0.005 ? 0.05 : 1);
      m.setColorAt(i, color);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [items, progress, seed, object, emissive, debug]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, items.length]}
      frustumCulled={false}
      castShadow={!basic}
      receiveShadow
    >
      <boxGeometry />
      {basic ? (
        <meshBasicMaterial
          toneMapped={!emissive}
          wireframe={debug === "wireframe"}
        />
      ) : (
        <meshStandardMaterial
          roughness={0.9}
          wireframe={debug === "wireframe"}
        />
      )}
    </instancedMesh>
  );
}

export function ScenerySea() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <planeGeometry args={[90, 90]} />
      <meshBasicMaterial color={contract.palette.water} />
    </mesh>
  );
}

const runwaySurface: Item[] = [],
  runwayBase: Item[] = [],
  runwayPaint: Item[] = [],
  runwayLights: Item[] = [];
for (let row = 0; row < 32; row++)
  for (let col = 0; col < 17; col++) {
    const x = (col - 8) * 0.4,
      z = -11.5 + row * 0.5;
    const runway = Math.abs(x) <= 0.8;
    const taxiway = x >= 1.6 && x <= 2 && z > -9;
    const apron = x >= 1.6 && z < -3.5 && z > -8;
    const grass = ["#7c906c", "#879874", "#809371"][
      Math.abs(Math.floor(col / 3) * 17 + Math.floor(row / 4) * 13) % 3
    ];
    runwaySurface.push(
      box(
        x,
        0.29,
        z,
        0.4002,
        0.16,
        0.5002,
        runway
          ? contract.palette.asphalt
          : taxiway || apron
            ? "#71807e"
            : grass,
      ),
    );
    runwayBase.push({
      ...box(x, -0.06, z, 0.4, 0.54, 0.5, "#536967"),
      layer: 0,
    });
    if (runway) {
      if (col === 8 && row % 3 === 0)
        runwayPaint.push(
          box(0, 0.374, z, 0.075, 0.008, 0.35, contract.palette.paint),
        );
      if (col === 6 || col === 10)
        runwayPaint.push(
          box(
            x + (col === 6 ? -0.14 : 0.14),
            0.374,
            z,
            0.035,
            0.008,
            0.501,
            contract.palette.paint,
            [x, z],
          ),
        );
    }
    if (col === 5 || col === 11) {
      if (row % 2 === 0)
        runwayLights.push(box(x, 0.425, z, 0.065, 0.06, 0.065, "#f0dfad"));
    }
    if (taxiway && col === 13)
      runwayPaint.push(box(x, 0.374, z, 0.028, 0.006, 0.501, "#c5b47f"));
  }
// A readable threshold, aiming-point bars and touchdown zone share the slab's
// failure field, so markings cannot float after their asphalt has fallen.
for (let i = 0; i < 8; i++) {
  const x = (i - 3.5) * 0.2;
  runwayPaint.push(
    box(x, 0.379, 2.3, 0.105, 0.009, 0.95, contract.palette.paint),
  );
}
for (const x of [-0.55, 0.55])
  for (const z of [-0.8, -4.8])
    runwayPaint.push(
      box(x, 0.379, z, 0.2, 0.009, 0.95, contract.palette.paint),
    );
for (const x of [-0.2, 0, 0.2])
  for (let j = 0; j < 4; j++)
    runwayLights.push(
      box(x, 0.41, 3.35 + j * 0.23, 0.055, 0.035, 0.04, "#b5c4a4"),
    );

const airport: Item[] = [];
// A terminal with a continuous footprint, recessed glazing, roof caps, and
// attached air bridges. Every dimension is derived from its apron datum.
airport.push(box(2.6, 0.65, -5.7, 1.2, 0.56, 3.4, "#b0b7a6"));
airport.push(box(2.6, 0.97, -5.7, 1.28, 0.08, 3.48, "#839695"));
airport.push(box(1.987, 0.73, -5.7, 0.018, 0.25, 3.1, "#365765"));
for (let i = 0; i < 9; i++)
  airport.push(box(1.97, 0.73, -7.08 + i * 0.34, 0.03, 0.28, 0.025, "#a0afa7"));
for (const z of [-6.8, -5.7, -4.6]) {
  airport.push(box(1.65, 0.57, z, 0.67, 0.16, 0.16, "#a5b0a7", [2.2, z]));
  airport.push(box(1.34, 0.48, z, 0.035, 0.23, 0.035, "#6b807d", [2.2, z]));
}
airport.push(box(-2.5, 0.73, -5.2, 0.35, 0.72, 0.4, "#aab3a2"));
airport.push(box(-2.5, 1.16, -5.2, 0.73, 0.17, 0.7, "#b5baaa"));
airport.push(box(-2.5, 1.36, -5.2, 0.66, 0.25, 0.63, "#426374"));
airport.push(box(-2.5, 1.54, -5.2, 0.81, 0.1, 0.77, "#8f9d96"));
airport.push(box(-2.5, 1.77, -5.2, 0.025, 0.4, 0.025, "#a7b7ac"));
airport.push(box(-2.5, 1.9, -5.2, 0.27, 0.025, 0.035, "#b1bdb0"));
for (const z of [-8.5, -2]) {
  airport.push(box(-2.5, 0.55, z, 1.1, 0.36, 1.4, "#98a899"));
  airport.push(box(-2.5, 0.77, z, 1.18, 0.08, 1.47, "#718a89"));
  airport.push(box(-2.5, 0.53, z + 0.708, 0.82, 0.26, 0.018, "#3d5a67"));
}

const attachedPaint = runwayPaint.flatMap((item) => {
  const pieces: Item[] = [];
  for (let gx = -8; gx <= 8; gx++)
    for (let gz = 0; gz < 32; gz++) {
      const ax = gx * 0.4,
        az = -11.5 + gz * 0.5;
      const x0 = Math.max(item.x - item.w / 2, ax - 0.2),
        x1 = Math.min(item.x + item.w / 2, ax + 0.2);
      const z0 = Math.max(item.z - item.d / 2, az - 0.25),
        z1 = Math.min(item.z + item.d / 2, az + 0.25);
      if (x1 - x0 > 0.00001 && z1 - z0 > 0.00001)
        pieces.push({
          ...item,
          x: (x0 + x1) / 2,
          z: (z0 + z1) / 2,
          w: x1 - x0,
          d: z1 - z0,
          anchor: [ax, az],
        });
    }
  return pieces;
});
const attachedLights = runwayLights.map(
  (item): Item => ({
    ...item,
    anchor: [
      Math.round(item.x / 0.4) * 0.4,
      -11.5 + Math.round((item.z + 11.5) / 0.5) * 0.5,
    ],
  }),
);
const attachedAirport = airport.map(
  (item): Item => ({
    ...item,
    anchor:
      item.x > 0
        ? [2.4, -5.5]
        : item.z < -7
          ? [-2.4, -8.5]
          : item.z > -3
            ? [-2.4, -2]
            : [-2.4, -5],
  }),
);

function ImpactFoam({
  progress,
  time,
  seed = 29,
}: {
  progress: number;
  time: number;
  seed?: number;
}) {
  const marks = useMemo(
    () =>
      Array.from({ length: 58 }, (_, i) => {
        const x = (seedUnit(i, seed) - 0.5) * 6.6,
          z = -11.5 + seedUnit(i + 100, seed) * 15.5;
        return { x, z, start: runwayFailureAt(x, z, seed), i };
      }),
    [seed],
  );
  return (
    <>
      {marks.map(({ x, z, start, i }) => {
        const age = (progress - start) * 5.5 - 0.2;
        if (age < 0 || age > 1) return null;
        const fade = Math.sin(Math.min(1, age) * Math.PI) * 0.42;
        return (
          <group key={i} position={[x, 0.005, z]}>
            <mesh rotation={[-Math.PI / 2, 0, time * 0.08 + i]}>
              <ringGeometry args={[0.05 + age * 0.22, 0.085 + age * 0.24, 8]} />
              <meshBasicMaterial
                color="#b2c9c8"
                transparent
                opacity={fade}
                depthWrite={false}
              />
            </mesh>
            <mesh
              position={[
                Math.sin(i) * age * 0.12,
                Math.sin(age * Math.PI) * 0.3,
                0,
              ]}
            >
              <boxGeometry args={[0.025, 0.06, 0.025]} />
              <meshBasicMaterial color="#adbec0" transparent opacity={fade} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
export function DetailedRunway({
  progress,
  time,
  seed = 29,
  debug = "beauty",
}: {
  progress: number;
  time: number;
  seed?: number;
  debug?: SceneryDebug;
}) {
  return (
    <group name="airport">
      <ScenerySea />
      <Instances
        items={runwayBase}
        progress={progress}
        seed={seed}
        debug={debug}
      />
      <Instances
        items={runwaySurface}
        progress={progress}
        seed={seed}
        debug={debug}
      />
      <Instances
        items={attachedAirport}
        progress={progress}
        seed={seed}
        debug={debug}
      />
      <Instances
        items={attachedPaint}
        progress={progress}
        seed={seed}
        basic
        debug={debug}
      />
      <Instances
        items={attachedLights}
        progress={progress}
        seed={seed}
        basic
        emissive
        debug={debug}
      />
      <ImpactFoam progress={progress} time={time} seed={seed} />
    </group>
  );
}

function CoastRibbon({
  fresh,
  progress,
  time,
}: {
  fresh: boolean;
  progress: number;
  time: number;
}) {
  const geometry = useMemo(() => {
    const points: number[] = [];
    for (const { a, b } of terrain.coast.filter(
      (edge) => edge.fresh === fresh,
    )) {
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = ((b[1] - a[1]) / length) * 0.055,
        nz = (-(b[0] - a[0]) / length) * 0.055;
      const p = [a[0] - nx, 0.006, a[1] - nz],
        q = [a[0] + nx, 0.006, a[1] + nz],
        r = [b[0] + nx, 0.006, b[1] + nz],
        s = [b[0] - nx, 0.006, b[1] - nz];
      points.push(...p, ...q, ...r, ...p, ...r, ...s);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(points, 3));
    return g;
  }, [fresh]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        color={contract.palette.foam}
        transparent
        opacity={
          foamVisibility(progress, fresh) * (0.88 + Math.sin(time * 2) * 0.08)
        }
        side={2}
        depthWrite={false}
      />
    </mesh>
  );
}

function NorthernChunk({
  chunk,
  progress,
  debug,
}: {
  chunk: (typeof terrain.chunks)[number];
  progress: number;
  debug: SceneryDebug;
}) {
  const origin = chunk.origin as [number, number];
  const geometry = useMemo(
    () => buildLandGeometry(chunk.polygons, true, origin, debug),
    [chunk, debug, origin],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const start = northernFailureAt(origin[0], origin[1], chunk.seed);
  const pose = fragmentPose(progress, start, chunk.seed);
  const tint =
    debug === "collapse" ? new Color().setHSL(start, 0.4, 0.6) : "#ffffff";
  return (
    <mesh
      name={`northern-ireland-${chunk.seed}`}
      geometry={geometry}
      position={[origin[0], -pose.drop, origin[1]]}
      rotation={[pose.rx, 0, pose.rz]}
      visible={pose.visible}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={tint}
        vertexColors
        roughness={1}
        wireframe={debug === "wireframe"}
      />
    </mesh>
  );
}

function IrishFlag({ time }: { time: number }) {
  const x = 1.62,
    z = 0.42,
    base = landHeight(x, z);
  return (
    <group
      position={[x, base, z]}
      rotation={[0, 0, Math.sin(time * 2) * 0.015]}
    >
      <mesh position={[0, 0.48, 0]}>
        <boxGeometry args={[0.035, 0.96, 0.035]} />
        <meshStandardMaterial color="#bdc7b7" />
      </mesh>
      {["#5e997b", "#dbdfcb", "#c59b6a"].map((color, i) => (
        <mesh key={color} position={[0.12 + i * 0.16, 0.76, 0]}>
          <boxGeometry args={[0.16, 0.31, 0.025]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}
function NorthernFoam({ progress }: { progress: number }) {
  return (
    <>
      {terrain.chunks.map((chunk) => {
        if (seedUnit(chunk.seed, 131) > 0.28) return null;
        const [x, z] = chunk.origin;
        const age =
          (progress - northernFailureAt(x, z, chunk.seed)) * 3.5 - 0.1;
        if (age < 0 || age > 0.9) return null;
        const opacity = Math.sin((age / 0.9) * Math.PI) * 0.3;
        return (
          <group
            key={chunk.seed}
            position={[x + (seedUnit(chunk.seed + 2) - 0.5) * 0.15, 0.005, z]}
            rotation={[0, chunk.seed * 1.7, 0]}
          >
            <mesh>
              <boxGeometry args={[0.07 + age * 0.14, 0.009, 0.025]} />
              <meshBasicMaterial
                color="#bdd1ce"
                transparent
                opacity={opacity}
                depthWrite={false}
              />
            </mesh>
            <mesh
              position={[
                Math.sin(chunk.seed) * age * 0.08,
                Math.sin((age / 0.9) * Math.PI) * 0.24,
                0,
              ]}
            >
              <boxGeometry args={[0.022, 0.08, 0.022]} />
              <meshBasicMaterial
                color="#b2c4bc"
                transparent
                opacity={opacity * 0.8}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
function MapTrees() {
  const records = useMemo(() => {
    const centers = [
      [-1.6, -1.8],
      [-1.8, 1.6],
      [-0.8, 2.3],
      [1.2, 1.6],
      [-1.3, -2.6],
      [-0.3, 0.4],
    ];
    return centers
      .flatMap(([cx, cz], j) =>
        Array.from({ length: 4 }, (_, i) => [
          cx + seedUnit(i + j * 5) * 0.3,
          cz + seedUnit(i + j * 5 + 90) * 0.3,
        ]),
      )
      .filter(([x, z]) => inRepublic(x, z));
  }, []);
  return (
    <>
      {records.map(([x, z], i) => (
        <mesh key={i} position={[x, landHeight(x, z) + 0.08, z]} castShadow>
          <coneGeometry args={[0.065, 0.2, 4]} />
          <meshStandardMaterial
            color={i % 2 ? "#526f58" : "#59795d"}
            roughness={1}
          />
        </mesh>
      ))}
    </>
  );
}
export function IrelandAtlas({
  progress,
  time,
  debug = "beauty",
}: {
  progress: number;
  time: number;
  debug?: SceneryDebug;
}) {
  const republic = useMemo(
    () => buildLandGeometry(terrain.republic, false, [0, 0], debug),
    [debug],
  );
  useEffect(() => () => republic.dispose(), [republic]);
  return (
    <group name="ireland-atlas">
      <ScenerySea />
      <mesh
        name="republic-and-donegal"
        geometry={republic}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          vertexColors
          roughness={1}
          wireframe={debug === "wireframe"}
        />
      </mesh>
      {terrain.chunks.map((chunk) => (
        <NorthernChunk
          key={chunk.seed}
          chunk={chunk}
          progress={progress}
          debug={debug}
        />
      ))}
      <NorthernFoam progress={progress} />
      <CoastRibbon fresh={false} progress={progress} time={time} />
      <CoastRibbon fresh progress={progress} time={time} />
      <MapTrees />
      <IrishFlag time={time} />
    </group>
  );
}

export function SceneryCamera({
  view,
  progress = 0,
  zoom = 1,
}: {
  view: "runway" | "ireland";
  progress?: number;
  zoom?: number;
}) {
  const { camera, invalidate } = useThree();
  useLayoutEffect(() => {
    if (view === "ireland") {
      camera.position.set(0.6, 16, 10.5);
      camera.lookAt(0, 0, 1.5 - smooth(progress) * 0.4);
      (camera as OrthographicCamera).zoom = (65 + smooth(progress) * 3) * zoom;
    } else {
      if (zoom > 1.05) {
        const edge = Math.max(
          -6,
          Math.min(3.8, -11.75 + ((progress - 0.055) / 0.82) * 16),
        );
        camera.position.set(0.15, 4.1, edge + 9);
        camera.lookAt(0, 0.18, edge);
      } else {
        camera.position.set(0.15, 3.5, 10.8 - smooth(progress) * 0.4);
        camera.lookAt(0, 0.25, -3.0);
      }
      (camera as PerspectiveCamera).fov = 38 / zoom;
    }
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, view, progress, zoom]);
  return null;
}

// Optional debug capture hook. It reports actual renderer counters, never a
// guessed GPU duration. Used by SceneryReview, absent from the production film.
export function SceneryMetrics() {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const meshes: { name: string; vertices: number }[] = [];
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh && mesh.geometry)
        meshes.push({
          name: mesh.name,
          vertices: mesh.geometry.getAttribute("position")?.count ?? 0,
        });
    });
    const originalRender = gl.render;
    gl.render = function (...args) {
      const start = performance.now();
      originalRender.apply(this, args);
      (
        window as typeof window & { __sceneryMetrics?: unknown }
      ).__sceneryMetrics = {
        backend: gl.getContext().getParameter(gl.getContext().VERSION),
        internalSize: gl.getSize(new Vector2()),
        meshes,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        cpuSubmissionMs: performance.now() - start,
        gpuTimeMs: null,
        textures: gl.info.memory.textures,
        geometries: gl.info.memory.geometries,
      };
      console.info(
        "SCENERY_METRICS:" +
          JSON.stringify(
            (window as typeof window & { __sceneryMetrics?: unknown })
              .__sceneryMetrics,
          ),
      );
    };
    return () => {
      gl.render = originalRender;
    };
  }, [gl, scene]);
  return null;
}
