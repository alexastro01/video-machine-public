import {
  AbsoluteFill,
  Img,
  interpolateColors,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import type { Caption } from "@remotion/captions";
import poses from "../../episodes/shower-singing/assets/miko.json";
import {
  edit,
  events,
  plan,
  features,
  enter,
  move,
  unit,
  phaseAt,
  paths,
  pathPoint,
  reflectionEnergy,
  impactStrength,
  layoutAt,
  softnessAt,
  poseAt,
  emissionStarts,
  endWipeAt,
  vocalLevelAt,
} from "./motion";

loadFont({
  family: "Shower Inter",
  url: staticFile("episodes/ok-message-motion/fonts/InterVariable.woff2"),
  weight: "100 900",
});
const font = '"Shower Inter", -apple-system, BlinkMacSystemFont, sans-serif';
const ink = "#17181c",
  blue = "#007aff",
  green = "#568274",
  paper = "#f8f8fa";

const Icon = ({
  name,
  size = 50,
  color = blue,
}: {
  name: string;
  size?: number;
  color?: string;
}) => (
  <div
    style={{
      width: size,
      height: size,
      background: color,
      maskImage: `url(${staticFile(`episodes/ok-message-motion/icons/${name}.svg`)})`,
      maskSize: "contain",
      maskRepeat: "no-repeat",
      WebkitMaskImage: `url(${staticFile(`episodes/ok-message-motion/icons/${name}.svg`)})`,
      WebkitMaskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
    }}
  />
);

const Miko = ({
  pose,
  x = 450,
  y = 900,
  height = 675,
  opacity = 1,
}: {
  pose: keyof typeof poses;
  x?: number;
  y?: number;
  height?: number;
  opacity?: number;
}) => {
  const a = poses[pose],
    scale = height / a.height;
  return (
    <Img
      src={staticFile(a.file)}
      style={{
        position: "absolute",
        left: x - a.pivotX * scale,
        top: y - a.footY * scale,
        width: a.width * scale,
        height,
        imageRendering: "pixelated",
        opacity,
      }}
    />
  );
};

const Pill = ({
  children,
  x,
  y,
  width = 225,
  active = true,
}: {
  children: React.ReactNode;
  x: number;
  y: number;
  width?: number;
  active?: boolean;
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      height: 66,
      borderRadius: 33,
      background: active ? "white" : "#eef0f4",
      border: "2px solid #e0e5ec",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 34,
      fontWeight: 650,
      letterSpacing: -1,
      color: active ? ink : "#687580",
      boxShadow: active ? "0 8px 20px #152d4210" : "none",
    }}
  >
    {children}
  </div>
);

const PulseField = ({
  time,
  softness,
  hook = false,
  dry = false,
}: {
  time: number;
  softness: number;
  hook?: boolean;
  dry?: boolean;
}) => {
  const speed = plan.graphics.pixelsPerSecond;
  const cutoff = hook ? Infinity : events.tail + 1.5;
  return (
    <svg
      width={940}
      height={1000}
      style={{ position: "absolute", inset: 0, overflow: "visible" }}
    >
      {!hook &&
        paths.map((route, i) => (
          <path
            key={i}
            d={route
              .map(
                (s, j) =>
                  `${j === 0 ? `M${s.from.x} ${s.from.y}` : ""} L${s.to.x} ${s.to.y}`,
              )
              .join(" ")}
            fill="none"
            stroke={softness > 0.5 ? "#c1d1cc" : "#b6d2ed"}
            strokeWidth={2.5}
            strokeDasharray="5 10"
            opacity={0.36 * (1 - enter(time, events.tail + 0.6, 0.8))}
          />
        ))}
      {paths.flatMap((route, pathIndex) =>
        emissionStarts(time, pathIndex, hook).flatMap((start, index) => {
          if (!hook && start > cutoff && time < events.swap) return [];
          const distance = (time - start) * speed;
          const point = pathPoint(route, distance);
          const elements: React.ReactNode[] = [];
          if (point) {
            const energy = reflectionEnergy(point.bounces, dry ? 1 : softness);
            const ageFade = 1 - unit((time - start - 2.4) / 1.3);
            const length = 20 + energy * 22;
            elements.push(
              <line
                key={`p-${pathIndex}-${index}`}
                x1={point.x - (point.dy * length) / 2}
                y1={point.y + (point.dx * length) / 2}
                x2={point.x + (point.dy * length) / 2}
                y2={point.y - (point.dx * length) / 2}
                stroke={blue}
                strokeWidth={4 + energy * 3}
                strokeLinecap="round"
                opacity={energy * 0.72 * ageFade}
              />,
            );
            elements.push(
              <circle
                key={`dot-${pathIndex}-${index}`}
                cx={point.x}
                cy={point.y}
                r={4 + energy * 2}
                fill={blue}
                opacity={energy * 0.7 * ageFade}
              />,
            );
          }
          for (const [j, s] of route.entries()) {
            const arrival = start + (s.start + s.length) / speed;
            const strength =
              impactStrength(time, arrival) *
              reflectionEnergy(j, dry ? 1 : softness);
            if (strength > 0.01)
              elements.push(
                <circle
                  key={`hit-${pathIndex}-${index}-${j}`}
                  cx={s.to.x}
                  cy={s.to.y}
                  r={10 + unit((time - arrival) / 0.22) * 26}
                  fill="none"
                  stroke={softness > 0.5 ? green : blue}
                  strokeWidth={3}
                  opacity={strength * 0.7}
                />,
              );
          }
          return elements;
        }),
      )}
    </svg>
  );
};

const TileSurface = ({
  softness,
  time,
}: {
  softness: number;
  time: number;
}) => (
  <>
    <svg width={940} height={1000} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="shower-wall" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#f7fbfe" />
          <stop offset="1" stopColor="#dce9f1" />
        </linearGradient>
        <linearGradient id="shower-floor" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#edf4f6" />
          <stop offset="1" stopColor="#cadce6" />
        </linearGradient>
        <linearGradient id="shower-soft" x1="0" x2="1">
          <stop stopColor="#e9f0eb" />
          <stop offset=".5" stopColor="#cadbd2" />
          <stop offset="1" stopColor="#f4f7f3" />
        </linearGradient>
      </defs>
      <path d="M110 160 L830 160 L830 870 L110 870Z" fill="url(#shower-wall)" />
      <path d="M110 160 L45 105 L45 905 L110 870Z" fill="#cbdde8" />
      <path d="M830 160 L895 105 L895 905 L830 870Z" fill="#d7e5ed" />
      <path d="M110 870 L830 870 L895 935 L45 935Z" fill="url(#shower-floor)" />
      <g opacity={1 - softness}>
        {Array.from({ length: 7 }, (_, i) => (
          <line
            key={`h${i}`}
            x1={110}
            x2={830}
            y1={160 + i * 118}
            y2={160 + i * 118}
            stroke="#bfd1df"
            strokeWidth={3}
          />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <line
            key={`v${i}`}
            x1={110 + i * 120}
            x2={110 + i * 120}
            y1={160}
            y2={870}
            stroke="#bfd1df"
            strokeWidth={3}
          />
        ))}
        <path
          d="M620 160 V220 Q620 265 660 265 H738"
          fill="none"
          stroke="#8fa8b9"
          strokeWidth={16}
          strokeLinecap="round"
        />
        <path d="M713 270 H780 L792 291 H701Z" fill="#9eb5c4" />
      </g>
      <g opacity={softness}>
        {Array.from({ length: 8 }, (_, i) => {
          const p = enter(time, events.swap + 0.1 + i * 0.045, 0.5);
          return (
            <rect
              key={i}
              x={110 + i * 90}
              y={160 - (1 - p) * 85}
              width={92}
              height={710}
              rx={30}
              fill="url(#shower-soft)"
            />
          );
        })}
        <path
          d="M110 168 H830"
          stroke="#7e9d8f"
          strokeWidth={11}
          strokeLinecap="round"
        />
        <rect
          x={658}
          y={565}
          width={155}
          height={220}
          rx={25}
          fill="#d4e2d7"
          stroke="#abc3b1"
          strokeWidth={3}
        />
        <path
          d="M685 596 V755 M704 596 V755 M723 596 V755 M742 596 V755 M761 596 V755 M780 596 V755"
          stroke="#bdcfc1"
          strokeWidth={5}
        />
        <path
          d="M647 559 H825"
          stroke="#789586"
          strokeWidth={12}
          strokeLinecap="round"
        />
      </g>
    </svg>
    <div
      style={{
        position: "absolute",
        left: 300,
        top: 855,
        width: 315,
        height: 42,
        borderRadius: "50%",
        background: "#263e4520",
        filter: "blur(12px)",
      }}
    />
  </>
);

const Room = ({
  time,
  softness = 0,
  pose,
  hook = false,
  dry = false,
  showLabel = true,
}: {
  time: number;
  softness?: number;
  pose: keyof typeof poses;
  hook?: boolean;
  dry?: boolean;
  showLabel?: boolean;
}) => (
  <div
    style={{
      position: "absolute",
      width: 940,
      height: 1000,
      borderRadius: 70,
      background: interpolateColors(softness, [0, 1], ["#edf4f9", "#edf3ee"]),
      border: "2px solid #dce5ec",
      overflow: "hidden",
      boxShadow: "0 30px 75px #193c5d0d",
    }}
  >
    <TileSurface softness={dry ? 1 : softness} time={time} />
    <PulseField time={time} softness={softness} hook={hook} dry={dry} />
    {hook && !dry && time <= events.wetEnd && (
      <svg width={940} height={1000} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const age = time - (events.wetStart - 0.12 + i * 0.3);
          if (age < 0 || age > 0.65) return null;
          const progress = age / 0.65;
          const strength = vocalLevelAt(time, events.wetStart);
          return (
            <circle
              key={i}
              cx={plan.graphics.source.x}
              cy={plan.graphics.source.y}
              r={45 + progress * 200}
              fill="none"
              stroke={blue}
              strokeWidth={4 + strength * 7}
              opacity={(1 - progress) * (0.18 + strength * 0.3)}
            />
          );
        })}
      </svg>
    )}
    <Miko pose={pose} />
    {showLabel && (
      <Pill x={30} y={30} width={softness > 0.5 || dry ? 250 : 220}>
        {dry ? "DRY VOICE" : softness > 0.5 ? "SOFT ROOM" : "SHOWER"}
      </Pill>
    )}
  </div>
);

const WaveRow = ({
  data,
  x,
  y,
  width,
  height,
  color = blue,
  progress = 1,
}: {
  data: number[];
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  progress?: number;
}) => (
  <svg
    width={width}
    height={height}
    style={{ position: "absolute", left: x, top: y, overflow: "visible" }}
  >
    <line
      x1={0}
      y1={height / 2}
      x2={width}
      y2={height / 2}
      stroke="#d8e0e9"
      strokeWidth={2}
    />
    {data.map((v, i) => {
      const p = unit((progress * data.length - i) / 5),
        h = Math.max(3, v * height * 0.82);
      return (
        <rect
          key={i}
          x={(i * width) / data.length}
          y={(height - h) / 2}
          width={Math.max(2, width / data.length - 2)}
          height={h}
          rx={2}
          fill={color}
          opacity={p}
        />
      );
    })}
  </svg>
);

const WavePanel = ({
  time,
  kind,
}: {
  time: number;
  kind: "proof" | "tail" | "fullness";
}) => {
  const start = kind === "proof" ? events.proof : events.tail;
  const p = enter(time, start + 0.1, 0.3),
    draw = move(time, start + 0.12, 1.0);
  const isProof = kind === "proof";
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        top: 1045,
        width: 940,
        height: 300,
        opacity: p,
        transform: `translateY(${(1 - p) * 24}px)`,
        background: "white",
        border: "2px solid #e2e6ed",
        borderRadius: 43,
        boxShadow: "0 15px 45px #173a5510",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 28,
          top: 25,
          fontSize: 32,
          fontWeight: 650,
          color: ink,
        }}
      >
        {isProof ? "SAME TAKE" : "DIRECT SOUND"}
      </div>
      <WaveRow
        data={features.dry}
        x={260}
        y={20}
        width={640}
        height={105}
        progress={draw}
      />
      <div
        style={{
          position: "absolute",
          left: 28,
          top: 175,
          fontSize: 32,
          fontWeight: 650,
          color: isProof ? ink : blue,
        }}
      >
        {isProof ? "REPLAY" : "WITH ROOM"}
      </div>
      <WaveRow
        data={isProof ? features.dry : features.wet}
        x={260}
        y={165}
        width={640}
        height={105}
        color={isProof ? blue : "#629dcc"}
        progress={draw}
      />
      {!isProof && (
        <div
          style={{
            position: "absolute",
            left: 260 + (features.vocalDuration / features.plotDuration) * 640,
            top: 150,
            width: 640 * (1 - features.vocalDuration / features.plotDuration),
            height: 135,
            borderRadius: 14,
            border: "2px solid #8bbce3",
            background: "#007aff08",
            opacity: enter(time, events.reverb - 0.2, 0.25),
          }}
        />
      )}
      {kind === "fullness" && (
        <div
          style={{
            position: "absolute",
            left:
              260 +
              move(
                time,
                events.fullness + 0.1,
                events.longer - events.fullness - 0.1,
              ) *
                640,
            top: 160,
            height: 115,
            width: 3,
            borderRadius: 2,
            background: blue,
            boxShadow: "0 0 16px #007aff22",
            opacity:
              enter(time, events.fullness + 0.1, 0.2) *
              (1 - enter(time, events.longer + 0.2, 0.25)),
          }}
        />
      )}
    </div>
  );
};

const ProofSource = ({ time }: { time: number }) => {
  const p = enter(time, events.proof, 0.3);
  return (
    <div
      style={{
        position: "absolute",
        left: 780,
        top: 440,
        width: 190,
        height: 350,
        opacity: p,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 26,
          top: 0,
          width: 140,
          height: 140,
          borderRadius: 40,
          background: "white",
          border: "2px solid #dce3eb",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Icon name="mic" size={74} />
      </div>
      <svg
        width={190}
        height={270}
        style={{ position: "absolute", left: 0, top: 130 }}
      >
        <path
          d="M95 0 V180 L30 230 M95 180 L155 230"
          stroke="#b2c6db"
          fill="none"
          strokeWidth={5}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - enter(time, events.proof + 0.13, 0.6)}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 290,
          left: 30,
          width: 130,
          textAlign: "center",
          fontSize: 35,
          fontWeight: 650,
        }}
      >
        1 VOCAL
      </div>
    </div>
  );
};

const Comparison = ({ time }: { time: number }) => {
  const p = enter(time, events.same, 0.35);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 580,
          top: 465,
          transform: "scale(.45)",
          transformOrigin: "top left",
          opacity: p,
        }}
      >
        <Room time={time} softness={1} pose="rest" showLabel={false} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 350,
          fontSize: 45,
          fontWeight: 650,
          opacity: p,
        }}
      >
        TILES
      </div>
      <div
        style={{
          position: "absolute",
          left: 610,
          top: 350,
          fontSize: 45,
          fontWeight: 650,
          color: green,
          opacity: p,
        }}
      >
        FABRIC
      </div>
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 1045,
          width: 410,
          height: 230,
          borderRadius: 35,
          background: "white",
          opacity: p,
        }}
      >
        <WaveRow data={features.wet} x={18} y={45} width={374} height={150} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 600,
          top: 1045,
          width: 410,
          height: 230,
          borderRadius: 35,
          background: "white",
          opacity: p,
        }}
      >
        <WaveRow
          data={features.dry}
          x={18}
          y={45}
          width={374}
          height={150}
          color={green}
        />
      </div>
    </>
  );
};

export const ShowerFilm = ({
  captions,
  showCaptions = true,
  audioEnabled = true,
}: {
  captions: Caption[];
  showCaptions?: boolean;
  audioEnabled?: boolean;
}) => {
  const time = useCurrentFrame() / edit.fps;
  const wipe = endWipeAt(time),
    phase = phaseAt(time);
  const pictureTime =
    phase === "loop" ? (wipe >= 0.5 ? 0 : events.loop - 0.001) : time;
  const picturePhase = phaseAt(pictureTime),
    layout = layoutAt(pictureTime);
  const dry = picturePhase === "dry" || picturePhase === "reaction";
  const soft = ["same", "joke"].includes(picturePhase)
    ? 0
    : softnessAt(pictureTime);
  const mainPose = poseAt(pictureTime);
  const active = captions.find(
    (c) => time * 1000 >= c.startMs && time * 1000 < c.endMs,
  );
  const hook = ["hook", "dry", "reaction"].includes(picturePhase);
  const panel = ["proof", "tail", "fullness"].includes(picturePhase);
  return (
    <AbsoluteFill
      style={{
        background: paper,
        fontFamily: font,
        color: ink,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: layout.x,
          top: layout.y,
          width: 940,
          height: 1000,
          transform: `scale(${layout.scale})`,
          transformOrigin: "top left",
        }}
      >
        <Room
          time={pictureTime}
          softness={soft}
          pose={mainPose}
          hook={hook}
          dry={dry}
          showLabel={picturePhase !== "same"}
        />
        {phase === "loop" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: 940,
              height: 1000,
              borderRadius: 70,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: (wipe * 2 - 1) * 940,
                top: 0,
                width: 940,
                height: 1000,
                background: "#e8f1f7",
              }}
            >
              <TileSurface softness={0} time={0} />
            </div>
          </div>
        )}
      </div>
      {panel && (
        <WavePanel
          time={pictureTime}
          kind={picturePhase as "proof" | "tail" | "fullness"}
        />
      )}
      {picturePhase === "proof" && <ProofSource time={pictureTime} />}
      {picturePhase === "same" && <Comparison time={pictureTime} />}
      {showCaptions && active && (
        <div
          style={{
            position: "absolute",
            left: 70,
            right: 70,
            top: 1450,
            textAlign: "center",
            fontSize: active.text.length > 19 ? 58 : 64,
            fontWeight: 850,
            lineHeight: 1.1,
            letterSpacing: -0.6,
            wordSpacing: 8,
            color: "white",
            WebkitTextStroke: "7px #172c37",
            paintOrder: "stroke fill",
            transform: `translateY(${(1 - enter(time, active.startMs / 1000, 0.1)) * 8}px)`,
          }}
        >
          {active.text.toUpperCase()}
        </div>
      )}
      {audioEnabled && (
        <>
          <Audio src={staticFile("episodes/shower-singing/narration.wav")} />
          <Audio src={staticFile("episodes/shower-singing/music.wav")} />
          <Audio src={staticFile("episodes/shower-singing/effects.wav")} />
        </>
      )}
    </AbsoluteFill>
  );
};
