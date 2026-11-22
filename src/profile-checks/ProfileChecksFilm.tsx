import type { CSSProperties, ReactNode } from "react";
import type { Caption } from "@remotion/captions";
import {
  AbsoluteFill,
  Img,
  interpolateColors,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import transcript from "../../episodes/profile-checks/transcript-source.json";
import panic from "../../episodes/profile-checks/assets/miko-panic.json";
import talk from "../../episodes/profile-checks/assets/miko-talk.json";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import { finiteFrame } from "../ok-motion/motion";
import {
  e,
  edit,
  plan,
  enter,
  move,
  mix,
  visible,
  panelAt,
  draftAt,
  contactAt,
  planeAt,
  endingAt,
} from "./motion";

const base = "episodes/profile-checks/";
const paper = "#f8f8fa",
  ink = "#17181c",
  blue = "#007aff",
  red = "#bd4159",
  green = "#537e70";
loadFont({
  family: "Profile Inter",
  url: staticFile(base + "fonts/InterVariable.woff2"),
  weight: "100 900",
});
const abs: CSSProperties = { position: "absolute" };
const Icon = ({
  name,
  size = 48,
  color = ink,
  style = {},
}: {
  name: string;
  size?: number;
  color?: string;
  style?: CSSProperties;
}) => (
  <div
    style={{
      width: size,
      height: size,
      backgroundColor: color,
      maskImage: `url(${staticFile(base + "icons/" + name + ".svg")})`,
      maskSize: "contain",
      maskRepeat: "no-repeat",
      ...style,
    }}
  />
);
const Avatar = ({
  who,
  x,
  y,
  size,
  opacity = 1,
}: {
  who: "miko" | "mia";
  x: number;
  y: number;
  size: number;
  opacity?: number;
}) => (
  <div
    style={{
      ...abs,
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      overflow: "hidden",
      borderRadius: "50%",
      background: who === "mia" ? "#eef0e9" : "#e8edf5",
      boxShadow: "0 7px 20px #182c4020",
      border: "4px solid #fff",
      opacity,
    }}
  >
    <Img
      src={staticFile(
        base + "art/" + (who === "miko" ? "miko-proud.png" : "mia-head.png"),
      )}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        imageRendering: "pixelated",
        ...(who === "miko"
          ? {
              position: "absolute" as const,
              left: (-size * 40) / 350,
              top: 0,
              width: (size * 523) / 350,
              height: "auto",
              maxWidth: "none",
            }
          : {}),
      }}
    />
  </div>
);
const Text = ({
  children,
  x,
  y,
  size,
  color = ink,
  weight = 600,
  width = 800,
  align = "left",
  style = {},
}: {
  children: ReactNode;
  x: number;
  y: number;
  size: number;
  color?: string;
  weight?: number;
  width?: number;
  align?: "left" | "center" | "right";
  style?: CSSProperties;
}) => (
  <div
    style={{
      ...abs,
      left: x,
      top: y,
      width,
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing: -size * 0.035,
      lineHeight: 1.12,
      textAlign: align,
      ...style,
    }}
  >
    {children}
  </div>
);

const FirstCounter = ({ t }: { t: number }) => {
  const loop = t >= e.loop;
  const progress = loop ? 0 : move(t, e.counterTap, 0.26);
  const s = 248,
    step = 274;
  return (
    <div
      style={{
        ...abs,
        left: 230,
        top: 286,
        width: 440,
        height: step,
        overflow: "hidden",
        color: blue,
        fontSize: s,
        lineHeight: `${step}px`,
        fontWeight: 760,
        letterSpacing: -13,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span style={{ ...abs, left: 32, top: 0 }}>8</span>
      <div style={{ ...abs, left: 195, top: -step * progress }}>
        <div style={{ height: step }}>7</div>
        <div style={{ height: step }}>8</div>
      </div>
    </div>
  );
};
const EyeToNotice = ({ t }: { t: number }) => {
  const p = t >= e.loop ? 0 : move(t, e.disclose, 0.42);
  // Both outlines share two cubic segments, so the eye becomes the receipt shape.
  const eye = [
    [0, 50],
    [25, 5],
    [75, 5],
    [100, 50],
    [75, 95],
    [25, 95],
    [0, 50],
  ];
  const note = [
    [4, 22],
    [4, 4],
    [96, 4],
    [96, 22],
    [96, 92],
    [4, 92],
    [4, 22],
  ];
  const a = eye.map((point, i) => point.map((n, j) => mix(n, note[i][j], p)));
  const d = `M${a[0]} C${a[1]} ${a[2]} ${a[3]} C${a[4]} ${a[5]} ${a[6]} Z`;
  return (
    <svg
      viewBox="-8 -8 116 116"
      style={{ ...abs, left: 372, top: 217, width: 52, height: 52 }}
    >
      <path
        d={d}
        fill="none"
        stroke={interpolateColors(p, [0, 1], [blue, red])}
        strokeWidth="7"
      />
      <circle cx="50" cy="50" r={16 * (1 - p)} fill={blue} opacity={1 - p} />
      <path
        d="M30 49 L44 63 L71 35"
        fill="none"
        stroke={red}
        strokeWidth="8"
        strokeLinecap="round"
        opacity={p}
      />
    </svg>
  );
};
const Profile = ({ t }: { t: number }) => {
  const disclosure = t >= e.loop ? 0 : enter(t, e.disclose, 0.3);
  return (
    <>
      <Avatar who="mia" x={168} y={126} size={144} />
      <Text x={278} y={92} size={52} width={420}>
        {plan.ui.crushName}
      </Text>
      <Icon
        name="x"
        size={46}
        color="#9699a2"
        style={{ ...abs, left: 787, top: 58 }}
      />
      <EyeToNotice t={t} />
      <Text x={435} y={226} size={33} color="#727680" width={280}>
        Profile checks
      </Text>
      <FirstCounter t={t} />
      <Avatar who="miko" x={319} y={605} size={60} />
      <Text x={366} y={583} size={36} color="#747986" width={300}>
        checks by you
      </Text>
      <div
        style={{
          ...abs,
          left: 300,
          top: 172,
          width: 300,
          opacity: disclosure,
          color: red,
          fontSize: 29,
          textAlign: "center",
          fontWeight: 600,
        }}
      >
        Visible to Mia
      </div>
    </>
  );
};
const Receipt = ({ t }: { t: number }) => {
  const confirmed = enter(t, e.sent + 0.2, 0.22);
  return (
    <>
      <Avatar who="mia" x={110} y={120} size={108} />
      <Text x={190} y={49} size={34} width={510}>
        {plan.ui.crushName}
      </Text>
      <Text x={190} y={100} size={39} width={570}>
        Miko checked your profile.
      </Text>
      <div
        style={{
          ...abs,
          left: 760,
          top: 70,
          width: 92,
          height: 92,
          borderRadius: 28,
          background: "#f7e9ed",
          display: "grid",
          placeItems: "center",
          color: red,
          fontSize: 46,
          fontWeight: 750,
        }}
      >
        88
      </div>
      <Icon
        name="check"
        color={green}
        size={28}
        style={{ ...abs, left: 191, top: 166, opacity: confirmed }}
      />
      <Text
        x={230}
        y={166}
        size={26}
        color="#7c838b"
        width={520}
        style={{ opacity: confirmed }}
      >
        Notification sent
      </Text>
    </>
  );
};
const Composer = ({ t }: { t: number }) => {
  const value = draftAt(t);
  const deleting =
    visible(t, e.delete1, e.delete1 + 0.23, 0.04) +
    visible(t, e.delete2, e.delete2 + 0.23, 0.04);
  return (
    <>
      <Text x={62} y={64} size={60} width={690} color={value ? ink : "#a9adb6"}>
        {value || "Message"}
        <span
          style={{
            marginLeft: 5,
            opacity: value ? 0.9 : 0,
            color: blue,
            fontWeight: 300,
          }}
        >
          |
        </span>
      </Text>
      <div
        style={{
          ...abs,
          left: 775,
          top: 62,
          width: 70,
          height: 70,
          borderRadius: "50%",
          background: "#e8f1fc",
        }}
      >
        <Icon name="send" size={40} color={blue} style={{ margin: 15 }} />
      </div>
      <div
        style={{
          ...abs,
          left: 58,
          top: 204,
          width: 784,
          height: 2,
          background: "#edf0f4",
        }}
      />
      <Icon
        name="delete"
        color={mix(0, 1, deleting) > 0.1 ? red : "#a5acb5"}
        size={40}
        style={{
          ...abs,
          left: 804,
          top: 230,
          translate: `${-7 * deleting}px 0px`,
        }}
      />
    </>
  );
};
const Typing = ({ t }: { t: number }) => (
  <>
    {[0, 1, 2].map((i) => {
      const age = t - e.typing - 0.3 - i * 0.18;
      const pulse =
        age >= 0 && age < 1.1
          ? Math.max(0, Math.sin((age * Math.PI) / 0.42))
          : 0;
      return (
        <div
          key={i}
          style={{
            ...abs,
            left: 108 + i * 62,
            top: 72 - pulse * 13,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#8e96a4",
            opacity: 0.5 + 0.5 * pulse,
          }}
        />
      );
    })}
  </>
);
const Ticket = ({ t }: { t: number }) => {
  const p = planeAt(t);
  return (
    <>
      <Text x={62} y={52} size={30} color="#9298a4" width={600}>
        One-way
      </Text>
      <Text x={62} y={112} size={66} width={780}>
        Anywhere else.
      </Text>
      <svg
        viewBox="0 0 900 500"
        style={{ ...abs, inset: 0, width: 900, height: 500 }}
      >
        <path
          d="M170 320 Q340 115 730 230"
          fill="none"
          stroke="#c9dbf4"
          strokeWidth="5"
          strokeDasharray="9 14"
        />
        <circle cx="170" cy="320" r="10" fill={blue} />
        <circle cx="730" cy="230" r="10" fill={blue} />
        <path
          d="M55 402 H845"
          stroke="#e2e6ee"
          strokeWidth="3"
          strokeDasharray="8 12"
        />
      </svg>
      <Icon
        name="plane"
        size={64}
        color={blue}
        style={{
          ...abs,
          left: p.x - 32,
          top: p.y - 32,
          rotate: `${mix(-21, 11, move(t, e.plane, 0.58))}deg`,
        }}
      />
    </>
  );
};
const Reciprocal = ({ t }: { t: number }) => {
  const p = move(t, e.mutual, 0.48),
    n = enter(t, e.number, 0.26);
  const ending = endingAt(t),
    r = ending.return,
    outgoing = 1 - ending.outgoing;
  const digitHeight = mix(203.84, 274, r);
  const digitAdvance = mix(104, 163, r);
  const digitViewportWidth = mix(182, 248, r);
  const digitRoll = move(t, e.loop + 0.19, 0.58);
  const nameSlide = move(t, e.loop, plan.ending.nameSlideDuration);
  const nameRise = move(
    t,
    e.loop + plan.ending.nameRiseDelay,
    plan.ending.nameRiseDuration,
  );
  return (
    <>
      <div style={{ opacity: outgoing }}>
        <Avatar
          who="miko"
          x={mix(168, 675, p)}
          y={126}
          size={mix(144, 156, p)}
        />
        <Text
          x={mix(235, 525, p)}
          y={mix(92, 236, p)}
          size={mix(52, 40, p)}
          width={300}
          align="center"
        >
          {plan.ui.protagonistName}
        </Text>
        <Text
          x={100}
          y={218}
          size={34}
          color="#727680"
          width={700}
          align="center"
          style={{ opacity: 1 - enter(t, e.mutual, 0.12) }}
        >
          Profile checks
        </Text>
        <Text
          x={mix(160, 520, p)}
          y={mix(294, 309, p) + (1 - n) * 28}
          size={mix(245, 182, p)}
          width={mix(580, 310, p)}
          align="center"
          color={green}
          weight={760}
          style={{
            fontVariantNumeric: "tabular-nums",
            opacity: n,
            letterSpacing: -11,
          }}
        >
          {plan.ui.replyCounter}
        </Text>
        <Text
          x={200}
          y={360}
          size={130}
          width={500}
          align="center"
          color="#a8b4c2"
          style={{ opacity: (1 - n) * (1 - p), letterSpacing: 14 }}
        >
          ••
        </Text>
        <Text
          x={mix(200, 520, p)}
          y={mix(598, 542, p)}
          size={mix(35, 31, p)}
          width={mix(500, 310, p)}
          align="center"
          color="#747986"
        >
          {p > 0.5 ? "by Mia" : "checks by Mia"}
        </Text>
      </div>
      <div
        style={{
          ...abs,
          inset: 0,
          opacity: enter(t, e.mutual + 0.27, 0.22),
        }}
      >
        <div style={{ translate: `${-80 * (1 - p)}px 0px` }}>
          <Avatar
            who="mia"
            x={mix(225, 168, r)}
            y={126}
            size={mix(156, 144, r)}
          />
          <Text
            x={mix(225, 278, nameSlide)}
            y={mix(236, 92, nameRise)}
            size={mix(40, 52, r)}
            width={310}
            style={{
              width: "max-content",
              translate: `${-50 * (1 - nameSlide)}% 0px`,
            }}
          >
            Mia
          </Text>
          <div
            style={{
              ...abs,
              left: mix(121, 262, r),
              top: mix(309, 286, r),
              height: digitHeight,
              width: digitAdvance * 2,
              fontSize: mix(182, 248, r),
              lineHeight: `${digitHeight}px`,
              color: blue,
              fontWeight: 760,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: mix(-11, -13, r),
            }}
          >
            <span style={{ ...abs, left: 0, top: 0 }}>8</span>
            <div
              style={{
                ...abs,
                left: digitAdvance,
                top: 0,
                width: digitViewportWidth,
                height: digitHeight,
                overflow: "hidden",
              }}
            >
              <div style={{ ...abs, top: -digitHeight * digitRoll }}>
                <div style={{ height: digitHeight }}>8</div>
                <div style={{ height: digitHeight }}>7</div>
              </div>
            </div>
          </div>
          <Text
            x={70}
            y={542}
            size={31}
            width={310}
            align="center"
            color="#747986"
            style={{ opacity: outgoing }}
          >
            by you
          </Text>
        </div>
        <div style={{ opacity: ending.incoming }}>
          <Icon
            name="x"
            size={46}
            color="#9699a2"
            style={{ ...abs, left: 787, top: 58 }}
          />
          <EyeToNotice t={e.end} />
          <Text x={435} y={226} size={33} color="#727680" width={280}>
            Profile checks
          </Text>
          <Avatar who="miko" x={319} y={605} size={60} />
          <Text x={366} y={583} size={36} color="#747986" width={300}>
            checks by you
          </Text>
        </div>
      </div>
      <Icon
        name="heart"
        color="#be6376"
        size={58}
        style={{
          ...abs,
          left: 421,
          top: 362,
          opacity: enter(t, e.mutual + 0.26, 0.24) * outgoing,
          scale: 0.9 + 0.1 * enter(t, e.mutual + 0.26, 0.24),
        }}
      />
    </>
  );
};
const SharedPanel = ({ t }: { t: number }) => {
  const p = panelAt(t);
  const ending = endingAt(t);
  const initial = 1 - enter(t, e.closePress, 0.22);
  const wrap = (
    opacity: number,
    width: number,
    height: number,
    child: ReactNode,
  ) =>
    opacity > 0.001 ? (
      <div
        style={{
          ...abs,
          top: 0,
          left: 0,
          width,
          height,
          opacity,
          scale: p.w / width,
          transformOrigin: "top left",
        }}
      >
        {child}
      </div>
    ) : null;
  return (
    <div
      style={{
        ...abs,
        left: p.x,
        top: p.y,
        width: p.w,
        height: p.h,
        borderRadius: p.r,
        overflow: "hidden",
        background: "white",
        border: "2px solid #ffffff",
        boxShadow: `0 ${mix(22, 34, enter(t, e.number, 0.4) * (1 - ending.return))}px 75px #243d5b16, 0 2px 8px #243d5b07`,
      }}
    >
      {wrap(initial, 900, 700, <Profile t={t} />)}
      {wrap(
        visible(t, e.closePress + 0.12, e.notice + 0.14, 0.14),
        184,
        184,
        <Icon name="bell" size={90} color={red} style={{ margin: 47 }} />,
      )}
      {wrap(visible(t, e.notice, e.chat, 0.22), 900, 244, <Receipt t={t} />)}
      {wrap(visible(t, e.chat, e.typing, 0.24), 900, 300, <Composer t={t} />)}
      {wrap(visible(t, e.typing, e.escape, 0.2), 370, 174, <Typing t={t} />)}
      {wrap(visible(t, e.escape, e.incoming, 0.2), 900, 500, <Ticket t={t} />)}
      {wrap(
        visible(t, e.incoming, e.incoming + 0.35, 0.15),
        900,
        700,
        <Icon
          name="image"
          size={120}
          color={blue}
          style={{ ...abs, left: 390, top: 270 }}
        />,
      )}
      {wrap(enter(t, e.incoming + 0.22, 0.28), 900, 700, <Reciprocal t={t} />)}
    </div>
  );
};
const CastPose = ({
  t,
  speaking,
  opacity,
  offsetX = 0,
  blendMode = "normal",
}: {
  t: number;
  speaking: boolean;
  opacity: number;
  offsetX?: number;
  blendMode?: CSSProperties["mixBlendMode"];
}) => {
  const asset = speaking ? talk : panic;
  const a = asset.metadata,
    c = a.crop;
  const index = speaking
    ? finiteFrame(t, e.payoff, a.frameCount, a.frameDurationMs)
    : t >= e.loop
      ? 0
      : t < e.notice
        ? 0
        : t < e.chat
          ? finiteFrame(t, e.notice, a.frameCount, a.frameDurationMs)
          : t < e.incoming
            ? t >= e.typing
              ? 4
              : 1
            : t < e.number
              ? 4
              : 10;
  const s = 412 / c.height,
    foot = a.cells[index].bottom + 1 - c.y;
  const shift = move(t, e.chat, 0.4) - move(t, e.incoming, 0.4);
  const loop = endingAt(t).return;
  const x = mix(790 - shift * 120, 790, loop);
  return (
    <div
      style={{
        ...abs,
        left: x + offsetX - (a.cellWidth / 2 - c.x) * s,
        top: 1430 - foot * s,
        width: c.width * s,
        height: 412,
        overflow: "hidden",
        opacity,
        mixBlendMode: blendMode,
      }}
    >
      <Img
        src={staticFile(asset.file)}
        style={{
          ...abs,
          width: a.width * s,
          height: a.height * s,
          left: -((index % a.columns) * a.cellWidth + c.x) * s,
          top: -(Math.floor(index / a.columns) * a.cellHeight + c.y) * s,
          maxWidth: "none",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
};
const Cast = ({ t }: { t: number }) => {
  if (t < e.payoff) return <CastPose t={t} speaking={false} opacity={1} />;
  const blend = endingAt(t).character;
  return (
    <AbsoluteFill style={{ isolation: "isolate", pointerEvents: "none" }}>
      {blend < 1 && (
        <CastPose
          t={t}
          speaking
          opacity={1 - blend}
          offsetX={plan.ending.talkToIdleOffset * blend}
          blendMode="plus-lighter"
        />
      )}
      {blend > 0 && (
        <CastPose
          t={t}
          speaking={false}
          opacity={blend}
          offsetX={-plan.ending.talkToIdleOffset * (1 - blend)}
          blendMode="plus-lighter"
        />
      )}
    </AbsoluteFill>
  );
};
const ChatHeader = ({ t }: { t: number }) => {
  const opacity = visible(t, e.chat, e.incoming, 0.3);
  return (
    <div style={{ opacity }}>
      <Avatar who="mia" x={159} y={327} size={100} />
      <Text x={238} y={287} size={47} width={530}>
        Mia
      </Text>
      <Text x={239} y={346} size={27} color="#9ca3af" width={400}>
        {t >= e.typing ? "typing…" : "Message"}
      </Text>
    </div>
  );
};
const Pointer = ({
  t,
  at,
  x,
  y,
}: {
  t: number;
  at: number;
  x: number;
  y: number;
}) => {
  const p = contactAt(t, at, x, y);
  return (
    <>
      <Icon
        name="pointer"
        size={58}
        color="#2d3d51"
        style={{
          ...abs,
          left: p.x - 8,
          top: p.y - 3,
          opacity: p.opacity,
          rotate: "-18deg",
          scale: 1 - 0.08 * p.rippleOpacity,
        }}
      />
      <div
        style={{
          ...abs,
          left: x - 45,
          top: y - 45,
          width: 90,
          height: 90,
          border: "4px solid #007aff",
          borderRadius: "50%",
          opacity: p.rippleOpacity * 0.5,
          scale: 0.25 + p.ripple * 0.95,
        }}
      />
    </>
  );
};
export const ProfileChecksFilm = ({
  captions,
  showCaptions = true,
  audioEnabled = true,
}: {
  captions: Caption[];
  showCaptions?: boolean;
  audioEnabled?: boolean;
}) => {
  const t = useCurrentFrame() / edit.fps;
  const active = progressiveCaptionCues(captions, transcript.words).find(
    (c) => t * 1000 >= c.startMs && t * 1000 < c.endMs,
  );
  const danger = visible(t, e.notice, e.incoming, 0.5),
    relief = enter(t, e.number, 0.5) * (1 - endingAt(t).return);
  return (
    <AbsoluteFill
      style={{
        background: paper,
        color: ink,
        fontFamily: '"Profile Inter", sans-serif',
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 43%,#e8effb 0%,#f8f8fa 64%)",
          opacity: 1 - danger,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%,#f1dfe6 0%,#f8f8fa 68%)",
          opacity: danger * 0.7,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 43%,#dfede6 0%,#f8f8fa 68%)",
          opacity: relief * 0.8,
        }}
      />
      <SharedPanel t={t} />
      <ChatHeader t={t} />
      <Cast t={t} />
      <Pointer t={t} at={e.counterTap} x={258} y={466} />
      <Pointer t={t} at={e.closePress} x={900} y={424} />
      {showCaptions && active && (
        <div
          style={{
            ...abs,
            left: 65,
            right: 65,
            top: 1510,
            textAlign: "center",
            fontSize: 67,
            lineHeight: 1.12,
            fontWeight: 800,
            color: "white",
            WebkitTextStroke: "7px #172b35",
            paintOrder: "stroke fill",
            letterSpacing: -1.6,
          }}
        >
          {active.text.toUpperCase()}
        </div>
      )}
      {audioEnabled && (
        <>
          <Audio src={staticFile(base + "narration.wav")} />
          <Audio src={staticFile(base + "music.wav")} />
          <Audio src={staticFile(base + "effects.wav")} />
        </>
      )}
    </AbsoluteFill>
  );
};
