import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import {
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  AdditiveBlending,
  CanvasTexture,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import type { Episode } from "../engine/schema";
import { PixelStage } from "./PixelStage";
import { PixelSprite } from "./Sprite";
import { Block } from "./WorldKit";
import { Clinic, Cottage, Food, Hearth, Stocks, Straw } from "./TudorWorld";
import {
  reviewActor,
  reviewCamera,
  reviewShot,
  type ReviewShot,
} from "./review-motion";
import { DepthFocus } from "./DepthFocus";
import { smooth } from "./timeline";
import type { ReactNode } from "react";

function ReviewCamera({ episode, time }: { episode: Episode; time: number }) {
  const { camera, invalidate } = useThree(),
    p = reviewCamera(episode, time);
  useLayoutEffect(() => {
    camera.position.set(...p.position);
    camera.lookAt(...p.lookAt);
    if (camera instanceof PerspectiveCamera) camera.fov = p.fov;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, p]);
  return <DepthFocus focus={p.focus} amount={p.blur} />;
}
function Lighting({ mood }: { mood: ReviewShot["mood"] }) {
  const target = useMemo(() => {
    const t = new Object3D();
    t.position.set(0, 1, 0);
    t.updateMatrixWorld();
    return t;
  }, []);
  return (
    <>
      <hemisphereLight
        args={[mood === "warm" ? "#82b4bd" : "#648caf", "#2c2947", 0.8]}
      />
      <ambientLight color="#a7b5cf" intensity={0.22} />
      <directionalLight
        position={[-4, 4.5, 5]}
        target={target}
        color={
          mood === "danger"
            ? "#e9abb0"
            : mood === "cold"
              ? "#9cbdd3"
              : "#ffd0a0"
        }
        intensity={4.2}
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
      <directionalLight
        position={[1, 4, -4]}
        target={target}
        color="#9bc5d0"
        intensity={2.3}
      />
      <pointLight
        position={[-2, 2.5, -1.5]}
        color="#f9c78c"
        intensity={8}
        distance={9}
      />
    </>
  );
}
const brighter: Record<string, string> = {
  "614638": "#b7825c",
  cdbb95: "#c6c5b8",
  a59170: "#d5ad77",
  b8a064: "#d2b17b",
  bd9c53: "#d6b974",
  "342f3b": "#343545",
};
function WarmProps({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of materials)
        if (
          m instanceof MeshStandardMaterial &&
          brighter[m.color.getHexString()]
        )
          m.color.set(brighter[m.color.getHexString()]);
    });
  });
  return <group ref={ref}>{children}</group>;
}
function Shaft({ x = -2 }: { x?: number }) {
  return (
    <group position={[x, 2, -1.3]} rotation={[0, 0, -0.4]}>
      {[0, 0.32, 0.64].map((n) => (
        <mesh key={n} position={[n, 0, 0]}>
          <planeGeometry args={[0.23, 5.5]} />
          <meshBasicMaterial
            color="#f5d6ad"
            transparent
            opacity={0.07}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}
function Atmosphere({ time, quiet }: { time: number; quiet: boolean }) {
  const t = time * (quiet ? 0.18 : 1);
  return (
    <>
      <fog attach="fog" args={["#667b8d", 9, 25]} />
      <Shaft />
      {Array.from({ length: 44 }, (_, i) => (
        <mesh
          key={i}
          position={[
            ((i * 1.79 + t * 0.1) % 9) - 4.5,
            (i * 0.43 + t * 0.14) % 5.7,
            -3 + (i % 9) * 0.55,
          ]}
          rotation={[0, 0, time * 0.2 + i]}
        >
          <boxGeometry
            args={[0.018 + (i % 3) * 0.012, 0.018 + (i % 3) * 0.012, 0.018]}
          />
          <meshBasicMaterial
            color={i % 4 ? "#d8c9b0" : "#b8d7d5"}
            transparent
            opacity={0.25 + (i % 3) * 0.1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}
function Ground({ inside }: { inside: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = inside ? "#c7a577" : "#c6b28d";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = i % 3 ? "#baa17e" : "#d4ba91";
      ctx.fillRect((i * 41) % 128, (i * 67) % 128, 2 + (i % 4), 1 + (i % 2));
    }
    const t = new CanvasTexture(canvas);
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(7, 7);
    t.minFilter = t.magFilter = NearestFilter;
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [inside]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.04, 0]}
        receiveShadow
      >
        <planeGeometry args={[24, 22]} />
        <meshStandardMaterial map={texture} roughness={1} />
      </mesh>
      {Array.from({ length: 35 }, (_, i) => (
        <Block
          key={i}
          at={[((i * 3.1) % 12) - 6, 0, ((i * 1.7) % 10) - 4]}
          size={[0.05 + (i % 3) * 0.09, 0.015, 0.04]}
          color={inside ? "#deb989" : "#cdbb98"}
          outline={false}
        />
      ))}
      {!inside && (
        <>
          <mesh position={[-3, 4.7, -9]}>
            <circleGeometry args={[1.2, 32]} />
            <meshBasicMaterial color="#dfc9ad" fog={false} />
          </mesh>
          {[-6, -3, 3, 6].map((x) => (
            <group key={x}>
              <Block
                at={[x, 1.2, -7]}
                size={[0.25, 2.5, 0.25]}
                color="#747060"
              />
              <Block at={[x, 3, -7]} size={[2.2, 2.3, 1.3]} color="#557479" />
            </group>
          ))}
        </>
      )}
    </group>
  );
}
function Lantern({ x = 2, z = -1.8 }: { x?: number; z?: number }) {
  return (
    <group>
      <Block at={[x, 1.75, z]} size={[0.38, 0.55, 0.32]} color="#e1c69c" glow />
      <Block at={[x, 2.07, z]} size={[0.48, 0.1, 0.42]} color="#5c656d" />
      <pointLight
        position={[x, 1.8, z + 0.3]}
        color="#f6c38b"
        intensity={6}
        distance={5}
      />
    </group>
  );
}
function Market() {
  return (
    <group>
      {[-2.8, 2.8].map((x) => (
        <Block
          key={x}
          at={[x, 1.8, -1.7]}
          size={[0.14, 3.6, 0.14]}
          color="#b7825c"
        />
      ))}
      <group rotation={[-0.15, 0, 0]}>
        <Block at={[0, 3.5, -1.7]} size={[5.8, 0.12, 2.6]} color="#648c8c" />
        {[-2, -1, 0, 1, 2].map((x) => (
          <Block
            key={x}
            at={[x, 3.51, -1.7]}
            size={[0.5, 0.14, 2.6]}
            color="#d4bd96"
          />
        ))}
      </group>
      <group position={[-14, 0, 0]}>
        <Food />
      </group>
      <Block at={[-1.4, 0.55, -0.7]} size={[0.9, 1.1, 0.8]} color="#c59162" />
      <Block
        at={[-1.4, 1.12, -0.7]}
        size={[0.65, 0.08, 0.55]}
        color="#3d5260"
      />
    </group>
  );
}
function Years({ time }: { time: number }) {
  return (
    <group position={[1.55, 0.15, -0.4]}>
      {Array.from({ length: 64 }, (_, i) => {
        const layer = Math.floor(i / 16);
        return (
          <Block
            key={i}
            at={[
              (i % 4) * 0.22 - 0.35,
              layer * 0.23 + 0.12,
              Math.floor((i % 16) / 4) * 0.22,
            ]}
            size={[0.19, 0.19, 0.19]}
            color={i % 2 ? "#99a8a2" : "#d8be8e"}
            outline={false}
          />
        );
      })}
      <group position={[0, 1.25 + Math.sin(time * 2) * 0.025, 0.3]}>
        <Block at={[0, 0, 0]} size={[1.1, 0.12, 0.65]} color="#b9916d" />
        {[-0.53, 0.53].map((x) => (
          <Block
            key={x}
            at={[x, 0.22, 0]}
            size={[0.1, 0.5, 0.8]}
            color="#b9916d"
          />
        ))}
        <Block at={[0, 0.12, 0]} size={[0.85, 0.08, 0.52]} color="#ddd8c1" />
      </group>
    </group>
  );
}
function NPC({
  x,
  z = 0,
  pose,
  cam,
  time,
  height = 2.35,
}: {
  x: number;
  z?: number;
  pose: number;
  cam: number[];
  time: number;
  height?: number;
}) {
  return (
    <PixelSprite
      x={x}
      z={z}
      time={time}
      pose={pose}
      artwork="tudor"
      height={height}
      muted
      yaw={Math.atan2(cam[0] - x, cam[2] - z)}
    />
  );
}
function Set({
  episode,
  time,
  shot,
}: {
  episode: Episode;
  time: number;
  shot: ReviewShot;
}) {
  const cam = reviewCamera(episode, time),
    scene = episode.scenes.find((s) => s.id === shot.sceneId)!,
    fire = episode.scenes.find((s) => s.action === "strike")!,
    law = episode.scenes.find((s) => s.action === "warn")!;
  const set = scene.set,
    interior = set === "tudor-cottage" || set === "tudor-clinic";
  return (
    <>
      <Ground inside={interior} />
      <WarmProps>
        {set === "tudor-cottage" && (
          <>
            <Cottage x={0} time={time} opening />
            <Straw />
            <Straw x={0.8} z={3.1} />
            <Hearth
              time={time}
              cue={fire.start + (fire.actionCue ?? 0)}
              tools={false}
              origin={[-0.3, 1.15, 1.8]}
            />
          </>
        )}
        {set === "tudor-village" && (
          <>
            <Cottage x={-3.1} time={0} />
            <group position={[2, 0, -2.5]}>
              <Cottage x={3.8} time={0} />
            </group>
          </>
        )}
        {set === "tudor-market" && <Market />}
        {set === "tudor-square" && (
          <>
            <Block at={[0, 2, -3.2]} size={[6, 4, 0.4]} color="#a3aeb2" />
            <Block at={[0, 1.6, -2.9]} size={[1.9, 3.2, 0.2]} color="#344957" />
            <Block
              at={[0, 3.4, -2.7]}
              size={[2.2, 0.25, 0.5]}
              color="#c8b79b"
            />
            <group position={[-21, 0, 0]}>
              <Stocks local={time - law.start} cue={law.actionCue ?? 1.5} />
            </group>
            <Lantern />
          </>
        )}
        {set === "tudor-clinic" && (
          <>
            <Cottage x={0} time={0} />
            <group position={[-28, 0, 0]}>
              <Clinic />
            </group>
            <Lantern x={-2.3} />
          </>
        )}
        {shot.activity === "years" && <Years time={time} />}
      </WarmProps>
      {set === "tudor-village" && shot.activity !== "years" && (
        <>
          <NPC x={1.25} z={0} pose={1} cam={cam.position} time={time} />
          <NPC
            x={2.5}
            z={-1.7}
            pose={2}
            cam={cam.position}
            time={time}
            height={2.1}
          />
        </>
      )}
      {set === "tudor-market" && (
        <NPC x={2.2} z={-0.8} pose={3} cam={cam.position} time={time} />
      )}
      {set === "tudor-square" && (
        <NPC
          x={2.1}
          z={-0.35}
          pose={5}
          cam={cam.position}
          time={time}
          height={2.5}
        />
      )}
      {set === "tudor-clinic" && (
        <NPC x={2} z={-0.3} pose={7} cam={cam.position} time={time} />
      )}
    </>
  );
}
function Character({ episode, time }: { episode: Episode; time: number }) {
  const actor = reviewActor(episode, time),
    cam = reviewCamera(episode, time),
    { shot, local } = reviewShot(episode, time);
  return (
    <group position={[actor.x, actor.y, actor.z]} rotation={[0, 0, actor.lean]}>
      <PixelSprite
        x={0}
        z={0}
        time={time >= episode.duration - 0.2 ? 0 : time}
        pose={actor.pose}
        artwork="tudor-actions"
        scarfPop
        height={2.65}
        yaw={Math.atan2(cam.position[0] - actor.x, cam.position[2] - actor.z)}
      />
      {shot.activity === "cold" &&
        Array.from({ length: 5 }, (_, i) => (
          <Block
            key={i}
            at={[
              0.3 + ((local + i * 0.15) % 0.8) * 0.55,
              1.65 + ((local + i * 0.15) % 0.8) * 0.2,
              0.1,
            ]}
            size={[0.07, 0.06, 0.03]}
            color="#c1dad8"
            glow
            outline={false}
          />
        ))}
      {shot.activity === "cut" &&
        Array.from({ length: 7 }, (_, i) => (
          <Block
            key={i}
            at={[
              0.17 + Math.sin(i * 1.8 + time) * 0.18,
              1.13 + Math.cos(i * 2 + time) * 0.15,
              0.08,
            ]}
            size={[0.035, 0.035, 0.025]}
            color="#9cb8b0"
            glow
            outline={false}
          />
        ))}
    </group>
  );
}
function Transition({ shot, local }: { shot: ReviewShot; local: number }) {
  if (shot.cutStyle !== "wipe" || local > 0.22) return null;
  const travel = smooth(local / 0.22);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${i * 16 - 4}%`,
            left: `${-130 + travel * 260 + (i % 3) * 6}%`,
            width: "120%",
            height: "20%",
            background: i % 2 ? "#b7a17f" : "#7d9499",
            transform: "rotate(-12deg)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
}
export function TudorReviewWorld({
  episode,
  portrait,
}: {
  episode: Episode;
  portrait: boolean;
}) {
  const { fps } = useVideoConfig(),
    time = useCurrentFrame() / fps,
    { shot, local } = reviewShot(episode, time),
    edit = episode.reviewEdit!;
  const reset = time >= episode.duration - 0.2;
  const actual = reset
    ? { ...edit.shots[0], start: time, activity: "wake" as const }
    : shot;
  const quiet = shot.angle === "quiet";
  return (
    <AbsoluteFill style={{ background: "#29404e" }}>
      <PixelStage portrait={portrait} background="#29404e">
        <color
          attach="background"
          args={[shot.mood === "warm" ? "#546c7c" : "#2e485e"]}
        />
        <Lighting mood={reset ? "warm" : shot.mood} />
        <ReviewCamera episode={episode} time={time} />
        <Set
          episode={episode}
          time={reset || shot.activity === "loop" ? 0 : time}
          shot={actual}
        />
        <Character episode={episode} time={time} />
        <Atmosphere
          time={
            shot.activity === "loop" ? time - episode.duration + 1 / fps : time
          }
          quiet={quiet}
        />
      </PixelStage>
      <Transition shot={shot} local={local} />
      {shot.activity === "brace" && local < 0.18 && (
        <AbsoluteFill
          style={{
            background: "#d88c8c",
            opacity: (1 - local / 0.18) * 0.24,
            pointerEvents: "none",
          }}
        />
      )}
      <AbsoluteFill
        style={{
          boxShadow: "inset 0 0 200px 45px #11233435",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}
