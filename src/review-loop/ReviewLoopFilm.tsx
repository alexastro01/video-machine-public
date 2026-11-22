import { useMemo } from "react";
import {
  AbsoluteFill,
  interpolateColors,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import type { Caption } from "@remotion/captions";
import { abs, Card, colors, PixelActor } from "../developer/primitives";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import transcript from "../../episodes/ai-review-loop/transcript-source.json";
import {
  castAt,
  codeAt,
  codeOpacity,
  comparisonStart,
  cursorAt,
  diffOpacity,
  e,
  edit,
  enter,
  filePoseAt,
  mix,
  palmAt,
  placedBounds,
  roleColors,
  roles,
  speakerFocusAt,
  ui,
  unit,
  wideAt,
  type CodeState,
  type Placement,
} from "./motion";

loadFont({
  family: "Review Inter",
  url: staticFile("episodes/ai-review-loop/fonts/InterVariable.woff2"),
  weight: "100 900",
});
const mono = 'ui-monospace,"SFMono-Regular",Menlo,monospace';
const lineColor = (line: string) =>
  line.includes("toFixed") ? "#266648" : "#30587e";

function CodeBody({
  state,
  t,
  compact,
}: {
  state: CodeState;
  t: number;
  compact: number;
}) {
  if (state === "architecture")
    return (
      <div style={{ display: "grid", gap: mix(10, 6, compact) }}>
        {ui.modules.map((name, i) => {
          const firstRound = t < e.loopStart;
          const arrived = firstRound ? enter(t, e.modules[i], 0.19) : 1;
          const hero = name === ui.moduleHero;
          return (
            <div
              key={name}
              style={{
                height: mix(72, 52, compact),
                boxSizing: "border-box",
                marginLeft: i * 17,
                borderRadius: 12,
                background: hero ? "#edf2ff" : "#f5f6f9",
                borderLeft:
                  (hero ? 7 : 4) + "px solid " + (hero ? "#5074c9" : "#acbace"),
                padding: "0 22px",
                display: "flex",
                alignItems: "center",
                gap: 17,
                opacity: arrived,
                transform: `translateX(${(1 - arrived) * 27}px)`,
                color: hero ? "#243f82" : "#52647d",
                fontWeight: hero ? 740 : 590,
                fontSize: mix(hero ? 45 : 32, hero ? 46 : 35, compact),
                letterSpacing: -1.2,
              }}
            >
              <span
                style={{ fontFamily: mono, fontSize: ".74em", opacity: 0.63 }}
              >
                {"{}"}
              </span>
              {name}
            </div>
          );
        })}
      </div>
    );
  return (
    <div
      style={{
        fontFamily: mono,
        fontSize: mix(37, 34, compact),
        lineHeight: 1.46,
        letterSpacing: -0.85,
        whiteSpace: "pre",
      }}
    >
      {(state === "original" ? ui.original : ui.simplified).map((line, i) => (
        <div key={i} style={{ color: lineColor(line) }}>
          {line}
        </div>
      ))}
    </div>
  );
}

const Pointer = ({ t }: { t: number }) => {
  const p = cursorAt(t);
  if (p.opacity === 0) return null;
  return (
    <svg
      width="49"
      height="62"
      viewBox="0 0 49 62"
      style={{
        ...abs,
        left: p.x - 4,
        top: p.y - 3,
        opacity: p.opacity,
        filter: "drop-shadow(0 3px 2px #18243d32)",
      }}
    >
      <path
        d="M4 3 42 32 25 34 33 51 24 55 16 37 5 49Z"
        fill="#202937"
        stroke="white"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
};

function Comparison({ t }: { t: number }) {
  const show = diffOpacity(t),
    zero = enter(t, e.diffReveal, 0.23);
  if (show === 0) return null;
  return (
    <div style={{ ...abs, inset: 0, opacity: show }}>
      <div
        style={{
          ...abs,
          top: 223,
          left: 40,
          right: 40,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 33,
        }}
      >
        {[ui.originalLabel, ui.finalLabel].map((label) => (
          <div key={label} style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 29,
                fontWeight: 670,
                color: "#545e6b",
                marginBottom: 9,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontFamily: mono,
                fontSize: 22,
                lineHeight: 1.5,
                letterSpacing: -0.52,
                whiteSpace: "pre",
              }}
            >
              {ui.original.map((text, i) => (
                <div key={i} style={{ color: lineColor(text) }}>
                  {text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          ...abs,
          left: 0,
          right: 0,
          top: 354,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 21,
          opacity: zero,
          transform: `translateY(${(1 - zero) * 15}px) scale(${mix(0.9, 1, zero)})`,
        }}
      >
        <span
          style={{
            fontSize: 212,
            fontWeight: 790,
            lineHeight: 1,
            letterSpacing: -9,
            color: "#0877e5",
          }}
        >
          {ui.zero}
        </span>
        <span style={{ fontSize: 65, fontWeight: 700, letterSpacing: -2.6 }}>
          {ui.changes}
        </span>
      </div>
    </div>
  );
}

function FileCard({ t }: { t: number }) {
  const p = filePoseAt(t),
    k = p.compact,
    scale = mix(1, 0.53, k),
    width = p.w / scale;
  const state = codeAt(t),
    owner = state.current.role,
    content = codeOpacity(t);
  const previous =
    state.previous.state === state.current.state
      ? 0
      : 1 - unit(state.progress / 0.44);
  const current =
    state.previous.state === state.current.state
      ? 1
      : unit((state.progress - 0.46) / 0.54);
  const hover = cursorAt(t).hover;
  return (
    <Card
      style={{
        left: p.x - p.w / 2,
        top: p.top,
        width: p.w,
        height: p.h,
        boxSizing: "border-box",
        overflow: "hidden",
        borderColor: "#dce1e7",
        borderRadius: mix(29, 22, k),
        transform: `rotate(${p.angle}deg)`,
        boxShadow: "0 13px 42px #182b3510, 0 3px 8px #182b3509",
      }}
    >
      <div
        style={{
          ...abs,
          left: 0,
          top: 0,
          width,
          height: p.h / scale,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        <div
          style={{
            ...abs,
            left: 38,
            top: 26,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: mix(30, 39, k),
            color: "#515d6a",
            fontWeight: 650,
            letterSpacing: -0.7,
          }}
        >
          {ui.file}
        </div>
        <div
          style={{
            ...abs,
            right: 36,
            top: 25,
            color: roleColors[owner],
            opacity: content,
            fontWeight: 700,
            fontSize: mix(29, 42, k),
            letterSpacing: -0.85,
          }}
        >
          {ui.reviewNames[owner]}
        </div>
        <div
          style={{
            ...abs,
            left: 35,
            right: 35,
            top: 83,
            height: 2,
            background: "#e9ecf0",
          }}
        />
        <div
          style={{
            ...abs,
            left: 38,
            top: 100,
            display: "flex",
            alignItems: "center",
            gap: mix(24, 19, k),
            lineHeight: 1.03,
            opacity: 1 - 0.24 * enter(t, e.diffReveal, 0.24),
          }}
        >
          <span
            style={{
              padding: "10px 26px",
              border: "2px solid #e2e6ec",
              borderRadius: 13,
              background: "#f6f7f9",
              fontSize: mix(52, 62, k),
              fontWeight: 550,
              fontVariantNumeric: "tabular-nums",
              color: "#3c4959",
            }}
          >
            {ui.input}
          </span>
          <svg width={mix(50, 42, k)} height="34" viewBox="0 0 50 34">
            <path
              d="M3 17h41M31 4l13 13-13 13"
              stroke="#929daa"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: mix(78, 89, k),
              letterSpacing: -3.7,
              fontWeight: 710,
              color: "#176549",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {ui.output}
          </span>
        </div>
        {k < 1 && content > 0 && (
          <div
            style={{
              ...abs,
              top: 111,
              right: 37,
              width: 168,
              height: 64,
              display: "grid",
              placeItems: "center",
              borderRadius: 15,
              background: interpolateColors(
                hover,
                [0, 1],
                ["#eaf2ee", "#285b56"],
              ),
              color: interpolateColors(hover, [0, 1], ["#2c5348", "#ffffff"]),
              border: "2px solid #c3d4c9",
              fontSize: 34,
              fontWeight: 670,
              opacity: content * (1 - k),
              transform: `translateY(${-3 * hover}px)`,
            }}
          >
            {ui.merge}
          </div>
        )}
        {content > 0 && (
          <div
            style={{
              ...abs,
              left: 40,
              right: 40,
              top: mix(223, 218, k),
              opacity: content,
            }}
          >
            {previous > 0 && (
              <div
                style={{
                  ...abs,
                  left: 0,
                  right: 0,
                  opacity: previous,
                  transform: `translateY(${(previous - 1) * 7}px)`,
                }}
              >
                <CodeBody state={state.previous.state} t={t} compact={k} />
              </div>
            )}
            {current > 0 && (
              <div
                style={{
                  ...abs,
                  left: 0,
                  right: 0,
                  opacity: current,
                  transform: `translateY(${(1 - current) * 8}px)`,
                }}
              >
                <CodeBody state={state.current.state} t={t} compact={k} />
              </div>
            )}
          </div>
        )}
        <Comparison t={t} />
        <Pointer t={t} />
      </div>
    </Card>
  );
}

function Clock({ t }: { t: number }) {
  const opacity = enter(t, e.hoverStart, 0.2) * (1 - enter(t, e.compare, 0.18));
  if (!opacity) return null;
  const p = unit((t - e.loopStart) / (e.loopEnd - e.loopStart));
  return (
    <svg
      width="66"
      height="66"
      viewBox="0 0 66 66"
      style={{ ...abs, right: 73, top: 54, opacity }}
    >
      <circle
        cx="33"
        cy="33"
        r="27"
        fill="#fff"
        stroke="#b9c2cd"
        strokeWidth="3"
      />
      <g stroke="#737e8e" strokeWidth="3.3" strokeLinecap="round">
        <path d="M33 33V12" transform={`rotate(${1080 * p * p} 33 33)`} />
        <path d="M33 33H47" transform={`rotate(${90 * p * p} 33 33)`} />
      </g>
    </svg>
  );
}

function Receipt({ t }: { t: number }) {
  if (!wideAt(t) || t < e.loopStart || t >= comparisonStart) return null;
  const i = e.fastHandoffs.reduce(
    (last, h, index) => (t >= h.at ? index : last),
    0,
  );
  const h = e.fastHandoffs[i],
    duration = 0.15,
    draw = unit((t - h.contact + duration) / duration);
  if (!draw) return null;
  const p = filePoseAt(t),
    palm = palmAt(t, i);
  const x = p.x - p.w * 0.36,
    y = p.top + p.h - 4;
  const fade =
    1 - enter(t, (e.fastHandoffs[i + 1]?.at ?? comparisonStart) - 0.12, 0.12);
  const ring = unit((t - h.contact) / 0.26);
  return (
    <svg
      width="1080"
      height="1920"
      style={{ ...abs, inset: 0, opacity: fade }}
      fill="none"
      stroke={roleColors[roles[i]]}
    >
      <path
        d={`M${x} ${y} C${x} ${y + 68} ${palm.x - 14} ${palm.y - 55} ${palm.x} ${palm.y}`}
        strokeWidth="3.4"
        strokeLinecap="round"
        opacity=".54"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset={1 - draw}
      />
      {draw === 1 && (
        <circle
          cx={palm.x}
          cy={palm.y}
          r="5.5"
          fill={roleColors[roles[i]]}
          stroke="none"
        />
      )}
      {t >= h.contact && ring < 1 && (
        <circle
          cx={palm.x}
          cy={palm.y}
          r={7 + 24 * ring}
          strokeWidth="3.5"
          opacity={1 - ring}
        />
      )}
    </svg>
  );
}

// The gaze layer is registered to the native coffee pose. Both irises stay behind the painted eyelids.
function CoffeeGaze({ p }: { p: Placement }) {
  const { actor, scale } = placedBounds(p);
  const eyes = [
    {
      shape:
        "M483 249 489 246 499 243 512 242 519 243 523 248 523 252 515 260 509 262 495 262 488 258 484 254Z",
      x: 492,
      y: 248,
    },
    {
      shape:
        "M560 238 567 234 576 231 585 231 586 236 585 241 582 246 579 251 568 251 563 247 560 244Z",
      x: 566,
      y: 237,
    },
  ];
  return (
    <svg
      viewBox="476 225 118 45"
      width={118 * scale}
      height={45 * scale}
      shapeRendering="crispEdges"
      style={{
        ...abs,
        left: p.center + (476 - actor.pivotX) * scale,
        top: p.foot + (225 - actor.footY) * scale,
      }}
    >
      <defs>
        {eyes.map((eye, i) => (
          <clipPath id={"review-eye-" + i} key={i}>
            <path d={eye.shape} />
          </clipPath>
        ))}
      </defs>
      {eyes.map((eye, i) => (
        <g key={i} clipPath={`url(#review-eye-${i})`}>
          <path d={eye.shape} fill="#faf8f7" />
          <path d={eye.shape} fill="none" stroke="#bbb5b6" strokeWidth="4" />
          <g
            transform={`translate(${eye.x + p.gaze * (i ? 9 : 14)} ${eye.y + p.gaze * 3})`}
          >
            <rect x="-6" y="-10" width="15" height="22" rx="4" fill="#221d20" />
            <rect x="-4" y="-10" width="11" height="18" fill="#100f11" />
          </g>
        </g>
      ))}
    </svg>
  );
}

function Characters({ t }: { t: number }) {
  const cast = castAt(t);
  const light = speakerFocusAt(t);
  const strongest = Math.max(...Object.values(light));
  return (
    <>
      <div
        style={{
          ...abs,
          left: 55,
          right: 55,
          top: 1491,
          height: 2,
          background: "#eceef1",
        }}
      />
      {cast.map((p) => {
        const intensity = light[p.speaker];
        if (intensity <= 0) return null;
        const color = edit.speakerColors[p.speaker];
        const width = p.height * (wideAt(t) ? 0.56 : 0.7);
        return (
          <div
            key={p.speaker}
            style={{
              ...abs,
              left: p.center - width / 2,
              top: p.foot - p.height * 1.075,
              width,
              height: p.height * 0.65,
              background: `radial-gradient(ellipse closest-side, ${color}71 0%, ${color}60 48%, ${color}29 75%, ${color}00 100%)`,
              opacity: intensity,
            }}
          />
        );
      })}
      {cast.map((p) => {
        const { actor } = placedBounds(p);
        const listener = strongest - light[p.speaker];
        return (
          <div key={p.id} style={{ ...abs, inset: 0 }}>
            <div
              style={{
                ...abs,
                left: p.center - 92,
                top: p.foot - 2,
                width: 184,
                height: 17,
                borderRadius: "50%",
                background: "#17232b0c",
                transform: "scaleY(.55)",
              }}
            />
            <div
              style={{
                ...abs,
                inset: 0,
                transform: `rotate(${p.angle}deg)`,
                transformOrigin: `${p.center}px ${p.foot}px`,
                mixBlendMode: "multiply",
                opacity: 1 - listener * 0.32,
                filter: `saturate(${1 - listener * 0.48})`,
              }}
            >
              <PixelActor
                actor={actor}
                x={p.center}
                foot={p.foot}
                height={p.height}
                style={{ filter: "brightness(1.01)" }}
              />
              {p.id === "alex-coffee" && <CoffeeGaze p={p} />}
            </div>
          </div>
        );
      })}
    </>
  );
}

export const ReviewLoopFilm = ({
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
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const caption = cues.find((c) => t * 1000 >= c.startMs && t * 1000 < c.endMs);
  return (
    <AbsoluteFill
      style={{
        background: colors.paper,
        color: colors.ink,
        fontFamily: '"Review Inter",sans-serif',
        isolation: "isolate",
        overflow: "hidden",
      }}
    >
      <Clock t={t} />
      <Characters t={t} />
      <Receipt t={t} />
      <FileCard t={t} />
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
      {audioEnabled && <Audio src={staticFile(edit.audioMaster)} />}
    </AbsoluteFill>
  );
};
