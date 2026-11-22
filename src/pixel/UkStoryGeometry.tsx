import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import {
  Object3D,
  Color,
  ExtrudeGeometry,
  Shape,
  type InstancedMesh,
  type PerspectiveCamera,
} from "three";
import { Block } from "./WorldKit";
import { smooth } from "./timeline";
import wholeTerrain from "./uk-whole-terrain.json";
import { buildLandGeometry } from "./uk-scenery-model";
import { DetailedRunway, ScenerySea } from "./UkScenery";
import { buildFootballGeometry } from "./football-model";

export function StoryCamera({
  mode,
  progress = 0,
}: {
  mode: "whole-map" | "sea" | "stadium" | "ball" | "dublin";
  progress?: number;
}) {
  const { camera, invalidate } = useThree();
  useLayoutEffect(() => {
    const c = camera as PerspectiveCamera;
    c.zoom = 1;
    if (mode === "whole-map") {
      c.position.set(0.25, 17.8, 12.6);
      c.lookAt(-0.2, 0, -1.3);
      c.fov = 42;
    }
    if (mode === "sea") {
      c.position.set(0, 7, 11);
      c.lookAt(0, 0, -1);
      c.fov = 43 - progress * 3;
    }
    if (mode === "stadium") {
      c.position.set(0.1, 6.5, 12.5 - progress * 1.1);
      c.lookAt(0, 0, -3.5);
      c.fov = 50;
    }
    if (mode === "ball") {
      c.position.set(0.3, 1.6, 4.1 - progress * 0.18);
      c.lookAt(0, 0.45, 0.1);
      c.fov = 42;
    }
    if (mode === "dublin") {
      c.position.set(7.5 - progress * 1.4, 10.5, 14 - progress);
      c.lookAt(0, 0, -3);
      c.fov = 46;
    }
    c.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, mode, progress]);
  return null;
}

export function Jet({
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
}: {
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
}) {
  const wing = useMemo(() => {
    const s = new Shape();
    s.moveTo(0, -0.65);
    s.lineTo(1.9, 0.9);
    s.lineTo(1.95, 1.35);
    s.lineTo(0, 0.55);
    s.lineTo(-1.95, 1.35);
    s.lineTo(-1.9, 0.9);
    s.closePath();
    return s;
  }, []);
  const wingGeometry = useMemo(
    () => new ExtrudeGeometry(wing, { depth: 0.055, bevelEnabled: false }),
    [wing],
  );
  useEffect(() => () => wingGeometry.dispose(), [wingGeometry]);
  return (
    <group position={position} scale={scale} rotation={rotation}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.27, 2.8, 8]} />
        <meshStandardMaterial color="#d1d5c7" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, -1.75]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.24, 0.75, 8]} />
        <meshStandardMaterial color="#d1d5c7" />
      </mesh>
      <mesh
        geometry={wingGeometry}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        castShadow
      >
        <meshStandardMaterial color="#aebcb6" />
      </mesh>
      <Block at={[0, 0.45, 1.1]} size={[0.09, 0.75, 0.6]} color="#516b76" />
      <Block at={[0, 0.06, 1.2]} size={[1.2, 0.07, 0.5]} color="#9aaead" />
      <Block at={[0, 0.17, -1.25]} size={[0.33, 0.1, 0.35]} color="#36586a" />
      {[-0.95, 0.95].map((x) => (
        <group key={x}>
          <mesh position={[x, -0.21, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.19, 0.68, 8]} />
            <meshStandardMaterial color="#9aacae" />
          </mesh>
          <mesh position={[x, -0.21, -0.045]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.13, 8]} />
            <meshBasicMaterial color="#233b4b" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function WholeChunk({
  chunk,
  progress,
}: {
  chunk: (typeof wholeTerrain.chunks)[number];
  progress: number;
}) {
  const geometry = useMemo(
    () =>
      buildLandGeometry(chunk.polygons, true, chunk.origin as [number, number]),
    [chunk],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const start =
    ((chunk.origin[1] + 7.2) / 11.7) * 0.45 + (chunk.seed % 7) * 0.006;
  const fall = smooth((progress - start) / 0.3);
  return (
    <group
      position={[chunk.origin[0], -fall * 4.2, chunk.origin[1]]}
      rotation={[
        fall * Math.sin(chunk.seed) * 0.12,
        0,
        fall * Math.cos(chunk.seed) * 0.13,
      ]}
      visible={fall < 0.86}
    >
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
    </group>
  );
}
export function WholeUkMap({ progress }: { progress: number }) {
  const republic = useMemo(() => buildLandGeometry(wholeTerrain.ireland), []);
  useEffect(() => () => republic.dispose(), [republic]);
  return (
    <>
      <ScenerySea />
      <mesh geometry={republic} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
      {wholeTerrain.chunks.map((chunk) => (
        <WholeChunk key={chunk.seed} chunk={chunk} progress={progress} />
      ))}
      {wholeTerrain.chunks
        .filter((c) => c.seed % 7 === 0)
        .map((c) => (
          <mesh
            key={c.seed}
            position={[c.origin[0], 0.015, c.origin[1]]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.06, 0.09 + progress * 0.1, 7]} />
            <meshBasicMaterial
              color="#b9cbc2"
              transparent
              opacity={Math.sin(progress * Math.PI) * 0.25}
            />
          </mesh>
        ))}
    </>
  );
}

export function SeaFlight({
  time,
  circle = false,
}: {
  time: number;
  circle?: boolean;
}) {
  const a = time * (circle ? 0.6 : 0.3),
    x = circle ? Math.sin(a) * 1.2 : -1.1 + time * 0.65,
    z = circle ? Math.cos(a) : -1.5;
  return (
    <>
      <ScenerySea />
      <Jet
        position={[x, 1.6 + Math.sin(time) * 0.05, z]}
        scale={0.64}
        rotation={[
          0,
          circle ? -a + Math.PI / 2 : -Math.PI / 2,
          Math.sin(time * 0.7) * 0.13,
        ]}
      />
      {Array.from({ length: 25 }, (_, i) => (
        <mesh
          key={i}
          position={[(i % 5) * 2.8 - 6, 0.025, Math.floor(i / 5) * 2.4 - 7]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.28, 0.29, 20]} />
          <meshBasicMaterial
            color="#55727e"
            transparent
            opacity={0.1 + Math.sin(time + i) * 0.045}
          />
        </mesh>
      ))}
    </>
  );
}

function SeatRows() {
  const ref = useRef<InstancedMesh>(null),
    obj = useMemo(() => new Object3D(), []);
  const seats = useMemo(
    () =>
      Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 72 }, (_, i) => ({
          a: Math.PI * 0.93 + (i / 71) * Math.PI * 1.14,
          row,
        })),
      ).flat(),
    [],
  );
  useLayoutEffect(() => {
    const m = ref.current!;
    seats.forEach(({ a, row }, i) => {
      obj.position.set(
        Math.cos(a) * (7.5 + row * 0.3),
        0.6 + row * 0.34,
        Math.sin(a) * (8.3 + row * 0.24) - 2,
      );
      obj.rotation.set(0, -a + Math.PI / 2, 0);
      obj.scale.set(0.26, 0.28, 0.3);
      obj.updateMatrix();
      m.setMatrixAt(i, obj.matrix);
      m.setColorAt(i, new Color(row % 3 === 0 ? "#6d7e81" : "#354f66"));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [obj, seats]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, seats.length]}
      frustumCulled={false}
    >
      <boxGeometry />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
}

export function Stadium({
  time,
  cancel,
  stopAt,
}: {
  time: number;
  cancel: number;
  stopAt: number;
}) {
  const ball = useMemo(() => buildFootballGeometry(), []);
  useEffect(() => () => ball.dispose(), [ball]);
  // Position and spin share the same travelled distance and stop together.
  const travelled = 0.55 * smooth(Math.min(time, stopAt) / 1.8),
    ballZ = 1.15 - travelled;
  return (
    <>
      <Block at={[0, -0.12, -2]} size={[22, 0.25, 25]} color="#2e4c51" />
      {Array.from({ length: 12 }, (_, i) => (
        <Block
          key={i}
          at={[0, 0.01, -9.3 + i * 1.3]}
          size={[12, 0.025, 1.3]}
          color={i % 2 ? "#587762" : "#52715d"}
          outline={false}
        />
      ))}
      <Block
        at={[0, 0.03, -2]}
        size={[0.04, 0.012, 14]}
        color="#bbc6b0"
        outline={false}
      />
      {[-5.8, 5.8].map((x) => (
        <Block
          key={x}
          at={[x, 0.03, -2]}
          size={[0.04, 0.012, 14]}
          color="#bbc6b0"
          outline={false}
        />
      ))}
      {[-9, 5].map((z) => (
        <Block
          key={z}
          at={[0, 0.03, z]}
          size={[11.6, 0.012, 0.045]}
          color="#bbc6b0"
          outline={false}
        />
      ))}
      <mesh position={[0, 0.035, -2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.48, 1.52, 48]} />
        <meshBasicMaterial color="#bbc6b0" />
      </mesh>
      <SeatRows />
      <group position={[0, 0, -8.5]}>
        {[-1.7, 1.7].map((x) => (
          <Block
            key={x}
            at={[x, 0.8, 0]}
            size={[0.07, 1.6, 0.08]}
            color="#c7cebb"
          />
        ))}
        <Block at={[0, 1.6, 0]} size={[3.5, 0.07, 0.08]} color="#c7cebb" />
        {Array.from({ length: 14 }, (_, i) => (
          <Block
            key={i}
            at={[-1.7 + i * 0.26, 0.8, -0.5]}
            size={[0.015, 1.6, 0.015]}
            color="#889b96"
            outline={false}
          />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <Block
            key={i}
            at={[0, 0.1 + i * 0.25, -0.5]}
            size={[3.4, 0.015, 0.015]}
            color="#889b96"
            outline={false}
          />
        ))}
      </group>
      {[-7, 7].map((x) => (
        <group key={x}>
          <Block at={[x, 3.1, -9]} size={[0.16, 6.2, 0.16]} color="#607c82" />
          <Block at={[x, 6.2, -9]} size={[2.3, 0.65, 0.3]} color="#495e6c" />
          {Array.from({ length: 8 }, (_, i) => (
            <mesh
              key={i}
              position={[
                x - 0.9 + (i % 4) * 0.6,
                6.1 + Math.floor(i / 4) * 0.25,
                -8.8,
              ]}
            >
              <boxGeometry args={[0.2, 0.16, 0.05]} />
              <meshBasicMaterial
                color={cancel > 0.15 + i * 0.075 ? "#38505a" : "#d3ddc6"}
              />
            </mesh>
          ))}
        </group>
      ))}
      <group position={[0, 0.3, ballZ]} rotation={[-travelled / 0.27, 0.35, 0]}>
        <mesh geometry={ball} castShadow>
          <meshStandardMaterial
            attach="material-0"
            color="#e1e5da"
            roughness={0.88}
          />
          <meshStandardMaterial
            attach="material-1"
            color="#15212b"
            roughness={0.88}
          />
        </mesh>
      </group>
      <mesh
        position={[0, 0.04, ballZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1, 0.65, 1]}
      >
        <circleGeometry args={[0.29, 32]} />
        <meshBasicMaterial
          color="#122d30"
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

export function DublinTraffic({ time }: { time: number }) {
  const descent = Math.min(1, time / 1.4);
  return (
    <>
      <DetailedRunway progress={0} time={time} />
      <Jet
        position={[0, 0.65 + (1 - descent) * 3, 4 - time * 1.3]}
        scale={0.4}
      />
      {[0, 1, 2, 3].map((i) => (
        <Jet
          key={i}
          position={[
            3.8 + Math.sin(time * 0.4 + i) * 0.7,
            1.3 + i * 0.65,
            -4 + i * 2.3 - time * 0.3,
          ]}
          scale={0.3}
          rotation={[0, -Math.PI / 2, 0.15]}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <Jet
          key={i}
          position={[0, 0.6, -3 + i * 1.6 - time * 0.07]}
          scale={0.33}
          rotation={[0, 0, 0]}
        />
      ))}
    </>
  );
}
