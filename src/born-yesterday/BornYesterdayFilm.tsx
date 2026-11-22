import { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import type { Caption } from "@remotion/captions";
import plan from "../../episodes/astra-born-yesterday/plan.json";
import cueSheet from "../../episodes/astra-born-yesterday/cues.json";
import portraits from "../../episodes/astra-born-yesterday/assets/portraits.json";
import landmarks from "../../episodes/astra-born-yesterday/assets/portrait-landmarks.json";
import transcript from "../../episodes/astra-born-yesterday/transcript-source.json";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import { FlipProp } from "../quick-test/FlipProp";
import { PostCard, postById } from "./PostCard";
import "./film.css";

loadFont({
  family: "Born Inter",
  url: staticFile("episodes/ai-review-loop/fonts/InterVariable.woff2"),
  weight: "100 900",
});
const { events: e, floodFrames, mouth } = cueSheet;
const fps = plan.fps;
const { swipeFrames, floodExitFrames } = plan.cardMotion;
const cardTravel = 1040;
const hand = landmarks.snap.hand;
const [handLeft, handTop, handRight, handBottom] = hand.rect;
const gaze = landmarks.shy.gaze;
const [eyeLeft, eyeTop, eyeWidth, eyeHeight] = gaze.rect;
const handWidth = handRight - handLeft;
const handHeight = handBottom - handTop;
const percent = (pixels: number, whole = 1024) => (100 * pixels) / whole + "%";
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const progress = (frame: number, at: number, length: number) =>
  clamp((frame - at) / length);
const ease = (v: number) => v * v * (3 - 2 * v);
const eased = (frame: number, at: number, length: number) =>
  ease(progress(frame, at, length));
const arrive = (p: number) => 1 - (1 - p) ** 3;
const pop = (p: number) => 1 + 1.58 * (p - 1) ** 3 + 0.58 * (p - 1) ** 2;
const art = (id: string) =>
  staticFile("episodes/astra-born-yesterday/portraits/" + id + ".webp");

function Flood({ frame }: { frame: number }) {
  if (frame >= e.burst + floodExitFrames + 5) return null;
  const wash = eased(frame, e.burst - 1, swipeFrames);
  return (
    <div
      className="by-flood"
      style={{ backgroundColor: "rgba(7,8,12," + (1 - wash) + ")" }}
    >
      {plan.flood.map((layer, i) => {
        const at = floodFrames[i];
        if (frame < at) return null;
        const p = progress(frame, at, i < 5 ? 13 : 9);
        const exit = progress(frame, e.burst + (i % 3), floodExitFrames + (i % 3));
        const blast = exit * exit;
        const direction = ((i * 137 + 205) * Math.PI) / 180;
        const x =
          layer.x +
          (1 - pop(p)) * (i % 2 ? 115 : -110) +
          Math.cos(direction) * blast * 2250;
        const y =
          layer.y + (1 - pop(p)) * 115 + Math.sin(direction) * blast * 2480;
        const rotate =
          layer.angle + (1 - p) * (i % 2 ? 7 : -7) + blast * (i % 2 ? 42 : -37);
        const scale = (0.75 + 0.25 * pop(p)) * layer.scale * (1 + blast * 0.13);
        const post = postById.get(layer.post)!;
        return (
          <div
            className="by-post-slot"
            key={i}
            style={{
              left: x,
              top: y,
              opacity: clamp(p * 3) * (1 - eased(exit, 0.88, 0.12)),
              transform:
                "translate(-50%,-50%) rotate(" +
                rotate +
                "deg) scale(" +
                scale +
                ")",
            }}
          >
            <PostCard post={post} flood />
          </div>
        );
      })}
    </div>
  );
}

const quotes = [
  { id: "worst", at: e.burst, end: e.zero },
  { id: "zero", at: e.zero, end: e.lazy },
  { id: "lazy", at: e.lazy, end: e.fever },
  { id: "fever", at: e.fever, end: e.cube },
  { id: "prefer", at: e.prefer, end: Infinity },
];
function Quotes({ frame }: { frame: number }) {
  return (
    <>
      {quotes.map(({ id, at, end }) => {
        if (frame < at || frame >= end + swipeFrames) return null;
        const enter = id === "worst" ? 1 : eased(frame, at, swipeFrames);
        const leave = eased(frame, end, swipeFrames);
        const drift = 4 * Math.sin((frame - at) / 105);
        const x = 540 + (1 - enter - leave) * cardTravel;
        const angle = (1 - enter) * (id === "prefer" ? 2.8 : 4) - leave * 3.5;
        return (
          <div
            className="by-post-slot"
            key={id}
            style={{
              left: x,
              top: 507 + drift + 22 * (1 - enter),
              transform: "translate(-50%,-50%) rotate(" + angle + "deg)",
            }}
          >
            <PostCard post={postById.get(id)!} />
          </div>
        );
      })}
    </>
  );
}

function Cube({ frame }: { frame: number }) {
  if (frame < e.cube || frame >= e.prefer + swipeFrames) return null;
  const enter = eased(frame, e.cube, swipeFrames);
  const leave = eased(frame, e.prefer, swipeFrames);
  return (
    <div
      className="by-cube-layer"
      style={{
        transform: "translateX(" + (1 - enter - leave) * cardTravel + "px)",
      }}
    >
      <div className="by-cube-window">
        <div className="by-floor" />
        <div style={{ position: "absolute", left: -99, top: -77 }}>
          <FlipProp
            type="cube"
            t={frame / fps}
            start={e.snap / fps}
            x={540}
            floor={512}
            width={191}
          />
        </div>
      </div>
    </div>
  );
}

const poses = [
  { id: "fists", at: e.burst },
  { id: "doubt", at: e.doubt },
  { id: "proud", at: e.proud },
  { id: "defense", at: e.defense },
  { id: "baka", at: e.protest },
  { id: "hurt", at: e.hurt },
  { id: "alex", at: e.alex },
  { id: "snap", at: e.snap - 8 },
  { id: "relief", at: e.relief },
  { id: "shy", at: e.shy },
].reverse();
function Portrait({ frame }: { frame: number }) {
  const active = poses.find((p) => p.at <= frame);
  if (!active) return null;
  const { id, at } = active;
  const pose = portraits.find((item) => item.id === id)!;
  const [eyeX, eyeY] = pose.eyes;
  const [patchX, patchY, patchSize] = pose.rest;
  const beat = Math.sin(Math.PI * progress(frame, at, 18));
  const sad = id === "hurt";
  const fluster = id === "fists" || id === "baka";
  const gazeStep = Math.round(eased(frame, e.glance, 6) * gaze.steps);
  const idle = Math.sin((frame - at) / 37);
  const wobble = sad
    ? Math.sin((frame - at) * 0.73) * 1.5 * (1 - progress(frame, at + 40, 94))
    : 0;
  const settle =
    id === "fists" ? 29 * (1 - arrive(progress(frame, at, 21))) : 0;
  const localScale =
    id === "fists"
      ? 1.08
      : id === "baka"
        ? 1.08
        : id === "hurt"
          ? 1.065
          : id === "alex"
            ? 1.02
            : 1.045;
  const size = 1080 * localScale;
  const x =
    540 - (((eyeX - 512) * size) / 1024) * 0.78 + (id === "alex" ? -18 : 0);
  const y =
    1150 -
    (eyeY * size) / 1024 +
    settle +
    idle * 2.2 +
    (sad ? 14 : 0) -
    beat * (fluster ? 14 : 5);
  const tilt =
    beat * (id === "defense" ? -1.1 : id === "baka" ? 1.6 : 0.55) +
    (sad ? 0.8 : 0);
  const sample = Math.floor(frame / 2) * 2;
  const speaking =
    0.68 * (mouth[sample] ?? 0) + 0.32 * (mouth[Math.max(0, sample - 1)] ?? 0);
  const trembling = sad && frame < at + 60 && Math.sin(frame * 0.53) > 0.1;
  const mouthPlate =
    speaking < 12
      ? trembling
        ? "small"
        : "rest"
      : speaking < 39
        ? "small"
        : speaking < 68
          ? "mid"
          : "open";
  const flash = progress(frame, e.snap, 16);
  const wrist =
    -8 * (1 - eased(frame, e.snap - 7, 7)) +
    12 * Math.sin(Math.PI * progress(frame, e.snap - 1, 13));
  return (
    <div
      className="by-portrait"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        transform:
          "translateX(-50%) rotate(" +
          tilt +
          "deg) translateX(" +
          wobble +
          "px)",
      }}
    >
      {id === "snap" && (
        <Img
          src={art("snap-hand")}
          style={{
            left: percent(handLeft),
            top: percent(handTop),
            width: percent(handWidth),
            height: percent(handHeight),
            transformOrigin:
              percent(hand.pivot[0] - handLeft, handWidth) +
              " " +
              percent(hand.pivot[1] - handTop, handHeight),
            transform: `rotate(${wrist}deg)`,
          }}
        />
      )}
      <Img src={art(id === "snap" ? "snap-body" : id)} />
      {id === "shy" && gazeStep < gaze.steps && (
        <Img
          src={art("shy-eyes-" + gazeStep)}
          style={{
            left: percent(eyeLeft),
            top: percent(eyeTop),
            width: percent(eyeWidth),
            height: percent(eyeHeight),
          }}
        />
      )}
      {mouthPlate !== "open" && (
        <Img
          src={art(id + "-" + mouthPlate)}
          style={{
            left: (patchX / 1024) * 100 + "%",
            top: (patchY / 1024) * 100 + "%",
            width: (patchSize / 1024) * 100 + "%",
            height: (patchSize / 1024) * 100 + "%",
          }}
        />
      )}
      {id === "snap" && flash > 0 && flash < 1 && (
        <svg
          viewBox="0 0 1024 1024"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
          }}
        >
          <g
            transform={
              "translate(" +
              hand.spark.join(" ") +
              ") scale(" +
              (0.55 + flash * 0.9) +
              ")"
            }
            opacity={1 - flash ** 1.5}
          >
            <path
              d="M0 -49 8 -9 39 0 8 7 0 41 -8 8 -41 0 -9 -8Z"
              fill="#fff7cd"
              stroke="#bd8137"
              strokeWidth="3"
            />
            <path
              d="m-37 -37 -15 -14 M11 -47l6 -18 M-51 10l-18 4"
              fill="none"
              stroke="#bd8137"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
        </svg>
      )}
    </div>
  );
}

export function BornYesterdayFilm({
  captions,
  showCaptions,
  audioEnabled,
}: {
  captions: Caption[];
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cues = useMemo(
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const ms = (frame * 1000) / fps;
  const current = cues.find((c) => c.startMs <= ms && ms < c.endMs);
  const words = current?.text.split(" ") ?? [];
  const quiet = eased(frame, e.fever, 23) * (1 - eased(frame, e.snap, 30));
  return (
    <AbsoluteFill
      style={{
        background: "#efedf4",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="by-film"
        style={{
          position: "relative",
          width: 1080,
          height: 1920,
          flexShrink: 0,
          transform: "scale(" + Math.min(width / 1080, height / 1920) + ")",
        }}
      >
        <div className="by-paper" />
        <div className="by-tone hurt" style={{ opacity: quiet }} />
        <div
          className="by-tone kind"
          style={{ opacity: eased(frame, e.prefer, 44) }}
        />
        <div className="by-print" />
        <Portrait frame={frame} />
        <Quotes frame={frame} />
        <Cube frame={frame} />
        <Flood frame={frame} />
        {showCaptions && words.length > 0 && (
          <div className="by-captions">
            <span>
              {words.slice(0, -1).join(" ")}
              {words.length > 1 ? " " : ""}
              <b>{words.at(-1)}</b>
            </span>
          </div>
        )}
        {audioEnabled && (
          <Audio src={staticFile("episodes/astra-born-yesterday/mix.wav")} />
        )}
      </div>
    </AbsoluteFill>
  );
}
