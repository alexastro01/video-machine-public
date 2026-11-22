import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import {
  Color,
  OrthographicCamera,
  PerspectiveCamera,
  BufferGeometry,
  Float32BufferAttribute,
} from "three";
import { Block } from "./WorldKit";
import { PixelSprite } from "./Sprite";
import { smooth } from "./timeline";
import worldCells from "./uk-world-cells.json";

export function UkCamera({
  map = false,
  runway = false,
  zoom = 1,
}: {
  map?: boolean;
  runway?: boolean;
  zoom?: number;
}) {
  const { camera, invalidate } = useThree();
  useLayoutEffect(() => {
    camera.position.set(
      ...((map ? [-2.0, 15, 9] : runway ? [0, 3.1, 10] : [0, 3.0, 14]) as [
        number,
        number,
        number,
      ]),
    );
    camera.lookAt(
      ...((map ? [-2.0, 0, 1.5] : runway ? [0, 0.25, -1] : [0, 1.7, 0]) as [
        number,
        number,
        number,
      ]),
    );
    if (camera instanceof OrthographicCamera)
      camera.zoom = (map ? 92 : runway ? 73 : 155) * zoom;
    if (camera instanceof PerspectiveCamera) camera.fov = 42 / zoom;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, map, runway, zoom]);
  return null;
}
export function UkLights({
  cold = false,
  warmth = cold ? 0 : 1,
  scenery = false,
}: {
  cold?: boolean;
  warmth?: number;
  scenery?: boolean;
}) {
  const sky = new Color("#9eb8cc").lerp(new Color("#d7d8c9"), warmth);
  const key = new Color("#b4cbd5").lerp(new Color("#f3ca93"), warmth);
  return (
    <>
      <hemisphereLight args={[sky, "#263747", 1.3]} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={scenery ? [-5, 10, 7] : [-3, 5, 6]}
        color={key}
        intensity={2.3}
        castShadow={scenery}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-far={45}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[3, 3, -2]} color="#83a9bb" intensity={0.8} />
    </>
  );
}
export function Particles({
  time,
  mist = false,
}: {
  time: number;
  mist?: boolean;
}) {
  return (
    <>
      {Array.from({ length: 40 }, (_, i) => (
        <mesh
          key={i}
          position={[
            ((i * 1.71 + time * 0.09) % 7) - 3.5,
            (i * 0.73 + time * 0.08) % 6,
            (i * 0.29) % 3,
          ]}
        >
          <boxGeometry args={[mist ? 0.035 : 0.015, 0.02, 0.012]} />
          <meshBasicMaterial
            color={mist ? "#adc2cc" : "#ddcfb4"}
            transparent
            opacity={0.18}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}
export function Pilot({
  time,
  alarmed = false,
  standing = false,
  animation,
}: {
  time: number;
  alarmed?: boolean;
  standing?: boolean;
  animation?: { asset: "pilot-reaction-v2"; frame: number; height: number };
}) {
  return (
    <group
      position={[-0.75, 0.18, 1.2]}
      rotation={[0, 0, alarmed ? Math.sin(time * 18) * 0.008 : 0]}
    >
      <PixelSprite
        x={0}
        z={0}
        time={time}
        artwork={animation?.asset ?? "pilot-four"}
        pose={animation?.frame ?? (standing ? 2 : alarmed ? 1 : 0)}
        height={animation?.height ?? 2.7}
        alignCells
        fixedPivotPose={animation ? 0 : undefined}
      />
      {!standing && (
        <group position={[0, 0.45, 0.35]}>
          <Block at={[0, 0, 0]} size={[0.7, 0.1, 0.13]} color="#536776" />
          <Block
            at={[-0.36, 0.12, 0]}
            size={[0.1, 0.32, 0.12]}
            color="#536776"
          />
          <Block
            at={[0.36, 0.12, 0]}
            size={[0.1, 0.32, 0.12]}
            color="#536776"
          />
          <Block
            at={[0, -0.25, -0.08]}
            size={[0.11, 0.5, 0.12]}
            color="#34465c"
          />
        </group>
      )}
    </group>
  );
}
export {
  DetailedRunway as Runway,
  IrelandAtlas as IrelandMap,
} from "./UkScenery";
export function Crown({ progress }: { progress: number }) {
  const f = smooth((progress - 0.35) / 0.45);
  return (
    <group position={[0, 1.9, 0]}>
      {Array.from({ length: 36 }, (_, i) => {
        const seed = ((i * 37) % 101) / 101;
        return (
          <mesh
            key={i}
            position={[
              (seed - 0.5) * f * 1.7,
              0.1 + f * (0.8 + seed),
              Math.sin(i) * 0.15,
            ]}
          >
            <boxGeometry args={[0.018, 0.02, 0.018]} />
            <meshBasicMaterial
              color="#bda77b"
              transparent
              opacity={Math.sin(f * Math.PI) * 0.6}
            />
          </mesh>
        );
      })}
    </group>
  );
}
function Arc({ points, dark }: { points: number[][]; dark: boolean }) {
  const geom = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(points.flat(), 3));
    return g;
  }, [points]);
  return (
    <lineLoop geometry={geom}>
      <lineBasicMaterial
        color={dark ? "#304453" : "#91b8a0"}
        transparent
        opacity={dark ? 0.3 : 0.6}
      />
    </lineLoop>
  );
}
export function TradeNetwork({ progress }: { progress: number }) {
  const routes = useMemo(
    () =>
      Array.from({ length: 100 }, (_, i) => {
        const start =
          i < 38
            ? [-0.03, 1.6, 0.4]
            : i % 2
              ? [3.2, 1.1, 0.4]
              : [-2.7, 1.15, 0.4];
        const end = worldCells[(i * 47) % worldCells.length];
        return Array.from({ length: 12 }, (_, j) => {
          const t = j / 11;
          return [
            start[0] + (end[0] - start[0]) * t,
            start[1] + (end[1] - start[1]) * t + Math.sin(t * Math.PI) * 0.5,
            0.4,
          ];
        });
      }),
    [],
  );
  return (
    <group position={[0, 2.2, 0]} scale={[0.29, 0.29, 0.29]}>
      {worldCells.map((p) => (
        <Block
          key={`${p[0]}-${p[1]}`}
          at={[p[0], p[1], 0]}
          size={[0.135, 0.135, 0.08]}
          color="#526e70"
          outline={false}
        />
      ))}
      {routes.map((r, i) => (
        <Arc key={i} points={r} dark={i < 38 && progress > 0.18 + i * 0.006} />
      ))}
    </group>
  );
}
