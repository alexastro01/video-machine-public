import { useMemo, type CSSProperties, type ReactNode } from "react";
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
import { progressiveCaptionCues } from "../engine/progressive-captions";
import words from "../../episodes/ai-typo/transcript-source.json";
import icons from "../../episodes/ai-typo/assets/icons.json";
import {
  edit,
  e,
  ui,
  mix,
  enter,
  move,
  phaseAt,
  countAt,
  aiCloseAt,
  buttonAt,
  actorPoseAt,
  opusLayoutAt,
} from "./motion";
loadFont({
  family: "Alex Inter",
  url: staticFile("episodes/ai-typo/fonts/InterVariable.woff2"),
  weight: "100 900",
});
const abs: CSSProperties = { position: "absolute" };
const ink = "#20242b",
  blue = "#007aff",
  red = "#c44a5f",
  green = "#4c8b73",
  copper = "#bc7657";
const shadow = "0 26px 70px #182b3514,0 3px 9px #182b3508";
const Card = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <div
    style={{
      ...abs,
      background: "white",
      border: "2px solid #e8e9ed",
      borderRadius: 30,
      boxShadow: shadow,
      ...style,
    }}
  >
    {children}
  </div>
);
const Glyph = ({
  kind,
  size = 40,
  color = ink,
}: {
  kind: keyof typeof icons;
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: icons[kind] }}
  />
);
type ActorId = keyof typeof edit.actors;
const Sprite = ({
  id,
  x,
  foot,
  height,
  style,
}: {
  id: ActorId;
  x: number;
  foot: number;
  height: number;
  style?: CSSProperties;
}) => {
  const a = edit.actors[id],
    scale = height / a.bodyHeight;
  return (
    <Img
      src={staticFile(a.url)}
      style={{
        ...abs,
        left: x - a.pivotX * scale,
        top: foot - a.footY * scale,
        width: a.width * scale,
        height: a.height * scale,
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
};
const Characters = ({ t }: { t: number }) => {
  const poses = actorPoseAt(t),
    close = aiCloseAt(t),
    arrival = enter(t, e.opusArrival, 0.38),
    us = enter(t, e.us, 0.12) * (1 - enter(t, e.auth - 0.12, 0.18));
  const layout = opusLayoutAt(t),
    x = layout.x,
    w = layout.width,
    h = 690;
  const a = edit.actors[layout.id];
  const s = layout.scale;
  const imageTop = layout.top;
  return (
    <>
      <div
        style={{
          ...abs,
          left: 0,
          top: 0,
          width: 1080,
          height: 1920,
          opacity: 1 - close,
          transform: `translateX(${-8 * us}px)`,
          transformOrigin: "250px 1480px",
        }}
      >
        <Sprite
          id={poses.alex as ActorId}
          x={250}
          foot={1500}
          height={620 + 35 * us}
        />
      </div>
      <Card
        style={{
          left: x + 70 * (1 - arrival),
          top: 815,
          width: w,
          height: h,
          opacity: arrival,
          overflow: "hidden",
          borderRadius: 38,
          transform: `scale(${0.97 + 0.03 * arrival})`,
          transformOrigin: "right center",
        }}
      >
        <div
          style={{
            ...abs,
            left: 22,
            top: 19,
            display: "flex",
            alignItems: "center",
            gap: 12,
            zIndex: 2,
          }}
        >
          <div
            style={{
              background: "#f8e9df",
              width: 42,
              height: 42,
              borderRadius: 13,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Glyph kind="spark" color={copper} size={28} />
          </div>
          <span style={{ fontSize: 30, fontWeight: 750, color: ink }}>
            {ui.modelName}
          </span>
        </div>
        <div
          style={{
            ...abs,
            right: 23,
            top: 35,
            width: 10,
            height: 10,
            borderRadius: 10,
            background: green,
          }}
        />
        <div
          style={{
            ...abs,
            left: 0,
            right: 0,
            top: 78,
            bottom: 0,
            overflow: "hidden",
            background: "white",
          }}
        >
          <Img
            src={staticFile(a.url)}
            style={{
              ...abs,
              left: layout.left,
              top: imageTop,
              width: a.width * s,
              height: a.height * s,
              imageRendering: "pixelated",
            }}
          />
        </div>
      </Card>
    </>
  );
};
const Login = ({ t }: { t: number }) => {
  const preview = enter(t, e.preview, 0.42),
    gone = enter(t, e.working + 0.2, 0.35) * (1 - preview),
    b = buttonAt(t),
    focus = move(t, e.typoReveal, 0.46);
  return (
    <div style={{ ...abs, inset: 0, opacity: 1 - gone }}>
      <div
        style={{
          ...abs,
          left: 180,
          top: 112,
          opacity: 1 - focus,
          fontSize: 45,
          fontWeight: 750,
        }}
      >
        Welcome back
      </div>
      {["Email", "Password"].map((text, i) => (
        <div
          key={text}
          style={{
            ...abs,
            left: 180,
            top: 190 + i * 88,
            width: 520,
            height: 65,
            borderRadius: 17,
            background: "#f5f5f8",
            border: "2px solid #e9e9ef",
            display: "flex",
            alignItems: "center",
            paddingLeft: 24,
            boxSizing: "border-box",
            fontSize: 27,
            color: "#9da1aa",
            opacity:
              (1 - focus) *
              (t < e.preview ? 1 : enter(t, e.preview + i * 0.1, 0.2)),
          }}
        >
          {text}
        </div>
      ))}
      <div
        style={{
          ...abs,
          left: b.x,
          top: b.y,
          width: b.width,
          height: b.height,
          borderRadius: mix(24, 38, focus),
          background: blue,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: b.font,
          fontWeight: 750,
          letterSpacing: -2,
          opacity: b.opacity,
          boxShadow: "0 12px 30px #007aff26",
        }}
      >
        <span style={{ whiteSpace: "pre" }}>
          {b.text.slice(0, ui.typoHighlight[0])}
          <span style={{ position: "relative" }}>
            {b.text.slice(ui.typoHighlight[0], ui.typoHighlight[1])}
            <span
              style={{
                ...abs,
                left: -3,
                right: -3,
                bottom: 4,
                height: 8,
                background: "#ffb2a8",
                borderRadius: 6,
                transform: `scaleX(${t < e.working ? enter(t, 0.15, 0.35) : enter(t, e.typoReveal + 0.12, 0.3)})`,
                transformOrigin: "left",
              }}
            />
          </span>
          {b.text.slice(ui.typoHighlight[1])}
        </span>
      </div>
    </div>
  );
};
const Counter = ({ t }: { t: number }) => {
  const n = countAt(t),
    p = enter(t, e.working, 0.3),
    finish = enter(t, e.done, 0.35),
    pop = Math.max(
      ...[e.counter12, e.counter34, e.counter87].map(
        (at) => enter(t, at, 0.09) * (1 - enter(t, at + 0.09, 0.22)),
      ),
    );
  return (
    <div
      style={{
        ...abs,
        left: mix(580, 525, finish),
        top: 10,
        width: mix(292, 350, finish),
        height: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 12,
        opacity:
          p * (1 - enter(t, e.preview, 0.25)) * (1 - enter(t, e.complete, 0.2)),
        transform: `scale(${1 + pop * 0.07})`,
        transformOrigin: "right center",
      }}
    >
      <span style={{ fontSize: 24, color: "#8c919b", fontWeight: 600 }}>
        Files changed
      </span>
      <span
        style={{
          fontSize: 68,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: -2,
          color: n >= 87 ? red : n >= 34 ? copper : blue,
          minWidth: 70,
          textAlign: "right",
        }}
      >
        {n}
      </span>
    </div>
  );
};
const FileStack = ({ t }: { t: number }) => {
  const start = e.counter12 + 0.1;
  return (
    <>
      {[...ui.files.slice(0, 3)].reverse().map((file, i) => {
        const p = enter(t, start + i * 0.16, 0.45);
        return (
          <Card
            key={file}
            style={{
              left: mix(170, 150 + i * 28, p),
              top: 125 + i * 26,
              width: 580,
              height: 260,
              transform: `rotate(${mix(0, (i - 1) * -3, p)}deg) translateY(${(1 - p) * 35}px)`,
              opacity: i === 2 ? 1 : p,
              boxShadow: "0 16px 35px #20242b0c",
            }}
          >
            <div
              style={{
                padding: 28,
                display: "flex",
                alignItems: "center",
                gap: 15,
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              <Glyph kind="file" size={33} />
              {file}
            </div>
            {[0, 1, 2].map((k) => (
              <div
                key={k}
                style={{
                  marginLeft: 70,
                  marginTop: 15,
                  height: 13,
                  width:
                    [330, 260, 380][k] *
                    (1 - (i + 1) * 0.06 * enter(t, e.componentMove, 0.45)),
                  borderRadius: 8,
                  background: k === 1 ? "#d8ece4" : "#edf0f4",
                  transform: `scaleX(${enter(t, (i === 2 ? e.working + 0.4 : start) + 0.1 + i * 0.1 + k * 0.08, 0.3)})`,
                  transformOrigin: "left",
                }}
              />
            ))}
          </Card>
        );
      })}
    </>
  );
};
const Framework = ({ t }: { t: number }) => {
  const p = move(t, e.frameworkMove, 0.55),
    graph = enter(t, e.architecture, 0.4);
  return (
    <>
      <Card
        style={{
          left: 120,
          top: 150,
          width: 680,
          height: 280,
          transform: `translateY(${-30 * graph}px)`,
        }}
      >
        <div style={{ padding: 26, fontSize: 31, fontWeight: 750 }}>
          package.json
        </div>
        <div
          style={{
            ...abs,
            left: 45,
            top: 105,
            fontFamily: "ui-monospace,monospace",
            fontSize: 38,
            color: red,
            opacity: 1 - p,
            transform: `translateX(${-90 * p}px)`,
          }}
        >
          - old-framework
        </div>
        <div
          style={{
            ...abs,
            left: 45,
            top: 105,
            fontFamily: "ui-monospace,monospace",
            fontSize: 38,
            color: green,
            opacity: p,
            transform: `translateX(${90 * (1 - p)}px)`,
          }}
        >
          + new-framework
        </div>
        <div
          style={{
            ...abs,
            left: 46,
            top: 180,
            width: 470 * p,
            height: 15,
            borderRadius: 10,
            background: "#dcebe6",
          }}
        />
      </Card>
      <div
        style={{
          ...abs,
          left: 135,
          top: 450,
          display: "flex",
          gap: 24,
          opacity: graph,
        }}
      >
        {["App", "Components", "Tokens"].map((name, i) => (
          <div
            key={name}
            style={{
              width: 195,
              height: 74,
              borderRadius: 18,
              background: i === 1 ? "#e8f1ff" : "#f1f2f5",
              display: "grid",
              placeItems: "center",
              fontSize: 25,
              fontWeight: 700,
              transform: `translateY(${25 * (1 - enter(t, e.architecture + i * 0.12, 0.35))}px)`,
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </>
  );
};
const Auth = ({ t }: { t: number }) => {
  const p = enter(t, e.authMove, 0.4),
    letters = enter(t, e.letters + 0.16, 0.32);
  return (
    <>
      <div style={{ ...abs, inset: 0, opacity: 1 - letters }}>
        <svg width="920" height="600" style={abs}>
          <path
            d="M460 280L210 440M460 280L710 440M460 280V120"
            stroke="#d9e4f1"
            strokeWidth="5"
            fill="none"
            strokeDasharray="12 10"
            strokeDashoffset={50 * (1 - p)}
          />
        </svg>
        <div
          style={{
            ...abs,
            left: 385,
            top: 205,
            width: 150,
            height: 150,
            background: "#e9f2ff",
            borderRadius: 35,
            display: "grid",
            placeItems: "center",
            transform: `scale(${0.8 + 0.2 * p})`,
          }}
        >
          <Glyph kind="lock" size={85} color={blue} />
        </div>
        {[
          ["Sessions", 210, 440],
          ["Packages", 710, 440],
          ["Keys", 460, 120],
        ].map(([label, x, y], i) => (
          <Card
            key={label}
            style={{
              left: Number(x) - 100,
              top: Number(y) - 35,
              width: 200,
              height: 70,
              display: "grid",
              placeItems: "center",
              fontSize: 28,
              fontWeight: 700,
              opacity: enter(t, e.authMove + 0.12 + i * 0.16, 0.3),
              transform: `translateY(${18 * (1 - enter(t, e.authMove + 0.12 + i * 0.16, 0.3))}px)`,
            }}
          >
            {label}
          </Card>
        ))}
      </div>
      <div style={{ ...abs, inset: 0, opacity: letters }}>
        <div
          style={{
            ...abs,
            left: 0,
            right: 0,
            top: 90,
            textAlign: "center",
            fontSize: 30,
            color: "#9096a0",
          }}
        >
          The requested change
        </div>
        <div
          style={{
            ...abs,
            left: 225,
            top: 235,
            display: "flex",
            alignItems: "center",
            gap: 22,
          }}
        >
          {["n", "g"].map((letter, i) => {
            const q = move(t, e.letterMove, 0.5);
            return (
              <div
                key={letter}
                style={{
                  width: 140,
                  height: 150,
                  borderRadius: 25,
                  background: "#eef3fc",
                  color: blue,
                  fontSize: 100,
                  fontWeight: 750,
                  display: "grid",
                  placeItems: "center",
                  transform: `translateX(${(i === 0 ? 1 : -1) * 162 * q}px) translateY(${Math.sin(q * Math.PI) * (i === 0 ? -95 : 95)}px)`,
                }}
              >
                {letter}
              </div>
            );
          })}
          <div
            style={{
              marginLeft: 45,
              fontSize: 31,
              fontWeight: 700,
              color: copper,
            }}
          >
            2 letters
          </div>
        </div>
      </div>
    </>
  );
};
const Done = ({ t }: { t: number }) => {
  const p = enter(t, e.done, 0.35);
  return (
    <div
      style={{
        ...abs,
        left: 0,
        right: 0,
        top: 140,
        textAlign: "center",
        transform: `translateY(${35 * (1 - p)}px)`,
        opacity: p,
      }}
    >
      <div
        style={{
          fontSize: 146,
          fontWeight: 800,
          color: red,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
          letterSpacing: -8,
        }}
      >
        {ui.finalCount}
      </div>
      <div
        style={{
          fontSize: 38,
          fontWeight: 650,
          color: "#7b828c",
          marginTop: 6,
        }}
      >
        files changed
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          marginTop: 35,
          padding: "12px 24px",
          borderRadius: 30,
          background: "#e6f2eb",
          color: green,
          fontSize: 29,
          fontWeight: 700,
        }}
      >
        <Glyph kind="check" size={29} color={green} />
        Completed
      </div>
    </div>
  );
};
const Workspace = ({ t }: { t: number }) => {
  const phase = phaseAt(t),
    coding = enter(t, e.working + 0.2, 0.35) * (1 - enter(t, e.preview, 0.42)),
    landing = 1 - enter(t, -0.05, 0.4);
  const inside =
    phase === "working" || phase === "files" || phase === "components" ? (
      <FileStack t={t} />
    ) : phase === "framework" || phase === "architecture" || phase === "us" ? (
      <Framework t={t} />
    ) : phase === "auth" || phase === "letters" ? (
      <Auth t={t} />
    ) : (
      <Done t={t} />
    );
  return (
    <>
      <Card
        style={{
          left: 80,
          top: 150 + 30 * landing,
          width: 920,
          height: 620,
          borderRadius: 40,
          overflow: "hidden",
          transform: `scale(${1 - 0.018 * landing}) rotate(${-1.1 * landing}deg)`,
        }}
      >
        <div style={{ ...abs, left: 28, top: 32, display: "flex", gap: 11 }}>
          {["#ffb3ac", "#f3d99c", "#add9c1"].map((c) => (
            <span
              key={c}
              style={{
                display: "block",
                width: 16,
                height: 16,
                borderRadius: 20,
                background: c,
              }}
            />
          ))}
        </div>
        <div
          style={{
            ...abs,
            left: 125,
            top: 27,
            fontSize: 25,
            fontWeight: 600,
            color: "#8d939d",
          }}
        >
          {coding > 0.5 ? "Change review" : "Login preview"}
        </div>
        <Counter t={t} />
        <div
          style={{
            ...abs,
            left: 0,
            top: 70,
            width: 920,
            height: 550,
            overflow: "hidden",
          }}
        >
          <Login t={t} />
          <div style={{ ...abs, inset: 0, opacity: coding }}>{inside}</div>
        </div>
      </Card>
      <div
        style={{
          ...abs,
          left: 130,
          top: 785,
          width: 820,
          height: 78,
          borderRadius: 25,
          background: "#ebedf2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          fontSize: 30,
          fontWeight: 600,
          opacity: 1 - enter(t, e.send + 0.16, 0.3),
          transform: `translateY(${-24 * enter(t, e.send, 0.35)}px) scale(${1 - 0.06 * enter(t, e.send, 0.35)})`,
        }}
      >
        <span style={{ color: "#8b8f99" }}>Fix:</span>
        <span style={{ color: red }}>“{ui.typo}”</span>
        <span style={{ color: "#8b8f99" }}>→</span>
        <span style={{ color: green }}>“{ui.correct}”</span>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 15,
            background: blue,
            marginLeft: 24,
            display: "grid",
            placeItems: "center",
            transform: `scale(${1 - 0.15 * enter(t, e.send, 0.06) * (1 - enter(t, e.send + 0.06, 0.14))})`,
          }}
        >
          <Glyph kind="arrow" size={30} color="white" />
        </div>
      </div>
    </>
  );
};
export const AiTypoFilm = ({
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
  const cues = useMemo(
    () => progressiveCaptionCues(captions, words.words),
    [captions],
  );
  const c = cues.find((x) => t * 1000 >= x.startMs && t * 1000 < x.endMs);
  return (
    <AbsoluteFill
      style={{
        background: "#f8f8fa",
        fontFamily: '"Alex Inter",sans-serif',
        color: ink,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          ...abs,
          left: 80,
          right: 80,
          top: 1515,
          height: 2,
          background: "#e9ebf1",
        }}
      />
      <Characters t={t} />
      <Workspace t={t} />
      {showCaptions && c && (
        <div
          style={{
            ...abs,
            left: 65,
            right: 65,
            top: 1590,
            textAlign: "center",
            fontSize: 65,
            fontWeight: 850,
            lineHeight: 1.12,
            color: "white",
            WebkitTextStroke: "9px #20242b",
            paintOrder: "stroke fill",
            letterSpacing: -1.5,
          }}
        >
          {c.text.toUpperCase()}
        </div>
      )}
      {audioEnabled && (
        <>
          <Audio src={staticFile("episodes/ai-typo/narration.wav")} />
          <Audio src={staticFile("episodes/ai-typo/music.wav")} />
          <Audio src={staticFile("episodes/ai-typo/effects.wav")} />
        </>
      )}
    </AbsoluteFill>
  );
};
