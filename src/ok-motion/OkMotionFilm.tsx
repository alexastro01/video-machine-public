import { createContext, useContext } from "react";
import {
  AbsoluteFill,
  Img,
  interpolateColors,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import type { Caption } from "@remotion/captions";
import plan from "../../episodes/ok-message-motion/motion-plan.json";
import mia from "../../episodes/ok-message-motion/assets/mia.json";
import panic from "../../episodes/ok-message-motion/assets/miko-panic.json";
import talk from "../../episodes/ok-message-motion/assets/miko-talk.json";
import {
  bubbleAt,
  type MotionEdit,
  edit,
  emailPositionAt,
  emailRoute,
  enter,
  finiteFrame,
  mix,
  move,
  stageAt,
  tapFeedbackAt,
  unit,
  visiblePhrase,
  voiceEmphasisAt,
} from "./motion";

const base = "episodes/ok-message-motion/";
const MotionContext = createContext<MotionEdit>(edit);
const useMotionCues = () => useContext(MotionContext).events;
const font =
  '-apple-system, BlinkMacSystemFont, "Inter Motion", "Helvetica Neue", sans-serif';
loadFont({
  family: "Inter Motion",
  url: staticFile(base + "fonts/InterVariable.woff2"),
  weight: "100 900",
});
const ink = "#17181c",
  blue = "#007aff",
  gray = "#e7e7ec",
  red = "#c4344c";

const Icon = ({
  name,
  size = 100,
  color = ink,
}: {
  name: string;
  size?: number;
  color?: string;
}) => (
  <div
    style={{
      width: size,
      height: size,
      backgroundColor: color,
      maskImage: `url(${staticFile(base + "icons/" + name + ".svg")})`,
      maskSize: "contain",
      maskRepeat: "no-repeat",
      WebkitMaskImage: `url(${staticFile(base + "icons/" + name + ".svg")})`,
      WebkitMaskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
    }}
  />
);

type AnimatedAsset = typeof panic;
const PixelActor = ({
  asset = panic,
  time,
  start,
  x,
  y,
  height,
  opacity = 1,
  frame: selectedFrame,
}: {
  asset?: AnimatedAsset;
  frame?: number;
  time: number;
  start: number;
  x: number;
  y: number;
  height: number;
  opacity?: number;
}) => {
  const a = asset.metadata,
    c = a.crop,
    i =
      selectedFrame ??
      finiteFrame(time, start, a.frameCount, a.frameDurationMs),
    scale = height / c.height,
    pivot = a.cellWidth / 2 - c.x,
    foot = a.cells[i].bottom + 1 - c.y;
  return (
    <div
      style={{
        position: "absolute",
        left: x - pivot * scale,
        top: y - foot * scale,
        width: c.width * scale,
        height,
        overflow: "hidden",
        opacity,
      }}
    >
      <Img
        src={staticFile(asset.file)}
        style={{
          position: "absolute",
          width: a.width * scale,
          height: a.height * scale,
          left: -((i % a.columns) * a.cellWidth + c.x) * scale,
          top: -(Math.floor(i / a.columns) * a.cellHeight + c.y) * scale,
          imageRendering: "pixelated",
          maxWidth: "none",
        }}
      />
    </div>
  );
};
const Mia = ({
  pose,
  x,
  y,
  height,
  opacity = 1,
}: {
  pose: "smile" | "bite" | "catch";
  x: number;
  y: number;
  height: number;
  opacity?: number;
}) => {
  const a = mia[pose],
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

const Message = ({
  text,
  x,
  y,
  width,
  height = 146,
  color = gray,
  textColor = ink,
  fontSize = 64,
  opacity = 1,
  scale = 1,
  tail = "left",
}: {
  text: string;
  x: number;
  y: number;
  width: number;
  height?: number;
  color?: string;
  textColor?: string;
  fontSize?: number;
  opacity?: number;
  scale?: number;
  tail?: "left" | "right" | "none";
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      background: color,
      borderRadius: Math.min(55, height * 0.28),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize,
      fontWeight: 450,
      letterSpacing: -fontSize * 0.035,
      color: textColor,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: tail === "right" ? "bottom right" : "bottom left",
    }}
  >
    {text}
    {tail !== "none" && (
      <svg
        width="44"
        height="40"
        viewBox="0 0 44 40"
        style={{
          position: "absolute",
          bottom: -2,
          [tail === "right" ? "right" : "left"]: -12,
          transform: tail === "right" ? "scaleX(-1)" : undefined,
        }}
      >
        <path d="M15 0 Q24 25 0 38 Q39 39 44 5" fill={color} />
      </svg>
    )}
  </div>
);

const ChatChrome = ({
  opacity,
  inputText = "iMessage",
}: {
  opacity: number;
  inputText?: string;
}) => (
  <AbsoluteFill style={{ opacity }}>
    <div
      style={{
        position: "absolute",
        top: 0,
        width: 1080,
        height: 307,
        background: "#f2f2f7",
        borderBottom: "1px solid #d9d9df",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 67,
        top: 65,
        fontSize: 38,
        fontWeight: 650,
      }}
    >
      9:41
    </div>
    <svg
      width="135"
      height="35"
      viewBox="0 0 135 35"
      style={{ position: "absolute", top: 72, right: 65 }}
    >
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 11}
          y={24 - i * 5}
          width="7"
          height={7 + i * 5}
          rx="2"
          fill={ink}
        />
      ))}
      <path
        d="M54 12 Q67 -1 80 12 M59 18 Q67 10 75 18"
        stroke={ink}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="67" cy="25" r="3" fill={ink} />
      <rect
        x="91"
        y="7"
        width="37"
        height="22"
        rx="6"
        fill="none"
        stroke={ink}
        strokeWidth="2"
      />
      <rect x="95" y="11" width="28" height="14" rx="3" fill={ink} />
      <rect x="130" y="14" width="3" height="8" rx="1.5" fill={ink} />
    </svg>
    <svg
      width="28"
      height="48"
      viewBox="0 0 28 48"
      style={{ position: "absolute", left: 48, top: 175 }}
    >
      <path
        d="M24 3 L4 24 L24 45"
        stroke={blue}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
    <div
      style={{
        position: "absolute",
        left: 490,
        top: 134,
        width: 100,
        height: 100,
        borderRadius: 100,
        background: "#bec8d1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: 51,
        fontWeight: 500,
      }}
    >
      M
    </div>
    <div
      style={{
        position: "absolute",
        top: 245,
        left: 0,
        width: 1080,
        textAlign: "center",
        fontSize: 36,
        fontWeight: 500,
      }}
    >
      {plan.contact} <span style={{ color: "#8c8c94" }}>›</span>
    </div>
    <div
      style={{
        position: "absolute",
        left: 134,
        right: 61,
        bottom: 82,
        height: 98,
        border: "2px solid #c6c6cc",
        borderRadius: 54,
        padding: "20px 35px",
        fontSize: 44,
        color: "#b0b0b7",
      }}
    >
      {inputText}
    </div>
    <div
      style={{
        position: "absolute",
        left: 61,
        bottom: 104,
        fontSize: 64,
        color: "#8e8e93",
        lineHeight: "68px",
        fontWeight: 300,
      }}
    >
      +
    </div>
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 360,
        right: 360,
        height: 10,
        borderRadius: 8,
        background: ink,
      }}
    />
  </AbsoluteFill>
);

const Wave = ({ time, active = false }: { time: number; active?: boolean }) => {
  const cues = useMotionCues();
  const emphasis = voiceEmphasisAt(time, cues);
  return (
    <div
      style={{
        position: "absolute",
        left: 170,
        top: 840,
        width: 740,
        height: 140,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 13,
        opacity: 0.3 + 0.7 * emphasis,
      }}
    >
      {Array.from({ length: 27 }, (_, i) => {
        const amp = active
          ? 25 +
            Math.abs(Math.sin(i * 1.3 + time * 11)) *
              80 *
              Math.sin(((i + 1) / 28) * Math.PI)
          : 9;
        return (
          <div
            key={i}
            style={{
              width: 11,
              height: amp,
              borderRadius: 8,
              background: interpolateColors(emphasis, [0, 1], [blue, red]),
              transform: `scaleY(${enter(time, cues.imagined + i * 0.012, 0.15)})`,
            }}
          />
        );
      })}
    </div>
  );
};

const ThoughtStack = ({ time }: { time: number }) => {
  const cues = useMotionCues();
  return (
    <>
      {plan.thoughtDrafts.map((text, i) => {
        const p = enter(time, cues.argument + i * 0.23, 0.24);
        return (
          <Message
            key={text}
            text={text}
            x={335 + i * 20}
            y={650 + i * 180 + (1 - p) * 24}
            width={600}
            height={145}
            fontSize={57}
            color={i === 2 ? "#f8dfe3" : "#e5ebf5"}
            textColor={i === 2 ? red : ink}
            tail="none"
            opacity={p}
            scale={0.96 + 0.04 * p}
          />
        );
      })}
      <PixelActor
        time={time}
        start={cues.argument}
        x={170}
        y={1340}
        height={450}
      />
    </>
  );
};

const CueDiagram = ({ time }: { time: number }) => {
  const cues = useMotionCues();
  return (
    <>
      {[
        { id: "mic", name: "Voice", x: 240, at: cues.voice },
        { id: "smile", name: "Face", x: 670, at: cues.face },
      ].map((c) => {
        const p = enter(time, c.at, 0.22),
          rise = enter(time, cues.cues + 0.18, 0.3);
        return (
          <div
            key={c.id}
            style={{
              position: "absolute",
              left: c.x,
              top: 810 + (1 - rise) * 25,
              opacity: rise,
            }}
          >
            <div
              style={{
                width: 170,
                height: 170,
                borderRadius: 45,
                background: "white",
                border: "2px solid #dde2e9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name={c.id}
                size={92}
                color={interpolateColors(p, [0, 1], [blue, "#9ba3b1"])}
              />
            </div>
            <svg
              width="190"
              height="190"
              style={{ position: "absolute", left: -10, top: -10 }}
            >
              <path
                d="M25 165 L165 25"
                fill="none"
                stroke={red}
                strokeWidth="10"
                strokeLinecap="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - p}
              />
            </svg>
            <div
              style={{
                marginTop: 24,
                fontSize: 44,
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {c.name}
            </div>
          </div>
        );
      })}
      <svg
        width="1080"
        height="1380"
        style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
      >
        <path
          d="M540 620 V700 M320 700 H760 M320 700 V765 M760 700 V765"
          fill="none"
          stroke="#bdc9d9"
          strokeWidth="4"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={1 - enter(time, cues.cues, 0.5)}
        />
      </svg>
    </>
  );
};

const Study = ({ time }: { time: number }) => {
  const cues = useMotionCues();
  const p = enter(time, cues.study - 0.12, 0.35),
    transfer = move(time, cues.studyTransfer, 0.75),
    doubt = enter(time, cues.studyTransfer + 0.65, 0.3),
    mail = emailPositionAt(transfer),
    mailTone = enter(time, cues.studyTransfer + 0.45, 0.25);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 420 + (1 - p) * 40,
          width: 750,
          height: 370,
          borderRadius: 34,
          background: "white",
          border: "2px solid #e0e4eb",
          boxShadow: "0 24px 60px #2438580d",
          opacity: p,
          padding: 50,
        }}
      >
        <Icon name="mail" size={66} color={blue} />
        <div
          style={{
            fontSize: 78,
            fontWeight: 550,
            letterSpacing: -3,
            marginTop: 50,
          }}
        >
          {plan.studyEmail}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 835,
          fontSize: 50,
          fontWeight: 600,
          color: "#3e886e",
          opacity: p * (1 - doubt * 0.7),
        }}
      >
        {plan.senderInterpretation}
      </div>
      <svg
        width="1080"
        height="1370"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <path
          d={emailRoute}
          fill="none"
          stroke="#c3cbd8"
          strokeWidth="5"
          strokeDasharray="10 13"
          strokeDashoffset={-transfer * 100}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: mail.x - 32.5,
          top: mail.y - 32.5,
          opacity: p,
        }}
      >
        <Icon
          name="mail"
          size={65}
          color={interpolateColors(mailTone, [0, 1], [blue, red])}
        />
      </div>
      <Message
        text={plan.readerInterpretation}
        x={155}
        y={1060 + (1 - doubt) * 18}
        width={440}
        height={145}
        fontSize={58}
        color="#f7e2e6"
        textColor={red}
        opacity={doubt}
      />
      <PixelActor
        time={time}
        start={cues.studyTransfer + 0.35}
        x={820}
        y={1350}
        height={540}
        opacity={p}
      />
    </>
  );
};

const Draft = ({ time }: { time: number }) => {
  const cues = useMotionCues();
  const p = enter(time, cues.reconsider + 0.12, 0.3),
    erase = move(time, cues.reveal, 0.55),
    text = visiblePhrase(
      plan.thoughtDrafts[2],
      time,
      cues.reconsider + 0.3,
      0.95,
    );
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 710 + (1 - p) * 30,
          width: 900,
          height: 190,
          borderRadius: 47,
          border: "3px solid #cbd2dd",
          background: "white",
          opacity: p,
          display: "flex",
          alignItems: "center",
          paddingLeft: 44,
          fontSize: 64,
          letterSpacing: -2,
        }}
      >
        <span
          style={{
            clipPath: `inset(0 ${erase * 100}% 0 0)`,
            background: erase > 0 && erase < 0.8 ? "#cbe4ff" : "transparent",
          }}
        >
          {text}
          <span
            style={{
              display: "inline-block",
              height: 70,
              width: 4,
              background: blue,
              verticalAlign: "middle",
              marginLeft: 6,
            }}
          />
        </span>
        <div
          style={{
            position: "absolute",
            right: 28,
            top: 55,
            opacity: 1 - erase,
          }}
        >
          <Icon name="send" size={70} color={blue} />
        </div>
      </div>
      <PixelActor
        time={time}
        start={cues.reconsider}
        x={300}
        y={1325}
        height={410}
      />
      <div
        style={{ position: "absolute", left: 640, top: 1160, opacity: erase }}
      >
        <Icon name="arrow-right" size={140} color={blue} />
      </div>
    </>
  );
};

const Sender = ({ time }: { time: number }) => {
  const cues = useMotionCues();
  const p = enter(time, cues.sender - 0.12, 0.35),
    bite = unit((time - cues.bite) / 0.95),
    feedback = tapFeedbackAt(time, cues.finger),
    tap = feedback.travel,
    ring = feedback.ripple;
  const pose =
    time >= cues.bite && time < cues.bite + 0.75
      ? "bite"
      : time >= cues.finger + 0.25 && time < cues.finger + 0.95
        ? "catch"
        : "smile";
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 35}px)` }}>
      <div
        style={{
          position: "absolute",
          left: 65,
          top: 345,
          width: 950,
          height: 990,
          borderRadius: 70,
          background: "#e5efec",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 455,
          width: 880,
          height: 805,
          borderRadius: 70,
          background: "#f7faf9",
        }}
      />
      <Mia pose={pose} x={425} y={1260} height={760} />
      <div
        style={{
          position: "absolute",
          left: 760,
          top: 735,
          width: 215,
          height: 390,
          borderRadius: 33,
          background: ink,
          padding: 11,
          transform: `rotate(${mix(4, 0, tap)}deg)`,
          boxShadow: "0 16px 35px #1a333b15",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 23,
            background: "white",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 64,
              top: 11,
              width: 62,
              height: 12,
              background: ink,
              borderRadius: 10,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 16,
              top: 110,
              width: 140,
              height: 85,
              borderRadius: 24,
              background: gray,
              fontSize: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {plan.reply}
          </div>
          <div
            style={{
              position: "absolute",
              left: 30,
              top: 240,
              width: 140,
              height: 90,
              borderRadius: 16,
              background: "#f2f3f6",
              display: "grid",
              gridTemplateColumns: "repeat(5,1fr)",
              gap: 6,
              padding: 8,
            }}
          >
            {Array.from({ length: 15 }, (_, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 4,
                  background:
                    i === 8
                      ? interpolateColors(
                          feedback.press,
                          [0, 1],
                          ["white", "#cde3ff"],
                        )
                      : "white",
                  transform: `scale(${i === 8 ? 1 - 0.03 * feedback.press : 1})`,
                }}
              />
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: 108,
              top: 270,
              width: 30,
              height: 45,
              background: "#b5aa80",
              opacity: 0.22 * tap,
              borderRadius: "50%",
              transform: "rotate(-25deg)",
            }}
          />
        </div>
      </div>
      <svg
        width="1080"
        height="1380"
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <path
          d="M300 890 C470 1060 650 1120 760 1040"
          stroke="#9aafa9"
          fill="none"
          strokeWidth="4"
          strokeDasharray="9 12"
          opacity={enter(time, cues.finger - 0.35, 0.3)}
        />
        <circle
          cx="889"
          cy="1020"
          r={15 + ring * 48}
          fill="none"
          stroke={blue}
          strokeWidth="5"
          opacity={feedback.rippleOpacity}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: mix(965, 865, tap),
          top: mix(1130, 990, tap),
          opacity: enter(time, cues.finger - 0.2, 0.2),
          transform: `rotate(-20deg) scale(${1 - 0.03 * feedback.press})`,
        }}
      >
        <Icon name="pointer" size={110} color={blue} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 390,
          fontSize: 44,
          fontWeight: 600,
          color: "#537e70",
          opacity: bite,
        }}
      >
        {plan.contact}
      </div>
    </div>
  );
};

const Payoff = ({ time }: { time: number }) => {
  const cues = useMotionCues();
  const p = enter(time, cues.payoff - 0.12, 0.4),
    message = enter(time, cues.napkins, 0.25);
  return (
    <>
      <Message
        text={plan.outgoing}
        x={560}
        y={410}
        width={462}
        height={123}
        fontSize={58}
        color={blue}
        textColor="white"
        tail="right"
        opacity={p}
      />
      <Message
        text={plan.finalReply}
        x={60}
        y={850 + (1 - message) * 22}
        width={690}
        height={154}
        fontSize={65}
        opacity={message}
        scale={0.95 + 0.05 * message}
      />
      <PixelActor
        asset={talk}
        time={time}
        start={cues.napkins - 0.2}
        x={830}
        y={1380}
        height={350}
        opacity={p}
      />
    </>
  );
};

type AudioTracks = { narration: string; music: string; effects: string };
type MotionFilmProps = {
  captions: Caption[];
  sourceFrame?: number;
  showCaptions?: boolean;
  audioEnabled?: boolean;
  audioTracks?: AudioTracks;
  timing?: MotionEdit;
};
export const OkMotionFilm = ({ timing = edit, ...props }: MotionFilmProps) => (
  <MotionContext.Provider value={timing}>
    <OkMotionScene {...props} />
  </MotionContext.Provider>
);
const OkMotionScene = ({
  captions,
  sourceFrame,
  showCaptions = true,
  audioEnabled = true,
  audioTracks,
}: {
  captions: Caption[];
  sourceFrame?: number;
  showCaptions?: boolean;
  audioEnabled?: boolean;
  audioTracks?: AudioTracks;
}) => {
  const model = useContext(MotionContext),
    cues = model.events;
  const audio = audioTracks ?? {
    narration: base + "narration.wav",
    music: base + "music.wav",
    effects: base + "effects.wav",
  };
  const liveFrame = useCurrentFrame(),
    frame = sourceFrame ?? liveFrame,
    { fps } = useVideoConfig(),
    time = frame / fps,
    stage = stageAt(time, model),
    layout = bubbleAt(time, model);
  const intro = stage === "hook",
    reading = stage === "reading" || stage === "imagined",
    end = stage === "payoff",
    chrome =
      (intro ? 1 - move(time, cues.introPush, 0.5) : 0) +
      (end ? enter(time, cues.payoff - 0.12, 0.4) : 0);
  const active = captions.find(
      (c) => time * 1000 >= c.startMs && time * 1000 < c.endMs,
    ),
    angry = stage === "imagined",
    emphasis = voiceEmphasisAt(time, cues),
    shake = angry
      ? Math.sin((time - cues.imagined) * 70) *
        4 *
        (1 - unit((time - cues.imagined) / 0.25))
      : 0;
  return (
    <AbsoluteFill
      style={{
        background: "#f8f8fa",
        fontFamily: font,
        color: ink,
        overflow: "hidden",
      }}
    >
      <ChatChrome
        opacity={chrome}
        inputText={
          end && time >= cues.napkins
            ? visiblePhrase(plan.finalDraft, time, cues.napkins + 0.25, 0.5)
            : "iMessage"
        }
      />
      {intro && (
        <>
          <Message
            text={plan.outgoing}
            x={560}
            y={410 + (1 - enter(time, 0, 0.25)) * 20}
            width={462}
            height={123}
            fontSize={58}
            color={blue}
            textColor="white"
            tail="right"
            opacity={1 - move(time, cues.introPush, 0.5)}
          />
        </>
      )}
      {reading && (
        <>
          <Wave time={time} active={angry} />
        </>
      )}
      {(intro || reading) && (
        <PixelActor
          time={time}
          start={cues.introPush}
          frame={
            time < cues.imagined
              ? Math.min(5, finiteFrame(time, cues.introPush))
              : Math.min(11, 5 + finiteFrame(time, cues.imagined))
          }
          x={
            mix(800, 750, move(time, cues.reading - 0.1, 0.5)) +
            (1 - enter(time, cues.introPush, 0.35)) * 150
          }
          y={mix(1325, 1335, move(time, cues.reading - 0.1, 0.5))}
          height={mix(600, 365, move(time, cues.reading - 0.1, 0.5))}
          opacity={enter(time, cues.introPush, 0.35)}
        />
      )}
      {stage === "cues" && <CueDiagram time={time} />}
      {stage === "argument" && <ThoughtStack time={time} />}
      {stage === "study" && <Study time={time} />}
      {stage === "reconsider" && <Draft time={time} />}
      {stage === "sender" && <Sender time={time} />}
      {end && <Payoff time={time} />}
      <Message
        text={plan.reply}
        x={layout.x + shake}
        y={layout.y + shake * 0.3}
        width={layout.width}
        height={layout.height}
        fontSize={layout.font}
        opacity={layout.opacity * enter(time, cues.incoming, 0.2)}
        color={interpolateColors(emphasis, [0, 1], [gray, "#f7dee3"])}
        textColor={interpolateColors(emphasis, [0, 1], [ink, red])}
        scale={angry ? 1 + 0.02 * (1 - unit((time - cues.imagined) / 0.22)) : 1}
      />
      {showCaptions && active && (
        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            top: 1440,
            textAlign: "center",
            fontSize: active.text.length > 19 ? 58 : 64,
            lineHeight: 1.1,
            fontWeight: 850,
            letterSpacing: -0.6,
            wordSpacing: 8,
            color: /hate|breakup|argument/i.test(active.text)
              ? "#f7b5be"
              : "white",
            WebkitTextStroke: "7px #172c37",
            paintOrder: "stroke fill",
            transform: `translateY(${(1 - enter(time, active.startMs / 1000, 0.1)) * 9}px)`,
          }}
        >
          {active.text.toUpperCase()}
        </div>
      )}
      {audioEnabled && (
        <>
          <Audio src={staticFile(audio.narration)} />
          <Audio src={staticFile(audio.music)} />
          <Audio src={staticFile(audio.effects)} />
        </>
      )}
    </AbsoluteFill>
  );
};

export const okMotionDuration = edit.duration;
