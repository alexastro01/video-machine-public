import { useMemo, type CSSProperties } from "react";
import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import layout from "../../episodes/start-the-task/assets/miko-v3-layout.json";
import transcript from "../../episodes/start-the-task/transcript-source.json";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import { StudyWorldV3, useV3Study } from "./StudyWorldV3";
import {
  e,
  edit,
  actorAt,
  clamp,
  documentAt,
  graphicsMix,
  heroAt,
  mix,
  out,
  pointerAt,
  smooth,
} from "./v3-motion";

const base = "episodes/start-the-task/";
const ink = "#18191e",
  blue = "#087afa",
  green = "#3b856c",
  paper = "#f8f8fa";
const abs: CSSProperties = { position: "absolute" };
loadFont({
  family: "Task V3 Inter",
  url: staticFile(base + "fonts/InterVariable.woff2"),
  weight: "100 900",
});

const Actor = ({ t }: { t: number }) => {
  const p = actorAt(t),
    g = graphicsMix(t);
  const reaction = t < e.graphics + 0.24;
  const asset = reaction ? layout.reaction : layout.typing;
  const meta = asset.metadata,
    crop = layout.commonCrop;
  const start = reaction ? 0 : t >= e.result + 0.12 ? e.result + 0.12 : e.type;
  const index = Math.max(
    0,
    Math.min(meta.frameCount - 1, Math.floor((t - start + 1e-7) / 0.1)),
  );
  const cell = meta.cells[index];
  const scale = p.height / crop.height;
  const foot = (cell.bottom + 1 - crop.y) * scale;
  return (
    <>
      <div
        style={{
          ...abs,
          left: p.x - p.height * 0.26,
          top: p.foot - 15,
          width: p.height * 0.52,
          height: 29,
          background: "#183c3c",
          opacity: mix(0.23, 0.07, g),
          borderRadius: "50%",
          filter: "blur(12px)",
        }}
      />
      <div
        style={{
          ...abs,
          left: p.x - (layout.horizontalPivot - crop.x) * scale,
          top: p.foot - foot,
          width: crop.width * scale,
          height: crop.height * scale,
          overflow: "hidden",
        }}
      >
        <Img
          src={staticFile(asset.file)}
          style={{
            ...abs,
            width: meta.width * scale,
            height: meta.height * scale,
            maxWidth: "none",
            imageRendering: "pixelated",
            left: -(cell.originX + crop.x) * scale,
            top: -(cell.originY + crop.y) * scale,
          }}
        />
      </div>
    </>
  );
};
const Check = ({
  progress,
  size = 60,
}: {
  progress: number;
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    style={{ overflow: "visible" }}
  >
    <circle
      cx="32"
      cy="32"
      r="29"
      fill={green}
      transform={`translate(32 32) scale(${out(progress, 0, 1)}) translate(-32 -32)`}
    />
    <path
      d="m19 32 9 9 18-20"
      fill="none"
      stroke="white"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength="1"
      strokeDasharray="1"
      strokeDashoffset={1 - progress}
    />
  </svg>
);

const Document = ({ t }: { t: number }) => {
  const r = heroAt(t),
    g = graphicsMix(t),
    doc = documentAt(t);
  const goal = smooth(t, e.goalWord - 0.25, 0.4);
  const replace = smooth(t, e.contact - 0.32, 0.28);
  const folder = smooth(t, e.graphics, 0.45);
  const opened = smooth(t, e.contact + 0.035, 0.5);
  const page = smooth(t, e.file, 0.38);
  const numberSmall = smooth(t, e.graphics, 0.4);
  const zeroShake =
    Math.sin((t - e.zero) * 54) *
    Math.sin(clamp((t - e.zero) / 0.3) * Math.PI) *
    7;
  const done = smooth(t, e.sentenceDone, 0.28);
  const flash = Math.sin(clamp((t - e.concrete) / 0.5) * Math.PI);
  return (
    <div
      style={{
        ...abs,
        left: r.x,
        top: r.y,
        width: r.width,
        height: r.height,
        borderRadius: r.radius,
        background: "white",
        boxShadow: `0 ${mix(14, 30, g)}px ${mix(36, 80, g)}px #17323e26`,
        border: `2px solid ${page > 0 ? "#e8e8ed" : "#e4e6ea"}`,
        perspective: 1500,
      }}
    >
      <div
        style={{
          ...abs,
          top: 25,
          left: 30,
          display: "flex",
          gap: 11,
          opacity: 1 - folder,
        }}
      >
        {["#ffbf64", "#d3d8dc", "#d3d8dc"].map((c, i) => (
          <div
            key={i}
            style={{
              width: 15,
              height: 15,
              borderRadius: "50%",
              background: c,
            }}
          />
        ))}
      </div>
      <div
        style={{
          ...abs,
          left: 50,
          right: 50,
          top: 112,
          opacity: page,
          transform: `translateY(${(1 - page) * 35}px)`,
        }}
      >
        <div
          style={{
            height: 8,
            width: 125,
            borderRadius: 5,
            background: blue,
            marginBottom: 52,
          }}
        />
        <div
          style={{
            fontSize: mix(60, 64, g),
            fontWeight: 620,
            letterSpacing: -2.5,
            lineHeight: 1.23,
            whiteSpace: "pre-wrap",
            color: ink,
          }}
        >
          {doc.first}
          {t >= e.type && t < e.sentenceDone && (
            <span
              style={{
                color: blue,
                opacity: 0.5 + 0.5 * Math.cos((t - e.type) * Math.PI * 8),
              }}
            >
              │
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: mix(47, 56, g),
            marginTop: 35,
            lineHeight: 1.2,
            letterSpacing: -1.5,
            color: "#68717a",
          }}
        >
          {doc.next}
        </div>
      </div>
      <div
        style={{
          ...abs,
          top: mix(90, r.height - 98, numberSmall),
          left: mix(60, 52, numberSmall),
          fontSize: mix(207, 43, numberSmall),
          fontWeight: 760,
          letterSpacing: mix(-11, -1.3, numberSmall),
          lineHeight: 1,
          color: mix(0, 1, done) > 0.5 ? green : ink,
          transform: `translateX(${zeroShake}px)`,
        }}
      >
        {doc.words}
        <span
          style={{
            fontSize: mix(80, 36, numberSmall),
            fontWeight: 550,
            letterSpacing: -1.7,
            marginLeft: mix(25, 10, numberSmall),
            color: "#737a82",
          }}
        >
          {doc.words === 1 ? "word" : "words"}
        </span>
      </div>
      <div
        style={{
          ...abs,
          right: 42,
          bottom: 36,
          opacity: done,
          transform: `scale(${0.8 + done * 0.2})`,
        }}
      >
        <Check progress={done} size={55} />
      </div>
      <div
        style={{
          ...abs,
          inset: -2,
          borderRadius: r.radius,
          background: blue,
          opacity: folder * (1 - opened),
          transformOrigin: "center bottom",
          transform: `rotateX(${-opened * 70}deg) translateY(${opened * 155}px)`,
          boxShadow: "0 16px 32px #087afa18",
        }}
      >
        <div
          style={{
            ...abs,
            top: -35,
            left: 0,
            width: 265,
            height: 50,
            borderRadius: "28px 28px 0 0",
            background: blue,
          }}
        />
        <div
          style={{
            ...abs,
            top: 130,
            left: 50,
            right: 50,
            height: 210,
            overflow: "hidden",
            color: "white",
            fontWeight: 750,
            letterSpacing: -3.5,
            fontSize: 85,
            lineHeight: 1.05,
          }}
        >
          <div
            style={{
              ...abs,
              inset: 0,
              transform: `translateY(${-replace * 230}px)`,
              opacity: goal,
            }}
          >
            {edit.ui.goalLine1}
            <br />
            {edit.ui.goalLine2}
          </div>
          <div
            style={{
              ...abs,
              inset: 0,
              transform: `translateY(${(1 - replace) * 230}px)`,
            }}
          >
            {edit.ui.actionLine1}
            <br />
            {edit.ui.actionLine2}
          </div>
        </div>
      </div>
      <div
        style={{
          ...abs,
          inset: -4,
          borderRadius: r.radius + 2,
          border: `5px solid ${green}`,
          opacity: flash * 0.5,
          boxShadow: `0 0 ${flash * 40}px #3b856c25`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
const ResearchPath = ({ t }: { t: number }) => {
  const enter = smooth(t, e.research + 0.12, 0.4);
  const leave = 1 - smooth(t, e.next - 0.12, 0.28);
  const focus = smooth(t, e.means, 0.4);
  const arrive = smooth(t, e.concrete - 0.12, 0.35);
  const progress = smooth(t, e.research + 0.35, e.concrete - e.research - 0.35);
  return (
    <div
      style={{
        ...abs,
        left: 398,
        top: 1060,
        width: 540,
        height: 325,
        opacity: enter * leave,
        transform: `translateY(${(1 - enter) * 30}px)`,
      }}
    >
      <div
        style={{
          ...abs,
          top: 0,
          left: 22,
          color: "#91979d",
          fontSize: 48,
          letterSpacing: -2,
          opacity: 1 - focus * 0.45,
          transform: `translateX(${-focus * 12}px)`,
        }}
      >
        {edit.ui.goalLabel}
      </div>
      <svg
        width="500"
        height="250"
        style={{ ...abs, top: 44, left: 0 }}
        viewBox="0 0 500 250"
      >
        <path
          d="M65 10 V70 Q65 102 105 102 H295 Q340 102 340 143 V160"
          fill="none"
          stroke="#e1e7ec"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M65 10 V70 Q65 102 105 102 H295 Q340 102 340 143 V160"
          fill="none"
          stroke={blue}
          strokeWidth="10"
          strokeLinecap="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={1 - progress}
        />
      </svg>
      <div
        style={{
          ...abs,
          top: 208,
          left: 100,
          width: 360,
          height: 94,
          borderRadius: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: blue,
          boxShadow: `0 10px ${20 + arrive * 20}px #087afa28`,
          color: "white",
          fontSize: 48,
          fontWeight: 700,
          transform: `scale(${0.94 + focus * 0.06})`,
          letterSpacing: -1.7,
        }}
      >
        {edit.ui.actionLabel}
      </div>
    </div>
  );
};
const FirstMove = ({ t }: { t: number }) => {
  const p =
    smooth(t, e.viewerFocus - 0.1, 0.26) *
    (1 - smooth(t, e.returnDesk - 0.1, 0.25));
  return (
    <div
      style={{
        ...abs,
        left: 405,
        top: 1160,
        width: 550,
        height: 135,
        borderRadius: 28,
        background: "white",
        border: `3px solid ${blue}`,
        boxShadow: "0 0 0 9px #087afa0b",
        display: "flex",
        alignItems: "center",
        paddingLeft: 28,
        fontSize: 43,
        letterSpacing: -1.5,
        color: "#747c86",
        opacity: p,
        transform: `translateY(${(1 - p) * 25}px)`,
      }}
    >
      {edit.ui.firstMovePlaceholder}
      <span
        style={{
          marginLeft: 4,
          width: 3,
          height: 49,
          background: blue,
          opacity:
            0.4 +
            0.6 * (0.5 + 0.5 * Math.cos((t - e.viewerFocus) * Math.PI * 3)),
        }}
      />
    </div>
  );
};
const Pointer = ({ t }: { t: number }) => {
  const p = pointerAt(t),
    size = 70;
  return (
    <div style={{ ...abs, left: p.x, top: p.y, opacity: p.opacity }}>
      {t >= e.contact && t < e.contact + 0.34 && (
        <div
          style={{
            ...abs,
            width: 35 + p.ring * 110,
            height: 35 + p.ring * 110,
            border: "6px solid white",
            borderRadius: "50%",
            opacity: 1 - p.ring,
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 0 3px #087afa66",
          }}
        />
      )}
      <svg
        width={size}
        height={size + 16}
        viewBox="0 0 70 86"
        style={{
          transform: `scale(${1 - p.press * 0.14})`,
          transformOrigin: "0 0",
          overflow: "visible",
          filter: "drop-shadow(0 5px 6px #16232c32)",
        }}
      >
        <path
          d="M5 4 11 69 28 52 42 79 56 72 41 47 65 43Z"
          fill="white"
          stroke={ink}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
const Captions = ({ captions, t }: { captions: Caption[]; t: number }) => {
  const cues = useMemo(
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const c = cues.find((x) => t * 1000 >= x.startMs && t * 1000 < x.endMs);
  if (!c) return null;
  return (
    <div
      style={{
        ...abs,
        left: 70,
        right: 70,
        top: 1470,
        textAlign: "center",
        fontSize: 66,
        fontWeight: 800,
        letterSpacing: -1.7,
        lineHeight: 1.12,
        color: "white",
        WebkitTextStroke: "9px #182b35",
        paintOrder: "stroke fill",
        transform: `translateY(${(1 - out(t, c.startMs / 1000, 0.08)) * 7}px)`,
      }}
    >
      {c.text.toUpperCase()}
    </div>
  );
};
export const StartTaskV3Film = ({
  captions,
  showCaptions = true,
  audioEnabled = true,
}: {
  captions: Caption[];
  showCaptions?: boolean;
  audioEnabled?: boolean;
}) => {
  const frame = useCurrentFrame(),
    { fps } = useVideoConfig(),
    t = frame / fps;
  const asset = useV3Study(),
    g = graphicsMix(t);
  return (
    <AbsoluteFill
      style={{
        background: paper,
        overflow: "hidden",
        fontFamily: '"Task V3 Inter", sans-serif',
      }}
    >
      {asset && g < 1 && <StudyWorldV3 asset={asset} t={t} />}
      <AbsoluteFill style={{ background: paper, opacity: g }} />
      <Document t={t} />
      <ResearchPath t={t} />
      <FirstMove t={t} />
      <Actor t={t} />
      <Pointer t={t} />
      {showCaptions && <Captions captions={captions} t={t} />}
      {audioEnabled && (
        <>
          <Audio src={staticFile(base + "narration.wav")} />
          <Audio src={staticFile(base + "effects.wav")} />
          <Audio src={staticFile(base + "music.wav")} />
        </>
      )}
    </AbsoluteFill>
  );
};
