import { useLayoutEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Object3D, OrthographicCamera } from "three";
import type { Episode } from "../engine/schema";
import { StoryItems } from "../components/StoryItems";
import { PixelStage } from "./PixelStage";
import { PixelSprite } from "./Sprite";
import { Block } from "./WorldKit";
import { Stocks, Straw } from "./TudorWorld";
import { immersiveState } from "./immersive-state";
import { smooth } from "./timeline";

type State = ReturnType<typeof immersiveState>;
function Camera({ state }: { state: State }) {
  const { camera, invalidate } = useThree();
  useLayoutEffect(() => {
    camera.position.set(...state.camera.position);
    camera.lookAt(...state.camera.target);
    if (camera instanceof OrthographicCamera)
      camera.zoom = 160 * state.camera.zoom;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, state.camera]);
  return null;
}
function Lighting({ cold }: { cold: boolean }) {
  const target = useMemo(() => {
    const t = new Object3D();
    t.position.set(0, 1.3, 0);
    t.updateMatrixWorld();
    return t;
  }, []);
  return (
    <>
      <hemisphereLight args={[cold ? "#c1d9e5" : "#e3e1d3", "#526270", 1.1]} />
      <ambientLight color="#d2d9de" intensity={0.45} />
      <directionalLight
        position={[-3, 5, 6]}
        target={target}
        color={cold ? "#dce7e9" : "#ffdfb3"}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={6}
        shadow-camera-bottom={-3}
        shadow-camera-far={25}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      <directionalLight
        position={[3, 3, -2]}
        target={target}
        color="#afcad3"
        intensity={0.65}
      />
    </>
  );
}
function Dust({ time }: { time: number }) {
  return (
    <>
      {Array.from({ length: 32 }, (_, i) => (
        <mesh
          key={i}
          position={[
            ((i * 1.73 + time * 0.06) % 4.8) - 2.4,
            (i * 0.71 + time * 0.07) % 5.8,
            0.5 + (i % 5) * 0.35,
          ]}
        >
          <boxGeometry
            args={[0.012 + (i % 3) * 0.007, 0.012 + (i % 3) * 0.007, 0.01]}
          />
          <meshBasicMaterial
            color={i % 2 ? "#e7d7ad" : "#c6d8d8"}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}
function NPC({
  x,
  z,
  pose,
  time,
  height = 2.25,
}: {
  x: number;
  z: number;
  pose: number;
  time: number;
  height?: number;
}) {
  return (
    <PixelSprite
      x={x}
      z={z}
      pose={pose}
      time={time}
      artwork="tudor"
      height={height}
      alignCells
    />
  );
}
function Fire({ episode, time }: { episode: Episode; time: number }) {
  const scene = episode.scenes.find((s) => s.id === "fire")!,
    cue = scene.start + (scene.actionCue ?? 0);
  const elapsed = time - cue,
    phase = ((elapsed % 1.1) + 1.1) % 1.1,
    ember = smooth((elapsed - 0.7) / 0.8);
  return (
    <group>
      {Array.from({ length: 7 }, (_, i) => (
        <group key={i} rotation={[0, i * 0.4, 0]}>
          <Block
            at={[0.5 + (i % 3) * 0.06, 0.06 + (i % 2) * 0.035, 1.2]}
            size={[0.38, 0.035, 0.035]}
            color={i % 2 ? "#c5ab77" : "#bfa078"}
            outline={false}
          />
        </group>
      ))}
      {elapsed >= 0 &&
        phase > 0.1 &&
        phase < 0.6 &&
        Array.from({ length: 10 }, (_, i) => {
          const t = phase - 0.1;
          return (
            <Block
              key={i}
              at={[
                -0.55 + t * (1.25 + Math.sin(i) * 0.35),
                1.2 + t * (1 + Math.cos(i) * 0.3) - t * t * 4,
                1.25,
              ]}
              size={[0.025, 0.025, 0.025]}
              color="#f0d29b"
              glow
              outline={false}
            />
          );
        })}
      {ember > 0 && (
        <>
          <Block
            at={[0.6, 0.13, 1.2]}
            size={[0.12, 0.055, 0.1]}
            color="#e9ba83"
            glow
            outline={false}
          />
          <pointLight
            position={[0.6, 0.4, 1.5]}
            color="#ffd19c"
            intensity={ember * 2.4}
            distance={3}
          />
        </>
      )}
    </group>
  );
}
function Foreground({
  episode,
  state,
  time,
}: {
  episode: Episode;
  state: State;
  time: number;
}) {
  const { activity } = state.shot;
  const law = episode.scenes.find((s) => s.id === "law")!;
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.015, 0]}
        receiveShadow
      >
        <planeGeometry args={[14, 15]} />
        <shadowMaterial transparent opacity={0.24} />
      </mesh>
      {(activity === "cold" || activity === "strike") && (
        <Fire episode={episode} time={time} />
      )}
      {state.backplate.startsWith("cottage") && <Straw x={-0.55} z={1.1} />}
      {activity === "stocks" && (
        <group position={[-21.75, 0, 0.8]}>
          <Stocks local={time - law.start} cue={law.actionCue ?? 1.5} />
        </group>
      )}
      {activity === "speak" && (
        <>
          <NPC x={1.0} z={0.05} pose={1} time={time} height={2.2} />
        </>
      )}
      {(activity === "search" || activity === "eat") && (
        <NPC x={0.98} z={-0.2} pose={3} time={time} />
      )}
      {activity === "stocks" && (
        <NPC x={0.98} z={-0.25} pose={5} time={time} height={2.3} />
      )}
      {["cut", "tools", "brace", "comment"].includes(activity) && (
        <NPC x={0.98} z={-0.2} pose={7} time={time} />
      )}
    </>
  );
}
function Actors({ state }: { state: State }) {
  const hero = state.hero;
  return (
    <group position={[hero.x, hero.y, hero.z]} rotation={[0, 0, hero.lean]}>
      <PixelSprite
        x={0}
        z={0}
        time={state.visualTime}
        pose={hero.pose}
        artwork={hero.artwork}
        height={hero.height}
        alignCells
      />
    </group>
  );
}
function StoryItem({ state }: { state: State }) {
  const { activity } = state.shot;
  const enter = smooth(state.local / 0.3),
    scale = 0.94 + enter * 0.06;
  const shared = {
    position: "absolute" as const,
    top: 135,
    right: 65,
    width: 390,
    height: 390,
    transform: `scale(${scale})`,
    opacity: enter,
    pointerEvents: "none" as const,
  };
  if (activity === "years")
    return (
      <div
        style={{
          ...shared,
          height: 475,
          background: "#f0e2c9ed",
          border: "7px solid #273743",
          boxShadow: "8px 8px 0 #172a3450",
        }}
      >
        <Img
          src={staticFile("pixel/story-items/shakespeare-v1.png")}
          style={{
            width: "100%",
            height: 380,
            objectFit: "contain",
            imageRendering: "pixelated",
          }}
        />
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: 39,
            fontWeight: 900,
            color: "#283843",
            textAlign: "center",
          }}
        >
          BORN 1564
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 14 + i * 4,
              height: 14 + i * 4,
              bottom: -38 - i * 27,
              left: 20 - i * 16,
              background: "#e9d9b9",
              border: "3px solid #273743",
            }}
          />
        ))}
      </div>
    );
  if (activity === "cut")
    return (
      <div
        style={{
          ...shared,
          top: 165,
          width: 365,
          height: 365,
          borderRadius: "50%",
          border: "7px solid #a5c4bd",
          background: "#243b4ce8",
          boxShadow: "8px 8px 0 #172a3450",
        }}
      >
        <Img
          src={staticFile("pixel/story-items/germs-v1.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            imageRendering: "pixelated",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -70,
            left: 22,
            width: 24,
            height: 95,
            background: "#a5c4bd",
            transform: "rotate(35deg)",
          }}
        />
      </div>
    );
  if (activity === "tools")
    return (
      <div
        style={{
          ...shared,
          top: 140,
          background: "#d2ded9dc",
          border: "7px solid #526f76",
          borderRadius: 40,
        }}
      >
        <Img
          src={staticFile("pixel/story-items/anaesthetic-v1.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            imageRendering: "pixelated",
            opacity: 0.88,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 15,
            background: "#bd6862",
            top: 180,
            left: -22,
            transform: "rotate(-45deg)",
            boxShadow: "0 3px 0 #392d3c",
          }}
        />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 14 + i * 4,
              height: 14 + i * 4,
              bottom: -38 - i * 27,
              left: 20 - i * 16,
              background: "#d2ded9",
              border: "3px solid #526f76",
            }}
          />
        ))}
      </div>
    );
  return null;
}
export function CutWipe({
  state,
  colors,
}: {
  state: State;
  colors?: [string, string];
}) {
  if (state.shot.cutStyle !== "wipe" || state.local > 0.18) return null;
  const t = smooth(state.local / 0.18);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${i * 19 - 5}%`,
            left: `${-135 + t * 270 + (i % 2) * 4}%`,
            width: "125%",
            height: "22%",
            background: (colors ?? ["#c7b48d", "#7e8f8b"])[i % 2],
            transform: "rotate(-8deg)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
}
export function TudorImmersiveWorld({
  episode,
  portrait,
}: {
  episode: Episode;
  portrait: boolean;
}) {
  const { fps } = useVideoConfig(),
    time = useCurrentFrame() / fps,
    state = immersiveState(episode, time);
  const phase = state.visualTime === 0 ? 0 : state.progress;
  return (
    <AbsoluteFill style={{ background: "#243343", overflow: "hidden" }}>
      <Img
        src={staticFile(`pixel/tudor-scenes/${state.backplate}-v1.png`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          imageRendering: "pixelated",
          transform: `scale(1.018) translate(${Math.sin(phase * Math.PI) * 0.2}%,${Math.sin(phase * Math.PI) * 0.08}%)`,
        }}
      />
      <PixelStage
        portrait={portrait}
        background="transparent"
        transparent
        orthographic
      >
        <Camera state={state} />
        <Lighting cold={state.shot.mood === "cold"} />
        <Foreground episode={episode} state={state} time={state.visualTime} />
        <Actors state={state} />
        <Dust time={state.visualTime} />
      </PixelStage>
      <StoryItem state={state} />
      <StoryItems episode={episode} time={time} />
      <CutWipe state={state} colors={episode.reviewEdit?.wipeColors} />
      {state.shot.activity === "brace" && state.local < 0.15 && (
        <AbsoluteFill
          style={{
            background: "#cf8880",
            opacity: (1 - state.local / 0.15) * 0.15,
            pointerEvents: "none",
          }}
        />
      )}
      <AbsoluteFill
        style={{
          boxShadow: "inset 0 0 130px 15px #172b3430",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}
