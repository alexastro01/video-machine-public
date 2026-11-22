import { useEffect, useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import {
  CanvasTexture,
  EdgesGeometry,
  ExtrudeGeometry,
  NearestFilter,
  Object3D,
  Path,
  PerspectiveCamera,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
} from "three";
import type { Episode } from "../engine/schema";
import { Block } from "./WorldKit";
import { PixelStage } from "./PixelStage";
import { PixelSprite } from "./Sprite";
import { FocusSubject, FocusValues, useSubjectHighlight } from "./FocusContext";
import { focusState, type Vec3 } from "./focus";
import { smooth, worldState } from "./timeline";
import { tudorActor, tudorCamera, tudorClock } from "./tudor-motion";
const p = {
  wood: "#614638",
  dark: "#342f3b",
  plaster: "#cdbb95",
  thatch: "#b8a064",
  stone: "#7e8083",
  linen: "#d9cfaf",
  red: "#a5654c",
  green: "#657452",
  earth: "#a59170",
  sky: "#53677b",
};
function Dirt() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = p.earth;
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 180; i++) {
      const x = (i * 41) % 128,
        y = (i * 67) % 128;
      ctx.fillStyle = i % 3 ? "#a08c69" : "#b6a17d";
      ctx.fillRect(x, y, 2 + (i % 4), 1 + (i % 2));
    }
    const t = new CanvasTexture(c);
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(15, 5);
    t.minFilter = t.magFilter = NearestFilter;
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[14, -0.025, 0]}
      receiveShadow
    >
      <planeGeometry args={[46, 15]} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  );
}
export function Straw({ x = -0.85, z = 1.15 }: { x?: number; z?: number }) {
  return (
    <group position={[x, 0, z]}>
      {Array.from({ length: 23 }, (_, i) => (
        <group key={i} rotation={[0, (i % 5) * 0.31, 0]}>
          <Block
            at={[
              ((i * 7) % 11) / 8 - 0.65,
              0.035 + (i % 3) * 0.014,
              ((i * 13) % 17) / 15 - 0.5,
            ]}
            size={[0.4 + (i % 4) * 0.16, 0.035, 0.06]}
            color={i % 2 ? "#bd9c53" : "#d2b576"}
            outline={false}
          />
        </group>
      ))}
    </group>
  );
}
function Barrel({ x, z }: { x: number; z: number }) {
  return (
    <group>
      <Block at={[x, 0.57, z]} size={[0.75, 1.1, 0.75]} color={p.wood} />
      {[0.22, 0.82].map((y) => (
        <Block
          key={y}
          at={[x, y, z]}
          size={[0.79, 0.09, 0.79]}
          color={p.dark}
        />
      ))}
    </group>
  );
}
export function Cottage({
  x,
  time,
  opening = false,
}: {
  x: number;
  time: number;
  opening?: boolean;
}) {
  const door = opening ? smooth((time - 0.12) / 0.65) : 0.2;
  return (
    <group position={[x, 0, 0]}>
      <Block
        at={[-1.25, 1.9, -3.35]}
        size={[3.3, 3.8, 0.23]}
        color={p.plaster}
      />
      <Block
        at={[2.25, 1.9, -3.35]}
        size={[1.3, 3.8, 0.23]}
        color={p.plaster}
      />
      <Block at={[1, 3.1, -3.35]} size={[1.2, 1.4, 0.23]} color={p.plaster} />
      {[-2.85, 0, 2.85].map((n) => (
        <Block
          key={n}
          at={[n, 2, -3.18]}
          size={[0.16, 4, 0.18]}
          color={p.wood}
        />
      ))}
      {[0.3, 3.7].map((y) => (
        <Block
          key={y}
          at={[0, y, -3.15]}
          size={[5.8, 0.16, 0.2]}
          color={p.wood}
        />
      ))}
      <group position={[-1.5, 2.4, -3.05]}>
        <Block at={[0, 0, 0]} size={[1.3, 1.25, 0.12]} color="#8da3af" />
        <Block at={[0, 0, 0.08]} size={[0.09, 1.3, 0.09]} color={p.wood} />
        <Block at={[0, 0, 0.08]} size={[1.3, 0.09, 0.09]} color={p.wood} />
      </group>
      <group position={[0.4, 0, -3.04]} rotation={[0, -door * 0.9, 0]}>
        <Block at={[0.6, 1.2, 0]} size={[1.2, 2.4, 0.18]} color={p.wood} />
        <Block
          at={[0.9, 1.25, 0.13]}
          size={[0.11, 0.12, 0.09]}
          color={p.dark}
        />
      </group>
      {[-1, 1].map((s) => (
        <group
          key={s}
          position={[s * 1.52, 4.5, -3.35]}
          rotation={[0, 0, -s * 0.5]}
        >
          <Block at={[0, 0, 0]} size={[3.5, 0.32, 2.1]} color={p.thatch} />
          {Array.from({ length: 9 }, (_, i) => (
            <Block
              key={i}
              at={[(i - 4) * 0.35, 0.18, 0]}
              size={[0.045, 0.035, 2.13]}
              color="#c8af73"
              outline={false}
            />
          ))}
        </group>
      ))}
      <Block at={[0, 5.33, -3.35]} size={[0.25, 0.15, 2.2]} color={p.wood} />
    </group>
  );
}
function Tree({ x, z }: { x: number; z: number }) {
  return (
    <group>
      <Block at={[x, 1, z]} size={[0.35, 2, 0.35]} color={p.wood} />
      <Block at={[x, 2.65, z]} size={[1.7, 1.4, 1.5]} color={p.green} />
      <Block at={[x + 0.4, 3.45, z]} size={[0.9, 0.5, 1]} color="#76825c" />
    </group>
  );
}
function Bench({ x, z = 0.35 }: { x: number; z?: number }) {
  return (
    <group>
      <Block at={[x, 0.9, z]} size={[2.15, 0.15, 1.25]} color={p.wood} />
      {[-0.85, 0.85].map((s) => (
        <Block
          key={s}
          at={[x + s, 0.44, z]}
          size={[0.13, 0.88, 0.8]}
          color={p.wood}
        />
      ))}
    </group>
  );
}
export function Hearth({
  time,
  cue,
  tools = true,
  origin = [-0.03, 1.26, 1.35],
}: {
  time: number;
  cue: number;
  tools?: boolean;
  origin?: Vec3;
}) {
  const phase = (((time - cue) % 1.1) + 1.1) % 1.1;
  const active = time >= cue;
  const stroke = active ? Math.sin(Math.min(1, phase / 0.24) * Math.PI) : 0;
  const ember = active ? smooth((time - cue - 1.15) / 1.2) : 0;
  return (
    <group>
      <Bench x={0.4} z={1} />
      <FocusSubject target="tinder">
        <Block
          at={[0.43, 1.02, 1.1]}
          size={[0.65, 0.12, 0.4]}
          color="#99784b"
        />
        {[0, 1, 2, 3].map((i) => (
          <Block
            key={i}
            at={[0.18 + i * 0.13, 1.1, 1.08 + (i % 2) * 0.12]}
            size={[0.3, 0.04, 0.04]}
            color={p.thatch}
            outline={false}
          />
        ))}
      </FocusSubject>
      {tools && (
        <group position={origin} rotation={[0, 0, -0.3]}>
          <Block at={[0, 0, 0]} size={[0.19, 0.15, 0.12]} color="#87939d" />
          <Block
            at={[0.15 - stroke * 0.13, 0.14 - stroke * 0.1, 0]}
            size={[0.24, 0.06, 0.08]}
            color="#3b4653"
          />
        </group>
      )}
      {active &&
        phase >= 0.13 &&
        phase < 0.62 &&
        Array.from({ length: 9 }, (_, i) => {
          const t = Math.max(0, phase - 0.13),
            seed = i * 0.73;
          return (
            <Block
              key={i}
              at={[
                origin[0] + t * (0.7 + Math.sin(seed) * 0.45),
                origin[1] + t * (1.3 + Math.cos(seed) * 0.55) - t * t * 3,
                origin[2] - (tools ? 0 : t * 0.8) + t * Math.sin(i) * 0.25,
              ]}
              size={[0.035, 0.035, 0.035]}
              color="#ffcf73"
              glow
              outline={false}
            />
          );
        })}
      {ember > 0 && (
        <>
          <Block
            at={[0.43, 1.11, 1.15]}
            size={[0.18, 0.06, 0.16]}
            color="#ef9545"
            glow
            outline={false}
          />
          <pointLight
            position={[0.4, 1.35, 1.2]}
            color="#ffab55"
            intensity={ember * 1.8}
            distance={3}
          />
        </>
      )}
      <Block at={[1.7, 0.25, -1.2]} size={[1.4, 0.5, 1.25]} color={p.stone} />
      <Block at={[1.7, 0.6, -1.25]} size={[0.75, 0.3, 0.7]} color={p.dark} />
      <Block at={[1.7, 0.88, -1.25]} size={[0.85, 0.12, 0.75]} color={p.dark} />
      <Barrel x={-2.2} z={-1.7} />
    </group>
  );
}
export function Food() {
  return (
    <group>
      <Bench x={14.65} />
      <Block at={[14.2, 1.1, 0.45]} size={[0.78, 0.3, 0.58]} color="#b7834b" />
      {[-0.18, 0, 0.18].map((s) => (
        <group key={s} rotation={[0, 0, -0.25]}>
          <Block
            at={[14.2 + s, 1.26, 0.45]}
            size={[0.045, 0.035, 0.47]}
            color="#e0b772"
            outline={false}
          />
        </group>
      ))}
      <mesh position={[15.1, 1.04, 0.37]} castShadow>
        <cylinderGeometry args={[0.36, 0.26, 0.22, 8]} />
        <meshStandardMaterial color="#8b5d42" roughness={1} />
      </mesh>
      <mesh position={[15.1, 1.16, 0.37]}>
        <cylinderGeometry args={[0.31, 0.31, 0.02, 8]} />
        <meshStandardMaterial color="#8c8b55" />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <Block
          key={i}
          at={[15 + ((i * 3) % 7) / 20, 1.19, 0.22 + ((i * 7) % 5) / 15]}
          size={[0.08, 0.03, 0.05]}
          color="#b7aa6b"
          outline={false}
        />
      ))}
      <Block
        at={[14.6, 1.17, -0.02]}
        size={[0.25, 0.4, 0.25]}
        color="#936844"
      />
      <Barrel x={16} z={-1.9} />
      <Block at={[13, 0.25, -1.5]} size={[0.9, 0.5, 0.7]} color={p.wood} />
    </group>
  );
}
const stocksShape = new Shape();
stocksShape.moveTo(-1, -0.29);
stocksShape.lineTo(1, -0.29);
stocksShape.lineTo(1, 0.29);
stocksShape.lineTo(-1, 0.29);
stocksShape.closePath();
for (const x of [-0.35, 0.35]) {
  const hole = new Path();
  hole.absellipse(x, 0, 0.17, 0.17, 0, Math.PI * 2, true);
  stocksShape.holes.push(hole);
}
const stocksGeometry = new ExtrudeGeometry(stocksShape, {
  depth: 0.18,
  bevelEnabled: false,
});
const stocksEdges = new EdgesGeometry(stocksGeometry);
export function Stocks({ local, cue }: { local: number; cue: number }) {
  const h = useSubjectHighlight();
  const lock = smooth((local - cue) / 0.3);
  return (
    <group position={[21.45, 0.62, 0.6]}>
      <mesh geometry={stocksGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={p.wood}
          roughness={1}
          emissive="#cda365"
          emissiveIntensity={h * 0.2}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <lineSegments geometry={stocksEdges}>
        <lineBasicMaterial color={h > 0.4 ? "#e7c582" : p.dark} />
      </lineSegments>
      {[-1.1, 1.1].map((s) => (
        <Block
          key={s}
          at={[s, -0.02, 0.08]}
          size={[0.19, 1.2, 0.32]}
          color={p.wood}
        />
      ))}
      <Block
        at={[0, 0.35 + 0.2 * (1 - lock), 0.12]}
        size={[1.9, 0.08, 0.18]}
        color={p.dark}
      />
      <Block at={[0, -0.03, -0.8]} size={[1.7, 0.16, 0.75]} color={p.wood} />
      {[-0.7, 0.7].map((s) => (
        <Block
          key={s}
          at={[s, -0.35, -0.8]}
          size={[0.15, 0.65, 0.6]}
          color={p.wood}
        />
      ))}
    </group>
  );
}
export function Clinic() {
  return (
    <group>
      <Bench x={28.6} z={0.65} />
      <Block at={[28.6, 1.01, 0.65]} size={[1.8, 0.05, 1.05]} color={p.linen} />
      <FocusSubject target="tools">
        <group position={[28.65, 1.08, 0.48]} rotation={[0, -0.35, 0]}>
          <Block at={[0, 0, 0]} size={[0.6, 0.045, 0.06]} color="#8d999f" />
        </group>
        <Block
          at={[28.85, 1.08, 0.7]}
          size={[0.5, 0.04, 0.06]}
          color="#8e9ba2"
        />
        <Block
          at={[28.6, 1.08, 0.82]}
          size={[0.09, 0.04, 0.55]}
          color="#9ea9a8"
        />
      </FocusSubject>
      <Block at={[28.1, 1.13, 0.4]} size={[0.35, 0.2, 0.25]} color={p.linen} />
      <Block at={[29.3, 1.18, 0.4]} size={[0.2, 0.3, 0.2]} color="#786d4d" />
      <Block at={[28.1, 0.75, -1.25]} size={[1.1, 0.16, 1.15]} color={p.wood} />
      <Block at={[28.1, 1.5, -1.75]} size={[1.1, 1.65, 0.16]} color={p.wood} />
      {[-0.4, 0.4].map((s) => (
        <Block
          key={s}
          at={[28.1 + s, 0.38, -1.25]}
          size={[0.12, 0.76, 0.9]}
          color={p.wood}
        />
      ))}
      <Barrel x={26.2} z={-1.7} />
    </group>
  );
}
function Camera({ episode, time }: { episode: Episode; time: number }) {
  const { camera, invalidate } = useThree();
  const pose = tudorCamera(episode, time);
  useLayoutEffect(() => {
    camera.position.set(...pose.position);
    camera.lookAt(...pose.lookAt);
    if (camera instanceof PerspectiveCamera) camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, pose]);
  return null;
}
function Light({
  point,
  amount,
  x,
}: {
  point: Vec3;
  amount: number;
  x: number;
}) {
  const keyTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(x, 0, 0);
    o.updateMatrixWorld();
    return o;
  }, [x]);
  const focusTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(...point);
    o.updateMatrixWorld();
    return o;
  }, [point]);
  return (
    <>
      <hemisphereLight args={["#b1c9e3", "#34374d", 1.2]} />
      <ambientLight color="#8193be" intensity={0.25} />
      <directionalLight
        position={[x - 3, 8, 5]}
        target={keyTarget}
        color="#ffd39c"
        intensity={3.1 - amount * 0.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
      />
      <spotLight
        position={[point[0] - 1, point[1] + 3, point[2] + 2]}
        target={focusTarget}
        intensity={amount * 12}
        color="#ffe0a1"
        angle={0.48}
        penumbra={0.6}
        distance={8}
        decay={2}
      />
    </>
  );
}
function Villager({
  x,
  z,
  time,
  pose,
  height = 2.35,
  cam,
}: {
  x: number;
  z: number;
  time: number;
  pose: number;
  height?: number;
  cam: Vec3;
}) {
  return (
    <PixelSprite
      x={x}
      z={z}
      time={time}
      pose={pose}
      artwork="tudor"
      height={height}
      yaw={Math.atan2(cam[0] - x, cam[2] - z)}
    />
  );
}
function TudorScene({ episode, time }: { episode: Episode; time: number }) {
  const state = worldState(episode, time),
    hero = tudorActor(episode, time),
    cam = tudorCamera(episode, time),
    attention = focusState(episode, time);
  const fire = episode.scenes.find((s) => s.action === "strike");
  const fireCue = (fire?.start ?? 4) + (fire?.actionCue ?? 1.5);
  const law = episode.scenes.find((s) => s.action === "warn");
  return (
    <FocusValues.Provider value={attention.weights}>
      <Camera episode={episode} time={time} />
      <color attach="background" args={[p.sky]} />
      <fog attach="fog" args={[p.sky, 16, 42]} />
      <Light point={attention.point} amount={attention.amount} x={state.x} />
      <Dirt />
      {[0, 7, 14, 28].map((x) => (
        <Cottage key={x} x={x} time={time} opening={x === 0} />
      ))}
      {[
        [-3, -4],
        [4, -5],
        [10, -5],
        [18, -4],
        [24, -5],
        [32, -4],
      ].map(([x, z]) => (
        <Tree key={x} x={x} z={z} />
      ))}
      <FocusSubject target="straw">
        <Straw />
      </FocusSubject>
      <Hearth time={time} cue={fireCue} />
      <FocusSubject target="villagers">
        <Villager
          x={8.1}
          z={0.1}
          time={time}
          pose={state.scene.action === "puzzle" ? 1 : 0}
          cam={cam.position}
        />
        <Villager
          x={9.4}
          z={-1.7}
          time={time}
          pose={2}
          height={2.15}
          cam={cam.position}
        />
      </FocusSubject>
      <FocusSubject target="food">
        <Food />
      </FocusSubject>
      <Villager
        x={16}
        z={-0.4}
        time={time}
        pose={state.scene.action === "eat" ? 3 : 2}
        cam={cam.position}
      />
      <FocusSubject target="stocks">
        <Stocks local={time - (law?.start ?? 24)} cue={law?.actionCue ?? 1.5} />
      </FocusSubject>
      <Villager
        x={23}
        z={-0.35}
        time={time}
        pose={state.scene.action === "warn" ? 5 : 4}
        height={2.5}
        cam={cam.position}
      />
      <Clinic />
      <Villager
        x={29.7}
        z={-0.3}
        time={time}
        pose={state.scene.action === "treat" ? 7 : 6}
        cam={cam.position}
      />
      <FocusSubject target="traveler">
        <group position={[hero.x, hero.y, 1.2]} rotation={[0, 0, hero.lean]}>
          <PixelSprite
            x={0}
            z={0}
            time={time}
            pose={hero.pose}
            artwork="rpg"
            walking={hero.walking}
            yaw={Math.atan2(cam.position[0] - hero.x, cam.position[2] - 1.2)}
          />
        </group>
      </FocusSubject>
    </FocusValues.Provider>
  );
}
export function TudorWorld({
  episode,
  portrait,
}: {
  episode: Episode;
  portrait: boolean;
}) {
  const frame = useCurrentFrame(),
    { fps } = useVideoConfig();
  const loop = tudorClock(episode, frame / fps);
  return (
    <AbsoluteFill>
      <PixelStage portrait={portrait} background={p.sky}>
        <TudorScene episode={episode} time={loop.worldTime} />
      </PixelStage>
      {loop.flash > 0 && (
        <AbsoluteFill
          style={{
            background: "#d8c7a2",
            opacity: loop.flash,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
}
