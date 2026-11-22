import { useMemo } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import type { Caption } from "@remotion/captions";
import { abs, colors, PixelActor } from "../developer/primitives";
import { SimulatedCursor } from "../developer/remocn/SimulatedCursor";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import actors from "../../episodes/ai-review-loop/assets/actors.json";
import transcript from "../../episodes/inbox-dot-png/transcript-source.json";
import plan from "../../episodes/inbox-dot-png/plan.json";
import { MailFace, mailSize } from "./MailFace";
import {
  box,
  e,
  fps,
  grip,
  imagePose,
  lines,
  mix,
  move,
  pointerPath,
  voiceLight,
  type Speaker,
} from "./motion";

loadFont({
  family: "Inbox Inter",
  url: staticFile("episodes/ai-review-loop/fonts/InterVariable.woff2"),
  weight: "100 900",
});
const ui = plan.ui;
const art = (dark = false) =>
  staticFile(`episodes/inbox-dot-png/art/inbox${dark ? "-dark" : ""}.png`);
const glow = {
  alex: "67,154,133",
  opus: "211,127,86",
  gemini: "92,129,209",
  astra: "153,108,191",
};
const pulse = (f: number, start: number, duration: number) =>
  Math.sin(Math.PI * move(f, start, duration));

function Cast({ frame }: { frame: number }) {
  const foot = 1354;
  const light = Object.fromEntries(
    Object.keys(glow).map((role) => [role, voiceLight(frame, role as Speaker)]),
  );
  const active = Math.max(...Object.values(light));
  const clicked = [e.click1, e.click2, e.click3].reduce(
    (a, at) => a + pulse(frame, at - 6, 23),
    0,
  );
  const pull =
    move(frame, e.grab - 9, 22) * (1 - move(frame, e.release + 2, 16));
  const swapped = move(frame, e.fileName - 11, 30);
  const geminiIn = move(frame, e.geminiIn, 12),
    astraIn = move(frame, e.astraIn, 12),
    opusBack = move(frame, e.opusBack, 12);
  const weights = {
    alex: 1,
    opus: 1 - geminiIn + opusBack,
    gemini: geminiIn * (1 - astraIn),
    astra: astraIn * (1 - opusBack),
  };
  // Alex tracks the pitch, tests it with his coffee in hand, then recognizes what Opus shipped.
  const firstReply = lines[1].inFrame;
  const poses: Record<Speaker, keyof typeof actors> = {
    alex:
      frame < firstReply
        ? "alex-explain"
        : frame < e.geminiIn
          ? "alex-coffee"
          : frame < e.grab
            ? "alex-explain"
            : frame < e.fileName
              ? "alex-coffee"
              : "alex-frustrated",
    opus:
      frame < firstReply
        ? "opus-think"
        : frame < e.opusBack
          ? "opus-present"
          : frame < lines[7].inFrame
            ? "opus-think"
            : "opus-proud",
    gemini: "gemini-present",
    astra: "astra-present",
  };
  return (
    <>
      {(Object.keys(weights) as Speaker[]).map((role) => {
        if (weights[role] <= 0) return null;
        const alex = role === "alex",
          actor = actors[poses[role]];
        const focus = light[role];
        const breath = Math.sin((frame / fps) * 2.1 + (alex ? 0 : 1.3));
        const scaleHeight = alex ? 602 : 629;
        const shrinkForDrag = move(frame, e.grab - 12, 30) * (1 - swapped);
        const height =
          scaleHeight - shrinkForDrag * 74 + 11 * swapped + 1.5 * breath;
        const x = alex
          ? 272 + 5 * pulse(frame, e.loaded, 30)
          : 747 + (1 - weights[role]) * 28;
        const nod = lines
          .filter((l) => l.speaker === role)
          .reduce((v, l) => v + pulse(frame, l.inFrame, 25), 0);
        const dragTilt =
          role === "astra" ? -3.2 * pull - 1.4 * pulse(frame, e.tug, 24) : 0;
        const reaction = alex
          ? -2.1 * pulse(frame, e.pulled - 4, 32) +
            2.2 * pulse(frame, e.fileName - 5, 34)
          : role === "gemini"
            ? -2.5 * clicked
            : -2.1 * pulse(frame, e.darkMode - 7, 28);
        const angle = (alex ? 1 : -1) * nod * 0.9 + dragTilt + reaction;
        const attention = Math.max(0, active - focus);
        return (
          <div key={role} style={{ ...abs, inset: 0, opacity: weights[role] }}>
            <div
              style={{
                ...abs,
                left: x - 216,
                top: foot - height - 48,
                width: 432,
                height: 400,
                background: `radial-gradient(ellipse closest-side,rgba(${glow[role]},.47) 0%,rgba(${glow[role]},.24) 60%,rgba(${glow[role]},0) 100%)`,
                opacity: focus,
              }}
            />
            <div
              style={{
                ...abs,
                left: x - 85,
                top: foot - 5,
                width: 168,
                height: 13,
                borderRadius: "50%",
                background: "#33384b14",
              }}
            />
            <div
              style={{
                ...abs,
                inset: 0,
                transform: `rotate(${angle}deg)`,
                transformOrigin: `${x}px ${foot}px`,
                opacity: 1 - attention * 0.24,
                filter: `saturate(${1 - attention * 0.35})`,
              }}
            >
              <PixelActor actor={actor} x={x} foot={foot} height={height} />
            </div>
          </div>
        );
      })}
    </>
  );
}

function Files({ frame }: { frame: number }) {
  const pose = imagePose(frame);
  const loaded = frame >= e.loaded;
  const enteringDark = move(frame, e.darkMode - 2, 25);
  const checker =
    move(frame, e.grab + 6, 15) * (1 - move(frame, e.fileName - 7, 28));
  const name = move(frame, e.fileName, 16);
  const depth = move(frame, e.grab, 16) * (1 - pose.gallery);
  const cursor =
    move(frame, e.click1 - 42, 9) * (1 - move(frame, e.release + 12, 12));
  const rim = `0 ${12 + depth * 17}px ${36 + depth * 21}px rgba(41,62,90,${0.1 + depth * 0.1}), 0 2px 6px #20304a14`;
  const label = {
    ...abs,
    width: 440,
    textAlign: "center" as const,
    top: 615,
    fontSize: 46,
    fontWeight: 660,
    letterSpacing: -1.8,
    color: "#394457",
  };
  return (
    <>
      {checker > 0 && (
        <div
          style={{
            ...abs,
            ...mailSize,
            left: box.x,
            top: box.y,
            borderRadius: 34,
            opacity: checker,
            backgroundColor: "#f4f6fa",
            backgroundImage:
              "conic-gradient(#dce2eb 25%, transparent 0 50%, #dce2eb 0 75%, transparent 0)",
            backgroundSize: "37px 37px",
            boxShadow: "inset 0 0 0 2px #c4cbd7",
          }}
        />
      )}
      <div
        style={{
          ...abs,
          left: pose.x - (grip.x - box.x),
          top: pose.y - (grip.y - box.y) + 6 * (1 - move(frame, 0, 18)),
          ...mailSize,
          borderRadius: 34,
          boxShadow: rim,
          transformOrigin: `${grip.x - box.x}px ${grip.y - box.y}px`,
          transform: `rotate(${pose.angle}deg) scale(${pose.scale})`,
        }}
      >
        {!loaded && (
          <MailFace elapsed={ui.secondsAtOpen + frame / fps} frame={frame} />
        )}
        <Img
          src={art()}
          style={{ ...abs, inset: 0, ...mailSize, opacity: loaded ? 1 : 0 }}
        />
      </div>
      {name > 0 && (
        <div
          style={{
            ...label,
            left: 90,
            opacity: name,
            transform: `translateY(${9 * (1 - name)}px)`,
          }}
        >
          {ui.lightFile}
        </div>
      )}
      {enteringDark > 0 && (
        <>
          <div
            style={{
              ...abs,
              left: mix(492, 556, enteringDark),
              top: mix(394, 366, enteringDark),
              ...mailSize,
              borderRadius: 34,
              transformOrigin: "0 0",
              transform: `rotate(${mix(-5, 2, enteringDark)}deg) scale(${mix(0.4, 0.461, enteringDark)})`,
              opacity: enteringDark,
              boxShadow: "0 18px 50px #20304a32",
            }}
          >
            <Img src={art(true)} style={{ ...abs, inset: 0, ...mailSize }} />
          </div>
          <div
            style={{
              ...label,
              left: 529,
              opacity: enteringDark,
              transform: `translateY(${(1 - enteringDark) * 13}px)`,
            }}
          >
            {ui.darkFile}
          </div>
        </>
      )}
      <SimulatedCursor
        frame={frame}
        fps={fps}
        points={pointerPath}
        down={frame >= e.grab && frame < e.release}
        opacity={cursor}
      />
    </>
  );
}

export function InboxFilm({
  captions,
  showCaptions,
  audioEnabled,
}: {
  captions: Caption[];
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const frame = useCurrentFrame();
  const cues = useMemo(
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const ms = (frame * 1000) / fps;
  const caption = cues.find((c) => ms >= c.startMs && ms < c.endMs);
  return (
    <AbsoluteFill
      style={{
        background: colors.paper,
        color: colors.ink,
        fontFamily: '"Inbox Inter", sans-serif',
        isolation: "isolate",
        overflow: "hidden",
      }}
    >
      <Cast frame={frame} />
      <Files frame={frame} />
      {showCaptions && caption && (
        <div
          style={{
            ...abs,
            left: 92,
            right: 116,
            top: 1378,
            textAlign: "center",
            color: "white",
            fontSize: 63,
            lineHeight: 1.06,
            letterSpacing: -1.6,
            fontWeight: 850,
            WebkitTextStroke: "8px #20242b",
            paintOrder: "stroke fill",
          }}
        >
          {caption.text.toUpperCase()}
        </div>
      )}
      {audioEnabled && (
        <Audio src={staticFile("episodes/inbox-dot-png/mix.wav")} />
      )}
    </AbsoluteFill>
  );
}
