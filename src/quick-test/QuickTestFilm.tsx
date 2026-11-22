import { useMemo } from "react";
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import type { Caption } from "@remotion/captions";
import { abs, colors, PixelActor } from "../developer/primitives";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import cast from "../../episodes/astra-one-quick-test/actors.json";
import timeline from "../../episodes/astra-one-quick-test/dialogue-timeline.json";
import transcript from "../../episodes/astra-one-quick-test/transcript-source.json";
import { CheckoutPanel, CubeDemo, LaunchPanel } from "./Panels";
import {
  between,
  cursorAt,
  ease,
  mix,
  motion as m,
  point,
  unit,
} from "./motion";

loadFont({
  family: "Quick Test Inter",
  url: staticFile("episodes/ai-review-loop/fonts/InterVariable.woff2"),
  weight: "100 900",
});
const promptWords = timeline.lines.find((l) => l.id === "prompt")!.words;
const payoffWords = timeline.lines.find((l) => l.id === "backflip")!.words;
const keyRows = [12, 12, 11, 7];

/** A small aluminum keyboard travels from Alex's open palm to Astra's. */
function Keyboard({
  t,
  ax,
  ay,
  bx,
  by,
}: {
  t: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}) {
  const visible = between(t, 7.2, 9.08, 0.18) + between(t, 12.48, 16.32, 0.21);
  if (visible <= 0) return null;
  const hand = ease(t, m.keyboardHandoff, 0.58);
  const stroke =
    t < 10
      ? promptWords.findIndex((w) => t >= w.start && t < w.start + 0.105)
      : t >= m.redesign && t < m.redesign + 0.72
        ? Math.floor((t - m.redesign) * 15)
        : -1;
  const x = mix(ax, bx, hand),
    base = mix(ay, by, hand) - 28 * Math.sin(Math.PI * hand);
  return (
    <svg
      width="1080"
      height="1920"
      viewBox="0 0 1080 1920"
      style={{ ...abs, inset: 0, opacity: visible, pointerEvents: "none" }}
    >
      <g
        transform={`translate(${x} ${base + (1 - visible) * 10}) rotate(${mix(-5, 4, hand)}) skewX(-13) scale(1 .75)`}
      >
        <rect x="-96" y="-57" width="192" height="63" rx="8" fill="#aeb7c7" />
        <rect
          x="-96"
          y="-62"
          width="192"
          height="62"
          rx="8"
          fill="#f7f8fc"
          stroke="#7b879e"
          strokeWidth="2"
        />
        {keyRows.map((n, row) =>
          Array.from({ length: n }, (_, i) => {
            const space = row === 3 && i === 3;
            const width = space ? 70 : 11;
            const x =
              -85 +
              i * 14.1 +
              (row === 3 && i > 3 ? 57 : 0) +
              (row === 2 ? 4 : 0);
            return (
              <rect
                key={row + "-" + i}
                x={x}
                y={-54 + row * 13}
                width={width}
                height="9"
                rx="1.9"
                fill={
                  stroke >= 0 &&
                  row === stroke % 3 &&
                  i === (stroke * 3 + 2) % 10
                    ? "#8971d3"
                    : "#69748a"
                }
              />
            );
          }),
        )}
      </g>
    </svg>
  );
}

function Actors({ t }: { t: number }) {
  const enter = ease(t, m.astraEnters, 0.55);
  const look = between(t, m.alert, m.chart + 0.6, 0.22);
  const lean = between(t, m.cubeFlip, m.cubeFlip + 0.95, 0.22);
  const proud = between(t, payoffWords[0].start, payoffWords[payoffWords.length - 1].end - 0.18, 0.18);
  const crowd =
    ease(t, m.secondError, 0.29) * (1 - ease(t, m.anotherAlert - 0.18, 0.23));
  const alexX = mix(422, 241, enter) - 11 * crowd;
  const alexHeight = mix(754, 711, enter) + 17 * look + 21 * crowd;
  const astraX = mix(1230, 798, enter) - 26 * crowd;
  const astraHeight = 736 + 27 * crowd;
  const foot = 1482;
  const frustrated = t >= m.secondError + 0.14 && t < m.anotherAlert - 0.12;
  const coffee =
    (t >= m.alert + 0.1 && t < m.demo - 0.08) || (t >= 10.05 && t < 11.95);
  const pose = frustrated
    ? "alex-frustrated"
    : coffee
      ? "alex-coffee"
      : "alex-explain";
  const nod = between(t, m.redesign, m.redesign + 0.31, 0.19) + proud;
  const alexTilt =
    -2.7 * look +
    2.2 * lean -
    1.8 * between(t, m.secondPay, m.secondPay + 0.3, 0.2) +
    1.6 * between(t, m.anotherAlert + 0.04, m.finalClick, 0.12);
  const astraTilt = 2.3 * Math.sin(enter * Math.PI) - 2.4 * nod;
  const draw = (
    id: keyof typeof cast,
    x: number,
    height: number,
    angle: number,
    alpha = 1,
  ) => {
    if (alpha <= 0) return null;
    return (
      <div style={{ ...abs, inset: 0, opacity: alpha }}>
        <div
          style={{
            ...abs,
            left: x - 88,
            top: foot - 4,
            width: 176,
            height: 15,
            borderRadius: "50%",
            background: "#17232b0b",
            transform: "scaleY(.55)",
          }}
        />
        <div
          style={{
            ...abs,
            inset: 0,
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${x}px ${foot}px`,
            mixBlendMode: "multiply",
          }}
        >
          <PixelActor
            actor={cast[id]}
            x={x}
            foot={foot}
            height={height}
            style={{ filter: "brightness(1.01)" }}
          />
        </div>
      </div>
    );
  };
  const palm = (
    id: keyof typeof cast,
    x: number,
    h: number,
    px: number,
    py: number,
    rotation: number,
  ) => {
    const a = cast[id],
      s = h / a.bodyHeight,
      r = (rotation * Math.PI) / 180;
    const dx = (px - a.pivotX) * s,
      dy = (py - a.footY) * s;
    return point(
      x + dx * Math.cos(r) - dy * Math.sin(r),
      foot + dx * Math.sin(r) + dy * Math.cos(r),
    );
  };
  const a = palm("alex-explain", alexX, alexHeight, 813, 505, alexTilt),
    b = palm("astra-present", astraX, astraHeight, 445, 704, astraTilt);
  return (
    <>
      <div
        style={{
          ...abs,
          left: 55,
          right: 55,
          top: 1490,
          height: 2,
          background: "#eceef1",
        }}
      />
      {draw(pose, alexX, alexHeight, alexTilt)}
      {draw("astra-present", astraX, astraHeight, astraTilt, enter)}
      <Keyboard t={t} ax={a.x} ay={a.y} bx={b.x} by={b.y} />
    </>
  );
}

function Cursor({ t }: { t: number }) {
  const p = cursorAt(t);
  const shown =
    1 -
    ease(t, m.demo + 0.45, 0.2) +
    between(t, m.rebuild + 0.17, m.payFlip + 0.33, 0.18) +
    ease(t, m.anotherAlert - 0.36, 0.15);
  if (!shown) return null;
  const press = [m.firstPay, m.tryButton, m.secondPay, m.finalClick].find(
    (at) => t >= at && t < at + 0.27,
  );
  const pulse = press === undefined ? 0 : unit((t - press) / 0.27);
  const size = 1 - 0.13 * Math.sin(Math.PI * unit((t - (press ?? -3)) / 0.1));
  return (
    <svg
      width="1080"
      height="780"
      viewBox="0 0 1080 780"
      style={{ ...abs, inset: 0, opacity: shown, pointerEvents: "none" }}
    >
      {press !== undefined && (
        <circle
          cx={p.x}
          cy={p.y}
          r={5 + 32 * pulse}
          stroke={press === m.finalClick ? "#f3e9ff" : "#77a6ef"}
          fill="none"
          strokeWidth="4"
          opacity={1 - pulse}
        />
      )}
      <g transform={`translate(${p.x} ${p.y}) scale(${size})`}>
        <path
          d="M0 0l4.3 35.5 9-10 8.3 14.4 6.4-3.7-8-14.1 13.5-2.3Z"
          fill="#22242d"
          stroke="#fff"
          strokeWidth="3.7"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function QuickTestFilm({
  captions,
  showCaptions,
  audioEnabled,
}: {
  captions: Caption[];
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const frame = useCurrentFrame(),
    { fps } = useVideoConfig(),
    t = frame / fps;
  const cues = useMemo(
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const caption = cues.find(
    (c) => (frame * 1000) / fps >= c.startMs && (frame * 1000) / fps < c.endMs,
  );
  const checkout =
    1 - ease(t, m.chart + 0.03, 0.3) + ease(t, m.rebuild - 0.09, 0.24);
  return (
    <AbsoluteFill
      style={{
        background: colors.paper,
        color: colors.ink,
        fontFamily: '"Quick Test Inter",sans-serif',
        isolation: "isolate",
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          transformOrigin: "82% 25%",
          transform: `scale(${1 + 0.018 * ease(t, m.anotherAlert + 0.06, 0.37)})`,
        }}
      >
        <Actors t={t} />
        <CheckoutPanel t={t} opacity={checkout} />
        <CubeDemo t={t} words={promptWords} />
        <LaunchPanel t={t} />
        <LaunchPanel t={t} second />
        <Cursor t={t} />
      </AbsoluteFill>
      {showCaptions && caption && (
        <div
          style={{
            ...abs,
            left: 60,
            right: 60,
            top: 1570,
            textAlign: "center",
            fontSize: 68,
            lineHeight: 1.14,
            fontWeight: 850,
            letterSpacing: -1.6,
            color: "white",
            WebkitTextStroke: "9px #20242b",
            paintOrder: "stroke fill",
          }}
        >
          {caption.text.toUpperCase()}
        </div>
      )}
      {audioEnabled && (
        <Audio src={staticFile("episodes/astra-one-quick-test/mix.wav")} />
      )}
    </AbsoluteFill>
  );
}
