import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  EdgesGeometry,
  ExtrudeGeometry,
  Shape,
  Color,
  PerspectiveCamera,
  InstancedMesh,
  NearestFilter,
  Object3D,
  PCFShadowMap,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import type { Episode } from "../engine/schema";
import { PixelSprite } from "./Sprite";
import { actorPose, copyPose, smooth, worldState } from "./timeline";
import { cameraState, focusState, loopState, type Vec3 } from "./focus";
import { FocusValues, FocusSubject, useSubjectHighlight } from "./FocusContext";
import { Block, colors, type Vec } from "./WorldKit";
const cloudShape = new Shape();
cloudShape.moveTo(-0.75, -0.25);
cloudShape.lineTo(0.75, -0.25);
cloudShape.lineTo(0.75, 0.25);
cloudShape.lineTo(0.55, 0.25);
cloudShape.lineTo(0.55, 0.75);
cloudShape.lineTo(-0.1, 0.75);
cloudShape.lineTo(-0.1, 0.55);
cloudShape.lineTo(-0.65, 0.55);
cloudShape.lineTo(-0.65, 0.25);
cloudShape.lineTo(-0.75, 0.25);
cloudShape.closePath();
const cloudGeometry = new ExtrudeGeometry(cloudShape, {
  depth: 0.35,
  bevelEnabled: false,
});
const cloudEdges = new EdgesGeometry(cloudGeometry);
function Ground() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#a19b9b";
    ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 32)
      for (let x = 0; x < 128; x += 32) {
        ctx.fillStyle = (x + y) % 64 === 0 ? "#b2a6a0" : "#a89fa2";
        ctx.fillRect(x + 1, y + 1, 30, 30);
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = "#b9b0aa";
          ctx.fillRect(x + 5 + i * 6, y + 6 + (i % 2) * 11, 2, 1);
        }
      }
    const t = new CanvasTexture(c);
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(14, 4);
    t.magFilter = t.minFilter = NearestFilter;
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[18, -0.025, 0]}
      receiveShadow
    >
      <planeGeometry args={[54, 15]} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  );
}
function Brain({
  x,
  y = 2.2,
  time,
  small = false,
}: {
  x: number;
  y?: number;
  time: number;
  small?: boolean;
}) {
  const highlight = useSubjectHighlight();
  const ref = useRef<InstancedMesh>(null);
  const cubes = useMemo(() => {
    const a: Vec[] = [];
    for (let ix = -4; ix <= 4; ix++)
      for (let iy = -3; iy <= 3; iy++)
        for (let iz = -3; iz <= 3; iz++) {
          if (
            (ix / 4.5) ** 2 + (iy / 3.4) ** 2 + (iz / 3.2) ** 2 < 1 &&
            !(Math.abs(ix) < 0.5 && iy > 0)
          )
            a.push([ix * 0.18, iy * 0.18, iz * 0.18]);
        }
    return a;
  }, []);
  useLayoutEffect(() => {
    const o = new Object3D();
    cubes.forEach((p, i) => {
      o.position.set(...p);
      o.scale.setScalar(0.175);
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [cubes]);
  return (
    <group
      position={[x, y, 0]}
      rotation={[0.08, Math.sin(time * 0.4) * 0.12, 0]}
      scale={small ? 0.65 : 1}
    >
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, cubes.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry />
        <meshStandardMaterial
          color={colors.coral}
          roughness={0.8}
          emissive={colors.coral}
          emissiveIntensity={highlight * 0.36}
        />
      </instancedMesh>
    </group>
  );
}
function Pedestal({ x }: { x: number }) {
  return (
    <>
      <Block at={[x, 0.65, -0.15]} size={[2, 1.3, 1.6]} color={colors.blue} />
      <Block
        at={[x, 1.34, -0.15]}
        size={[2.15, 0.13, 1.75]}
        color={colors.cream}
      />
      <Block
        at={[x, 0.78, 0.68]}
        size={[1.2, 0.08, 0.04]}
        color={colors.teal}
        glow
      />
    </>
  );
}
function Cloud({ x, y = 3.3 }: { x: number; y?: number }) {
  const highlight = useSubjectHighlight();
  const edgeColor = useMemo(
    () => new Color(colors.ink).lerp(new Color("#ffc96f"), highlight * 0.9),
    [highlight],
  );
  return (
    <group position={[x, y, -0.5]}>
      <mesh geometry={cloudGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={colors.light}
          roughness={0.85}
          emissive="#efb768"
          emissiveIntensity={highlight * 0.32}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      <lineSegments geometry={cloudEdges}>
        <lineBasicMaterial color={edgeColor} />
      </lineSegments>
    </group>
  );
}
function Portal({
  x,
  time,
  active = false,
}: {
  x: number;
  time: number;
  active?: boolean;
}) {
  return (
    <group position={[x, 0, -0.5]}>
      <Block at={[0, 0.15, 0]} size={[2.3, 0.3, 1.6]} color={colors.ink} />
      <Block
        at={[-1.05, 1.7, -0.25]}
        size={[0.22, 3.2, 0.3]}
        color={colors.teal}
      />
      <Block
        at={[1.05, 1.7, -0.25]}
        size={[0.22, 3.2, 0.3]}
        color={colors.teal}
      />
      <Block at={[0, 3.3, -0.25]} size={[2.3, 0.22, 0.3]} color={colors.teal} />
      {active &&
        Array.from({ length: 9 }, (_, i) => (
          <Block
            key={i}
            at={[
              Math.sin(i * 2.3) * 0.7,
              0.5 + ((time * 0.6 + i * 0.34) % 2.5),
              -0.2,
            ]}
            size={[0.07, 0.07, 0.07]}
            color={colors.light}
            glow
            outline={false}
          />
        ))}
      <FocusSubject target="cloud">
        <Cloud x={0} y={3.85} />
      </FocusSubject>
    </group>
  );
}
function Worm({ time }: { time: number }) {
  return (
    <group position={[6, 1.55, 0]}>
      {Array.from({ length: 9 }, (_, i) => (
        <Block
          key={i}
          at={[
            (i - 4) * 0.16,
            0.08 + Math.sin(time * 2 + i * 0.65) * 0.055,
            Math.cos(i * 0.6) * 0.1,
          ]}
          size={[0.19, 0.2, 0.25]}
          color={i === 8 ? colors.orange : colors.cream}
        />
      ))}
      <Block
        at={[0.7, 0.15, 0.14]}
        size={[0.04, 0.04, 0.04]}
        color={colors.ink}
      />
    </group>
  );
}
function Fly({ time }: { time: number }) {
  return (
    <group
      position={[12, 2.05, 0]}
      rotation={[0, Math.sin(time * 0.3) * 0.18, 0]}
    >
      <Block at={[0, 0, 0]} size={[0.43, 0.6, 0.75]} color={colors.ink} />
      <Block
        at={[0, 0.15, 0.5]}
        size={[0.62, 0.42, 0.3]}
        color={colors.coral}
      />
      {[-1, 1].map((s) => (
        <group key={s} rotation={[0, 0, s * (0.2 + Math.sin(time * 9) * 0.07)]}>
          <Block
            at={[s * 0.58, 0.16, -0.1]}
            size={[0.82, 0.07, 0.7]}
            color="#c1cdd5"
          />
          <Block
            at={[s * 0.3, -0.35, 0.1]}
            size={[0.45, 0.05, 0.05]}
            color={colors.ink}
          />
        </group>
      ))}
    </group>
  );
}
function Tissue({ time }: { time: number }) {
  return (
    <group position={[24, 2.05, 0]}>
      <Block at={[0, 0, 0]} size={[1.25, 1.25, 1.25]} color={colors.coral} />
      {Array.from({ length: 12 }, (_, i) => (
        <Block
          key={i}
          at={[((i * 13) % 9) / 9 - 0.4, ((i * 7) % 11) / 11 - 0.45, 0.64]}
          size={[0.07, 0.07, 0.04]}
          color={colors.cream}
        />
      ))}
      <Block
        at={[0, Math.sin(time * 1.7) * 0.65, 0.7]}
        size={[1.45, 0.035, 0.05]}
        color="#8fe4d5"
        glow
      />
      {Array.from({ length: 8 }, (_, i) => (
        <Block
          key={i}
          at={[
            0.9 + ((time * 0.7 + i * 0.22) % 1.8),
            0.6 + Math.sin(i) * 0.3,
            -0.5,
          ]}
          size={[0.07, 0.07, 0.07]}
          color={colors.light}
          glow
          outline={false}
        />
      ))}
    </group>
  );
}
function Server({ x, z = -2.4 }: { x: number; z?: number }) {
  return (
    <group position={[x, 0, z]}>
      <Block at={[0, 1.6, 0]} size={[0.85, 3.2, 0.8]} color={colors.ink} />
      {Array.from({ length: 7 }, (_, i) => (
        <group key={i}>
          <Block
            at={[0, 0.35 + i * 0.4, 0.42]}
            size={[0.65, 0.21, 0.04]}
            color={colors.blue}
          />
          <Block
            at={[-0.22, 0.35 + i * 0.4, 0.45]}
            size={[0.07, 0.06, 0.03]}
            color={i % 2 ? colors.orange : colors.teal}
            glow
          />
        </group>
      ))}
    </group>
  );
}
function Room({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <Block at={[0, 1.8, -3.5]} size={[5.5, 3.6, 0.22]} color="#7e7b96" />
      <Block
        at={[0, 3.75, -3.5]}
        size={[5.6, 0.16, 0.32]}
        color={colors.cream}
      />
      <Block
        at={[-1.55, 2.35, -3.35]}
        size={[1.6, 1.55, 0.1]}
        color="#eec592"
        glow
      />
      <Block
        at={[-1.55, 2.35, -3.26]}
        size={[0.08, 1.55, 0.08]}
        color={colors.blue}
      />
      <Block
        at={[-1.55, 2.35, -3.26]}
        size={[1.6, 0.08, 0.08]}
        color={colors.blue}
      />
      <Block at={[2.3, 1, -2.8]} size={[0.5, 2, 0.5]} color={colors.blue} />
      <Block
        at={[2.3, 2.1, -2.8]}
        size={[0.65, 0.15, 0.65]}
        color={colors.orange}
        glow
      />
      <Block
        at={[-2.5, 0.25, -2]}
        size={[0.65, 0.5, 0.65]}
        color={colors.coral}
      />
      {[0, 1, 2].map((i) => (
        <Block
          key={i}
          at={[-2.5 + (i - 1) * 0.15, 0.8 + i * 0.18, -2]}
          size={[0.16, 0.8 - i * 0.15, 0.15]}
          color={colors.teal}
        />
      ))}
    </group>
  );
}
function Preservation({ time }: { time: number }) {
  return (
    <group>
      <Pedestal x={30} />
      <Brain x={30} time={time} small />
      <Block at={[30, 3.1, 0]} size={[1.9, 0.18, 1.65]} color={colors.cream} />
      {[-1, 1].map((s) => (
        <Block
          key={s}
          at={[30 + s * 0.86, 2.2, -0.45]}
          size={[0.1, 1.7, 0.15]}
          color={colors.teal}
        />
      ))}
      <mesh position={[30, 2.2, 0.05]}>
        <boxGeometry args={[1.8, 1.65, 1.5]} />
        <meshStandardMaterial
          color="#bde4ed"
          transparent
          opacity={0.12}
          roughness={0.2}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
function Camera({ episode, time }: { episode: Episode; time: number }) {
  const { camera, invalidate } = useThree();
  const pose = cameraState(episode, time);
  useLayoutEffect(() => {
    camera.position.set(...pose.position);
    camera.lookAt(...pose.lookAt);
    if (camera instanceof PerspectiveCamera) camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, pose]);
  return null;
}
function SubjectLight({ point, amount }: { point: Vec3; amount: number }) {
  const target = useMemo(() => {
    const o = new Object3D();
    o.position.set(...point);
    o.updateMatrixWorld();
    return o;
  }, [point]);
  return (
    <spotLight
      color="#ffe0a1"
      intensity={amount * 12}
      position={[point[0] - 1, point[1] + 3, point[2] + 2]}
      target={target}
      angle={0.48}
      penumbra={0.6}
      decay={2}
      distance={8}
    />
  );
}
function UploadParticles({ time, amount }: { time: number; amount: number }) {
  return (
    <group>
      {Array.from({ length: 18 }, (_, i) => {
        const u = (((time * 0.8 + i / 18) % 1) + 1) % 1;
        return (
          <Block
            key={i}
            at={[
              -0.8 + u * 1.85,
              2.65 + Math.sin(u * Math.PI) * 0.8,
              0.9 - u * 0.9,
            ]}
            size={[0.08 * amount, 0.08 * amount, 0.08 * amount]}
            color={i % 3 ? "#99e9e1" : "#ffcb6b"}
            glow
            outline={false}
          />
        );
      })}
    </group>
  );
}
function Lab({ episode, time }: { episode: Episode; time: number }) {
  const state = worldState(episode, time);
  const { scene, x, local, walking } = state;
  const pose = actorPose(scene, time, walking);
  const heroX = x - 0.8;
  const cam = cameraState(episode, time);
  const yaw = Math.atan2(cam.position[0] - heroX, cam.position[2] - 1.2);
  const opening =
    episode.hook === "pixel-transfer"
      ? 1 - smooth((time - (episode.scenes[1]?.start ?? 3.4) + 1.05) / 1.05)
      : 0;
  const attention = focusState(episode, time);
  attention.weights.copy = Math.max(
    attention.weights.copy ?? 0,
    opening * 0.85,
  );
  attention.weights.original = Math.max(
    attention.weights.original ?? 0,
    opening * 0.25,
  );
  const lightTarget = useMemo(() => {
    const target = new Object3D();
    target.position.set(x, 0, 0);
    target.updateMatrixWorld();
    return target;
  }, [x]);
  return (
    <FocusValues.Provider value={attention.weights}>
      <Camera episode={episode} time={time} />
      <SubjectLight point={attention.point} amount={attention.amount} />
      <color attach="background" args={["#485771"]} />
      <fog attach="fog" args={["#485771", 15, 35]} />
      <hemisphereLight args={["#a8c8eb", "#303750", 1.3]} />
      <ambientLight intensity={0.28} color="#7c8fc9" />
      <directionalLight
        target={lightTarget}
        position={[x - 3, 8, 5]}
        color="#ffd39b"
        intensity={3.1 - attention.amount * 0.3}
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
      <Ground />
      {[0, 6, 12, 18, 24, 30, 36].map((n) => (
        <Room x={n} key={n} />
      ))}
      <FocusSubject target="portal">
        <Portal x={1} time={time} active={x < 3} />
      </FocusSubject>
      {opening > 0 && <UploadParticles time={time} amount={opening} />}
      <Block
        at={[-0.1, 0.6, 1.8]}
        size={[0.8, 1.2, 0.65]}
        color={colors.blue}
      />
      <Block
        at={[-0.1, 1.28, 1.8]}
        size={[0.85, 0.15, 0.7]}
        color={colors.cream}
      />
      <Block
        at={[-0.1, 1.42, 1.8]}
        size={[0.3, 0.14, 0.3]}
        color={colors.orange}
        glow
      />
      {[6, 12, 18, 24].map((n) => (
        <Pedestal x={n} key={n} />
      ))}
      <FocusSubject target="worm">
        <Worm time={time} />
      </FocusSubject>
      <FocusSubject target="fly">
        <Fly time={time} />
      </FocusSubject>
      <FocusSubject target="brain">
        <Brain x={18} time={time} />
      </FocusSubject>
      <FocusSubject target="tissue">
        <Tissue time={time} />
      </FocusSubject>
      <FocusSubject target="servers">
        {[22.6, 23.6, 24.6, 25.6].map((n) => (
          <Server x={n} key={n} />
        ))}
      </FocusSubject>
      <FocusSubject target="preservation">
        <Preservation time={time} />
      </FocusSubject>
      <FocusSubject target="portal">
        <Portal x={37.15} time={time} active={x > 33} />
      </FocusSubject>
      <Block
        at={[36, 0.65, 1.8]}
        size={[0.68, 1.3, 0.65]}
        color={colors.blue}
      />
      <Block
        at={[36, 1.37, 1.8]}
        size={[0.75, 0.12, 0.7]}
        color={colors.cream}
      />
      <FocusSubject target="upload-button">
        <Block
          at={[36, 1.5, 1.8]}
          size={[0.35, 0.15, 0.35]}
          color={colors.orange}
          glow
        />
      </FocusSubject>
      <FocusSubject target="original">
        <PixelSprite
          artwork={episode.pixelArt}
          x={heroX}
          time={time}
          pose={pose}
          walking={walking}
          yaw={yaw}
          mirror={pose === 7 && episode.pixelArt !== "rpg"}
        />
      </FocusSubject>
      {x < 3 && (
        <FocusSubject target="copy">
          <PixelSprite
            artwork={episode.pixelArt}
            x={1.05}
            z={-0.05}
            time={time}
            pose={opening > 0 ? 0 : 5}
            digital
            yaw={Math.atan2(cam.position[0] - 1.05, cam.position[2] + 0.05)}
          />
        </FocusSubject>
      )}
      {x > 33 && (
        <FocusSubject target="copy">
          <PixelSprite
            artwork={episode.pixelArt}
            x={37.15}
            z={-0.05}
            time={time}
            pose={copyPose(scene)}
            mirror={
              scene.id === "memories" ||
              (scene.action === "choose" && episode.pixelArt === "rpg")
            }
            digital
            yaw={Math.atan2(cam.position[0] - 37.15, cam.position[2] + 0.05)}
          />
        </FocusSubject>
      )}
      {scene.action === "duplicate" &&
        local > 1 &&
        Array.from({ length: 5 }, (_, i) => (
          <Block
            key={i}
            at={[
              35 + smooth((local - 1 - i * 0.12) / 1.2) * 1.8,
              2.85 + Math.sin(i * 2 + time) * 0.15,
              1.1,
            ]}
            size={[0.08, 0.08, 0.08]}
            color={colors.light}
            glow
            outline={false}
          />
        ))}
    </FocusValues.Provider>
  );
}
export function PixelWorld({
  episode,
  portrait,
}: {
  episode: Episode;
  portrait: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const w = portrait ? 540 : 960,
    h = portrait ? 960 : 540;
  const loop = loopState(episode, frame / fps);
  return (
    <AbsoluteFill style={{ background: "#485771", overflow: "hidden" }}>
      <div
        style={{
          width: w,
          height: h,
          transform: `scale(${width / w},${height / h})`,
          transformOrigin: "0 0",
        }}
      >
        <ThreeCanvas
          width={w}
          height={h}
          camera={{ fov: 43, near: 0.1, far: 80 }}
          shadows
          dpr={1}
          gl={{ antialias: false, alpha: false, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            gl.shadowMap.type = PCFShadowMap;
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.1;
          }}
          style={{ width: w, height: h, imageRendering: "pixelated" }}
        >
          <Lab episode={episode} time={loop.worldTime} />
        </ThreeCanvas>
      </div>
      {loop.flash > 0 && (
        <AbsoluteFill
          style={{
            background: "#b4e8df",
            opacity: loop.flash,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
}
