import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  Character,
  type CharacterProps,
  type Mood,
  type Pose,
} from "../components/Character";
import { World } from "../components/World";
import { beat, palette as p, pulse, tween } from "../engine/motion";
import type { Episode, Scene } from "../engine/schema";

const legacyCastId = (
  id: Episode["cast"][number] | undefined,
): CharacterProps["id"] => {
  if (id === "alex" || id === "aunt" || id === "opus" || id === "astra" || id === "gemini" || id === "interviewer")
    throw new Error("Developer cast requires the developer episode renderer.");
  return id;
};

const Bicycle = ({ x, y = 850 }: { x: number; y?: number }) => (
  <g
    transform={`translate(${x} ${y})`}
    stroke={p.ink}
    strokeWidth="9"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="-95" cy="-20" r="55" fill="#D6C9B4" />
    <circle cx="90" cy="-20" r="55" fill="#D6C9B4" />
    <path
      d="M-95-20l55-92 52 92h-107l74-80h92l19 80M12-20l59-110m-13-4h38M-57-117h40"
      stroke={p.coral}
    />
    <path
      d="M-2-101l-31-53 63-53 40 61 48 6"
      stroke="#565B74"
      strokeWidth="23"
    />
    <circle cx="37" cy="-246" r="28" fill="#CB9976" strokeWidth="5" />
    <path d="M10-260q31-42 55 4" fill={p.mustard} strokeWidth="5" />
  </g>
);

export const StoryScene = ({
  scene,
  episode,
  portrait,
}: {
  scene: Scene;
  episode: Episode;
  portrait: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const d = scene.duration;
  const a = scene.action;
  const lead = episode.shadowLeadSeconds;
  const center = 950;
  let x = center;
  let y = 846;
  let pose: Pose = "idle";
  let mood: Mood = "neutral";
  let gesture = 1;
  let lean = 0;
  let scale = 1.5;
  let facing = 1;
  const event = scene.actionCue ?? Math.max(0.6, d * 0.37);
  if (a === "reveal") {
    x = 960;
    scale = portrait ? 1.7 : 1.85;
    mood = "surprised";
  }
  if (a === "wave") {
    pose = "wave";
    gesture = beat(t, scene.actionCue ?? 1.8, 0.45);
    mood = "surprised";
  }
  if (a === "step") {
    x = tween(t, 0.3, d - 0.4, 800, 1110);
    y -= Math.sin(Math.PI * tween(t, 0.3, d - 0.4, 0, 1)) * 68;
    pose = "walk";
    mood = "happy";
  }
  if (a === "catch") {
    x = 990;
    pose = "reach";
    gesture = beat(t, event, 0.3);
    mood = "happy";
    lean = -pulse(t, event - 0.2, 1.3) * 8;
  }
  if (a === "dodge") {
    pose = "duck";
    gesture = pulse(t, event, 1.8);
    mood = "surprised";
  }
  if (a === "stop") {
    x = tween(t, 0.2, d - 0.2, 760, 978);
    pose = "walk";
    mood = "neutral";
  }
  if (a === "bicycle") {
    x = 978 - tween(t, 0.6, 1.3, 0, 50);
    pose = "startled";
    mood = "surprised";
    lean = -pulse(t, 0.45, 1.2) * 10;
  }
  if (a === "recover") {
    x = 920;
    pose = "think";
    mood = "worried";
  }
  if (a === "wait") {
    pose = t < 0.65 ? "walk" : "idle";
    x = tween(t, 0, 0.7, 850, 950);
    facing = -1;
    mood = "neutral";
  }
  if (a === "turn") {
    facing = t < 0.4 + lead ? -1 : 1;
    mood = "surprised";
  }
  if (a === "meet") {
    x = tween(t, 0.3, 1.4, 950, 870);
    facing = 1;
    pose = "wave";
    gesture = beat(t, 0.2);
    mood = "happy";
  }
  let shadowX = x + 72;
  let shadowPose = pose;
  let shadowGesture = gesture;
  let shadowFacing = facing;
  if (a === "reveal") {
    shadowPose = "wave";
    shadowGesture = beat(t, 0.3);
  }
  if (a === "wave")
    shadowGesture = beat(t, (scene.actionCue ?? 1.8) - lead, 0.45);
  if (a === "step") shadowX = tween(t + lead, 0.3, d - 0.4, 800, 1110) + 72;
  if (a === "catch") shadowGesture = beat(t + lead, event, 0.3);
  if (a === "dodge") shadowGesture = pulse(t + lead, event, 1.8);
  if (a === "stop") {
    shadowX = Math.min(980, tween(t + 1, 0.2, d - 0.2, 760, 978) + 72);
    shadowPose = t > d * 0.35 ? "startled" : "walk";
  }
  if (a === "turn") {
    shadowFacing = 1;
    shadowPose = "wave";
    shadowGesture = beat(t, 0.4);
  }
  if (lead === 0) {
    shadowX = x + 72;
    shadowPose = pose;
    shadowGesture = gesture;
    shadowFacing = facing;
  }
  const zoom = tween(t, 0, d, 1, a === "bicycle" ? 1.065 : 1.025);
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={portrait ? "480 -300 960 1706.6667" : "0 0 1920 1080"}
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block" }}
    >
      <g transform={`translate(960 620) scale(${zoom}) translate(-960 -620)`}>
        <World scene={scene} t={t} />
        {a === "step" && (
          <g>
            <ellipse
              cx="966"
              cy="860"
              rx="125"
              ry="25"
              fill="#819DA0"
              stroke={p.ink}
              strokeWidth="4"
            />
            <path
              d="M899 857q54-18 117 1"
              fill="none"
              stroke="#CCDDD4"
              strokeWidth="4"
            />
          </g>
        )}
        <Character
          id={legacyCastId(episode.cast[0])}
          x={shadowX}
          y={
            a === "step"
              ? 864 -
                Math.sin(Math.PI * tween(t + lead, 0.3, d - 0.4, 0, 1)) * 68
              : 864
          }
          scale={scale}
          facing={shadowFacing}
          pose={shadowPose}
          mood={mood}
          t={t + lead}
          gesture={shadowGesture}
          shadow
          opacity={0.32}
        />
        {a === "meet" && (
          <Character
            id={legacyCastId(episode.cast[1])}
            x={1200}
            y={862}
            scale={1.4}
            facing={-1}
            pose="wave"
            t={t + 1}
            shadow
            opacity={0.3}
          />
        )}
        <ellipse
          cx={x}
          cy={y + 5}
          rx={scale * 37}
          ry="10"
          fill={p.ink}
          opacity=".13"
        />
        <Character
          id={legacyCastId(episode.cast[0])}
          x={x}
          y={y}
          scale={scale}
          pose={pose}
          mood={mood}
          t={t}
          gesture={gesture}
          facing={facing}
          lean={lean}
        />
        {a === "catch" && (
          <g
            transform={`translate(${1230 - tween(t, event - 0.3, event + 0.25, 0, 93)} ${680 + pulse(t, event - 0.8, 1.3) * 26 - tween(t, event, event + 0.5, 0, 14)}) rotate(${tween(t, event - 0.6, event + 0.2, 22, -8)})`}
            stroke={p.ink}
            strokeWidth="5"
            fill={p.paper}
          >
            <path d="M-23-38h54l-8 65h-39Z" />
            <path d="M31-24q38-1 28 24q-6 13-33 9" fill="none" />
            <path
              d="M-4-55q12-17 0-30"
              fill="none"
              stroke="#917D67"
              strokeWidth="3"
            />
          </g>
        )}
        {a === "dodge" && (
          <g
            transform={`translate(${tween(t, event - 0.1, event + 1.15, 1700, 50)} ${488 + Math.sin(t * 6) * 12}) rotate(${t * 260})`}
          >
            <circle r="44" fill={p.coral} stroke={p.ink} strokeWidth="5" />
            <path
              d="M-39-15q35 5 55 53M4-44q-15 31-46 52"
              fill="none"
              stroke={p.ink}
              strokeWidth="3"
            />
          </g>
        )}
        {a === "bicycle" && <Bicycle x={tween(t, 0.25, 1.6, 2100, -300)} />}
        {a === "meet" && (
          <Character
            id={legacyCastId(episode.cast[1])}
            x={1200}
            scale={1.4}
            facing={-1}
            pose="wave"
            mood="happy"
            t={t}
            gesture={beat(t, 0.8)}
          />
        )}
        {a === "stop" && (
          <g
            opacity={beat(t, d * 0.35)}
            stroke={p.coral}
            strokeWidth="7"
            strokeLinecap="round"
          >
            <path d="M1101 476l19-24m-2 62 31-6m-43 46 28 13" />
          </g>
        )}
      </g>
    </svg>
  );
};
