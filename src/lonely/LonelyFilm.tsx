import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import type { Caption } from "@remotion/captions";
import transcript from "../../episodes/lonely-around-people/transcript-source.json";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import miko from "../../episodes/lonely-around-people/assets/miko.json";
import mia from "../../episodes/lonely-around-people/assets/mia.json";
import {
  e,
  edit,
  plan,
  enter,
  move,
  mix,
  unit,
  bubbleAt,
  bubblePath,
  gapAmount,
  crowdPoints,
  pointerAt,
  tapAt,
  honestTextAt,
  replyTextAt,
  hookAt,
  diagram,
  connectionShineAt,
} from "./motion";

loadFont({
  family: "Lonely Inter",
  url: staticFile("episodes/ok-message-motion/fonts/InterVariable.woff2"),
  weight: "100 900",
});
const paper = "#f8f8fa",
  blue = "#007aff",
  ink = "#17181c",
  green = "#537e70";
type Pose = {
  file: string;
  width: number;
  height: number;
  pivotX: number;
  footY: number;
};
const Sprite = ({
  pose,
  x,
  y,
  height,
  opacity = 1,
}: {
  pose: Pose;
  x: number;
  y: number;
  height: number;
  opacity?: number;
}) => {
  const s = height / pose.height;
  return (
    <Img
      src={staticFile(pose.file)}
      style={{
        position: "absolute",
        left: x - pose.pivotX * s,
        top: y - pose.footY * s,
        width: pose.width * s,
        height,
        imageRendering: "pixelated",
        opacity,
      }}
    />
  );
};
const Person = ({
  x,
  y,
  size = 100,
  index = 0,
  opacity = 1,
  face,
}: {
  x: number;
  y: number;
  size?: number;
  index?: number;
  opacity?: number;
  face?: "miko" | "mia";
}) => (
  <div
    style={{
      position: "absolute",
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: "50%",
      overflow: "hidden",
      background: ["#e6eaf3", "#e5eee9", "#ede8f2", "#e7edf4"][index % 4],
      border: "3px solid white",
      boxShadow: "0 8px 24px #18354c0d",
      opacity,
    }}
  >
    {face ? (
      <Img
        src={staticFile(`episodes/lonely-around-people/art/${face}-head.png`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          imageRendering: "pixelated",
        }}
      />
    ) : (
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
        <circle
          cx="50"
          cy="36"
          r="17"
          fill="none"
          stroke="#8795a7"
          strokeWidth="5"
        />
        <path
          d="M19 91 V79 C19 49 81 49 81 79 V91"
          fill="none"
          stroke="#8795a7"
          strokeWidth="5"
        />
      </svg>
    )}
  </div>
);
const Crowd = ({ t }: { t: number }) => {
  const out = enter(t, e.included, 0.45);
  return (
    <>
      {crowdPoints.map(([x, y], i) => {
        const p = enter(t, e.alone + i * 0.025, 0.3);
        const collapse = move(t, e.included, 0.48);
        const xx = mix(x, 540, collapse),
          yy = mix(y, 650, collapse);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: xx,
              top: yy,
              opacity: p * (1 - out),
              transform: `translateY(${(1 - p) * 65}px) scale(${0.7 + p * 0.3})`,
              transformOrigin: "center",
            }}
          >
            <Person x={0} y={0} index={i} size={100} />
          </div>
        );
      })}
    </>
  );
};
const Hook = ({ t }: { t: number }) => {
  const h = hookAt(t);
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 535,
        height: 190,
        display: "grid",
        placeItems: "center",
        fontSize: 164,
        fontWeight: 800,
        letterSpacing: -8,
        lineHeight: 1,
        color: t >= e.alone ? "#f4f6fa" : ink,
        opacity: h.opacity,
        transform: `translateX(${h.shakeX}px) scale(${h.scale})`,
      }}
    >
      {h.word}
    </div>
  );
};
const Diagram = ({ t }: { t: number }) => {
  const p = enter(t, e.gap + 0.1, 0.3) * (1 - enter(t, e.fine, 0.25));
  const extras = enter(t, e.more, 0.25) * (1 - enter(t, e.fine, 0.2));
  return (
    <div style={{ opacity: p }}>
      <Person
        x={diagram.leftX}
        y={diagram.centerY}
        size={diagram.portraitSize}
        face="miko"
      />
      <Person
        x={diagram.rightX}
        y={diagram.centerY}
        size={diagram.portraitSize}
        face="mia"
      />
      {Array.from({ length: 8 }, (_, i) => {
        const x = 190 + (i % 4) * 230,
          y = i < 4 ? diagram.extraTop : diagram.extraBottom;
        const a = enter(t, e.more + i * 0.065, 0.24);
        return (
          <Person
            key={i}
            x={x}
            y={y + 28 * (1 - a)}
            size={diagram.extraSize}
            index={i}
            opacity={extras * a * 0.7}
          />
        );
      })}
      <svg
        width={1080}
        height={1400}
        style={{ position: "absolute", inset: 0 }}
      >
        {Array.from({ length: 6 }, (_, i) => {
          const age = t - (e.gapWord + 0.08 + i * 0.7);
          if (age < 0 || age > 0.65) return null;
          const travel = move(age, 0, 0.48);
          return (
            <circle
              key={i}
              cx={mix(
                diagram.leftX + diagram.portraitSize / 2 + 12,
                540 - diagram.gapWidth / 2 - 15,
                travel,
              )}
              cy={diagram.centerY}
              r={10}
              fill={blue}
              opacity={(1 - enter(age, 0.48, 0.17)) * 0.75}
            />
          );
        })}
        <path
          d={`M${540 - diagram.gapWidth / 2} ${diagram.centerY + 66} V${diagram.centerY + 108} M${540 + diagram.gapWidth / 2} ${diagram.centerY + 66} V${diagram.centerY + 108} M${540 - diagram.gapWidth / 2} ${diagram.centerY + 89} H${540 + diagram.gapWidth / 2}`}
          fill="none"
          stroke="#b0b9c6"
          strokeWidth={4}
          opacity={p}
        />
      </svg>
    </div>
  );
};
const ChatHeader = ({ t }: { t: number }) => {
  const p = enter(t, e.trust, 0.28) * (1 - enter(t, e.send, 0.3));
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 18}px)` }}>
      <Person face="mia" x={155} y={285} size={100} />
      <div
        style={{
          position: "absolute",
          left: 225,
          top: 250,
          fontSize: 49,
          fontWeight: 650,
        }}
      >
        {plan.ui.friendName}
      </div>
      <div
        style={{
          position: "absolute",
          left: 110,
          top: 365,
          width: 435,
          padding: "36px 38px",
          borderRadius: 50,
          background: "#e8e9ee",
          fontSize: 57,
          letterSpacing: -1,
        }}
      >
        {plan.ui.incomingQuestion}
      </div>
    </div>
  );
};
const SharedMessage = ({ t }: { t: number }) => {
  const b = bubbleAt(t),
    gap = gapAmount(t) * diagram.gapWidth;
  const shine = connectionShineAt(t);
  const lineShine = t >= e.gap && t < e.fine && b.h < 30 ? shine.opacity : 0;
  const phrase = t >= e.honest ? honestTextAt(t) : plan.ui.maskReply;
  const textOpacity = unit((b.h - 30) / 80);
  return (
    <div
      style={{
        position: "absolute",
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h + 25,
        opacity: enter(t, e.included, 0.18),
        filter: b.h > 30 ? "drop-shadow(0 14px 25px #007aff12)" : "none",
      }}
    >
      <svg
        width={b.w}
        height={b.h + 25}
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        <defs>
          <mask
            id="lonely-gap"
            maskUnits="userSpaceOnUse"
            x={-80}
            y={-100}
            width={b.w + 160}
            height={b.h + 200}
          >
            <rect
              x={-80}
              y={-100}
              width={b.w + 160}
              height={b.h + 200}
              fill="white"
            />
            <rect
              x={b.w / 2 - gap / 2}
              y={-100}
              width={gap}
              height={b.h + 200}
              fill="black"
            />
          </mask>
          <linearGradient id="lonely-shimmer">
            <stop offset="0" stopColor={diagram.shineColor} stopOpacity="0" />
            <stop offset="0.4" stopColor="#c9f0ff" stopOpacity="0.8" />
            <stop offset="0.55" stopColor="white" />
            <stop offset="1" stopColor={diagram.shineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={bubblePath(b.w, b.h, b.r, b.tail)}
          fill={blue}
          mask="url(#lonely-gap)"
        />
        {lineShine > 0 && (
          <g opacity={lineShine} mask="url(#lonely-gap)">
            <path
              d={bubblePath(b.w, b.h, b.r, 0)}
              fill={diagram.shineColor}
              opacity={0.8}
              style={{ filter: `drop-shadow(0 0 12px ${diagram.shineColor})` }}
            />
            <rect
              x={mix(-190, b.w, shine.progress)}
              y={0}
              width={190}
              height={b.h}
              rx={b.h / 2}
              fill="url(#lonely-shimmer)"
            />
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const age = (t - e.feelConnection - i * 0.075) / 0.72;
              if (age <= 0 || age >= 1) return null;
              const a = Math.sin(age * Math.PI);
              const near = diagram.portraitSize / 2 + 30 + (i % 3) * 43;
              const x = i < 3 ? near : b.w - near;
              const y = b.h / 2 + (i % 2 ? 22 : -23) - age * 12;
              return (
                <path
                  key={i}
                  d="M0 -14 L3 -3 L12 0 L3 3 L0 14 L-3 3 L-12 0 L-3 -3 Z"
                  fill="white"
                  stroke={diagram.shineColor}
                  strokeWidth={1.5}
                  opacity={a}
                  transform={`translate(${x} ${y}) scale(${a}) rotate(${mix(-15, 20, age)})`}
                  style={{
                    filter: `drop-shadow(0 0 5px ${diagram.shineColor})`,
                  }}
                />
              );
            })}
          </g>
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: "0 28px 25px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: t >= e.honest ? 55 : 68,
          lineHeight: 1.12,
          fontWeight: 600,
          letterSpacing: -1.7,
          textAlign: "center",
          opacity: textOpacity,
        }}
      >
        <span style={{ maxWidth: 480 }}>
          {phrase || (
            <span
              style={{
                display: "block",
                height: 55,
                borderLeft: "3px solid white",
              }}
            />
          )}
        </span>
      </div>
    </div>
  );
};
const Send = ({ t }: { t: number }) => {
  const p = enter(t, e.honest, 0.2) * (1 - enter(t, e.sent, 0.16)),
    pointer = pointerAt(t),
    tap = tapAt(t);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 892,
          top: 852,
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: blue,
          display: "grid",
          placeItems: "center",
          opacity: p,
          transform: `scale(${tap.scale})`,
        }}
      >
        <svg width={48} height={48} viewBox="0 0 24 24">
          <path
            d="m22 2-7 20-4-9L2 9Z M22 2 11 13"
            stroke="white"
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div
        style={{
          position: "absolute",
          left: 940 - 58 - tap.ring * 35,
          top: 900 - 58 - tap.ring * 35,
          width: 116 + tap.ring * 70,
          height: 116 + tap.ring * 70,
          border: "3px solid #007aff",
          borderRadius: "50%",
          opacity: tap.opacity * 0.45,
        }}
      />
      <svg
        width={60}
        height={78}
        style={{
          position: "absolute",
          left: pointer.x,
          top: pointer.y,
          opacity: pointer.opacity,
          filter: "drop-shadow(0 5px 8px #17293c22)",
        }}
      >
        <path
          d="M0 0V60L18 46 31 71 43 65 30 42H55Z"
          fill="white"
          stroke={ink}
          strokeWidth={3}
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
};
const Reply = ({ t }: { t: number }) => {
  const p = enter(t, e.snacks, 0.2);
  return (
    <div
      style={{
        position: "absolute",
        left: 290,
        top: 535,
        width: 700,
        minHeight: 165,
        padding: "33px 38px",
        boxSizing: "border-box",
        borderRadius: 57,
        background: green,
        color: "white",
        fontSize: 50,
        lineHeight: 1.15,
        letterSpacing: -1.3,
        fontWeight: 550,
        opacity: p,
        transform: `translateY(${(1 - p) * 24}px) scale(${0.96 + p * 0.04})`,
        transformOrigin: "top right",
        boxShadow: "0 14px 35px #537e7010",
      }}
    >
      {replyTextAt(t)}
    </div>
  );
};
const Cast = ({ t }: { t: number }) => {
  const opening = enter(t, e.alone, 0.24) * (1 - enter(t, e.gap, 0.35)),
    front =
      enter(t, e.fine, 0.3) *
      (1 - enter(t, e.trust, 0.25)) *
      (1 - 0.55 * enter(t, e.invisibleWord - 0.1, 0.3));
  const inset = move(t, e.included, 0.4);
  const honest = enter(t, e.honest, 0.25) * (1 - enter(t, e.send, 0.25));
  const pair = enter(t, e.sent, 0.3);
  const bite = t >= e.bite && t < e.bite + 0.58;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 365,
          top: mix(1370, 1180, inset),
          width: 350,
          height: 40,
          borderRadius: "50%",
          background: "#667d9110",
          opacity: opening,
        }}
      />
      <Sprite
        pose={miko.sad}
        x={540}
        y={mix(1390, 1200, inset)}
        height={mix(540, 390, inset)}
        opacity={opening}
      />
      <Sprite
        pose={t < e.invisibleWord - 0.1 ? miko.polite : miko.sad}
        x={260}
        y={1290}
        height={565}
        opacity={front}
      />
      <Sprite
        pose={miko.honest}
        x={230}
        y={1320}
        height={390}
        opacity={honest}
      />
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 1268,
          width: 375,
          height: 70,
          borderRadius: "50%",
          background: "#e5eaf0",
          boxShadow: "0 15px 30px #17364e08",
          opacity: pair,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 550,
          top: 1335,
          width: 400,
          height: 60,
          borderRadius: "50%",
          background: "#e5eee9",
          boxShadow: "0 15px 30px #17364e08",
          opacity: pair,
        }}
      />
      <Sprite
        pose={miko.relieved}
        x={300}
        y={1290}
        height={530}
        opacity={pair}
      />
      <Sprite
        pose={bite ? mia.bite : mia.smile}
        x={750}
        y={1360}
        height={630}
        opacity={pair}
      />
    </>
  );
};
export const LonelyFilm = ({
  captions,
  showCaptions = true,
  audioEnabled = true,
}: {
  captions: Caption[];
  showCaptions?: boolean;
  audioEnabled?: boolean;
}) => {
  const t = useCurrentFrame() / edit.fps;
  const hook = hookAt(t);
  const active = progressiveCaptionCues(captions, transcript.words).find(
    (c) => t * 1000 >= c.startMs && t * 1000 < c.endMs,
  );
  return (
    <AbsoluteFill
      style={{
        background: paper,
        color: ink,
        fontFamily: '"Lonely Inter", sans-serif',
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 55%,#2d3b4d 0%,#1b2636 48%,#0b1018 100%)",
          opacity: hook.dark,
        }}
      />
      <SharedMessage t={t} />
      <Crowd t={t} />
      <Diagram t={t} />
      <Cast t={t} />
      <Hook t={t} />
      <ChatHeader t={t} />
      <Send t={t} />
      <Reply t={t} />
      {showCaptions && active && t >= e.included && (
        <div
          style={{
            position: "absolute",
            left: 65,
            right: 65,
            top: 1480,
            textAlign: "center",
            fontSize: 64,
            lineHeight: 1.12,
            fontWeight: 800,
            color: "white",
            WebkitTextStroke: "7px #172b35",
            paintOrder: "stroke fill",
            letterSpacing: -1.5,
          }}
        >
          {active.text.toUpperCase()}
        </div>
      )}
      {audioEnabled && (
        <>
          <Audio
            src={staticFile("episodes/lonely-around-people/narration.wav")}
          />
          <Audio src={staticFile("episodes/lonely-around-people/music.wav")} />
          <Audio
            src={staticFile("episodes/lonely-around-people/effects.wav")}
          />
        </>
      )}
    </AbsoluteFill>
  );
};
