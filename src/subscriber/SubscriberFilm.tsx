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
import { progressiveCaptionCues } from "../engine/progressive-captions";
import {
  abs,
  Card,
  colors,
  PixelActor,
  SvgIcon,
} from "../developer/primitives";
import transcript from "../../episodes/full-stack-subscriber/transcript-source.json";
import icons from "../../episodes/full-stack-subscriber/assets/icons.json";
import {
  edit,
  e,
  ui,
  roles,
  enter,
  move,
  mix,
  unit,
  bump,
  roleStateAt,
  quotaAt,
  assistantLayoutAt,
  cvProgressAt,
  closeAt,
  nodFrameAt,
  cvTitleAt,
  pointerAt,
  appBodyOpacityAt,
} from "./motion";

loadFont({
  family: "Subscriber Inter",
  url: staticFile("episodes/full-stack-subscriber/fonts/InterVariable.woff2"),
  weight: "100 900",
});
const { ink, blue, red, green, muted } = colors;
const Icon = ({
  kind,
  size = 34,
  color = ink,
}: {
  kind: keyof typeof icons;
  size?: number;
  color?: string;
}) => <SvgIcon paths={icons[kind]} size={size} color={color} />;
const Dots = () => (
  <div style={{ display: "flex", gap: 10 }}>
    {["#f0b6b4", "#ead6a7", "#aed2c0"].map((c) => (
      <i
        key={c}
        style={{ width: 12, height: 12, borderRadius: 10, background: c }}
      />
    ))}
  </div>
);
const Pill = ({
  text,
  color = red,
  style,
}: {
  text: string;
  color?: string;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      ...abs,
      borderRadius: 30,
      padding: "12px 22px",
      background: color + "13",
      color,
      fontSize: 27,
      fontWeight: 750,
      ...style,
    }}
  >
    {text}
  </div>
);

const App = ({ t }: { t: number }) => {
  const press = bump(t, 0, 0.22),
    returning = bump(t, e.app_check + 0.15, 0.7);
  return (
    <>
      <div
        style={{
          ...abs,
          left: 36,
          right: 36,
          top: 24,
          display: "flex",
          gap: 17,
          alignItems: "center",
        }}
      >
        <Dots />
        <span style={{ fontSize: 27, color: muted, fontWeight: 650 }}>
          {ui.appTitle}
        </span>
      </div>
      <Pill text={ui.appState} style={{ right: 25, top: 13, fontSize: 25 }} />
      <div style={{ ...abs, inset: 0, opacity: appBodyOpacityAt(t) }}>
        <div
          style={{
            ...abs,
            left: 230,
            top: 110,
            width: 460,
            fontSize: 42,
            fontWeight: 750,
          }}
        >
          {ui.appTitle}
        </div>
        {[ui.trialPlaceholder, "••••••••"].map((s, i) => (
          <div
            key={i}
            style={{
              ...abs,
              left: 230,
              top: 190 + i * 70,
              width: 460,
              height: 56,
              borderRadius: 14,
              background: "#f4f5f8",
              fontSize: 25,
              padding: "13px 20px",
              boxSizing: "border-box",
              color: "#a2a7b0",
            }}
          >
            {s}
          </div>
        ))}
        <div
          style={{
            ...abs,
            left: 280,
            top: 350,
            width: 360,
            height: 90,
            borderRadius: 22,
            display: "grid",
            placeItems: "center",
            background: "#e8edf6",
            color: "#75869c",
            fontSize: 37,
            fontWeight: 750,
            transform: `scale(${1 - 0.035 * press})`,
          }}
        >
          {ui.appButton}
        </div>
        <div
          style={{
            ...abs,
            left: 90,
            right: 90,
            top: 468,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 15,
            color: red,
            fontSize: 32,
            fontWeight: 700,
            transform: `scale(${1 + 0.045 * returning})`,
          }}
        >
          <Icon kind="circle-alert" color={red} />
          {ui.appError}
        </div>
      </div>
    </>
  );
};

const Clock = ({ t }: { t: number }) => {
  const p = move(t, e.clockMove, 0.46),
    reject = enter(t, e.clock_reply + 0.04, 0.25);
  return (
    <Card style={{ left: 40, top: 90, width: 840, height: 440 }}>
      <div
        style={{
          ...abs,
          left: 36,
          top: 30,
          display: "flex",
          alignItems: "center",
          gap: 17,
          fontSize: 34,
          fontWeight: 750,
        }}
      >
        <Icon kind="clock" color={blue} />
        {ui.clockTitle}
      </div>
      <span style={{ ...abs, left: 55, top: 135, fontSize: 29, color: muted }}>
        {ui.clockLabel}
      </span>
      <div
        style={{
          ...abs,
          left: 640,
          top: 125,
          width: 102,
          height: 55,
          borderRadius: 40,
          background: p > 0.5 ? "#d4d8df" : blue,
        }}
      >
        <div
          style={{
            ...abs,
            left: mix(53, 6, p),
            top: 6,
            width: 43,
            height: 43,
            background: "white",
            borderRadius: 30,
            boxShadow: "0 2px 5px #00000013",
          }}
        />
      </div>
      <div
        style={{
          ...abs,
          left: 83,
          top: 203,
          display: "flex",
          fontSize: 100,
          lineHeight: "125px",
          fontWeight: 750,
          fontVariantNumeric: "tabular-nums",
          color: ink,
        }}
      >
        {[...ui.clockCurrent].map((c, i) => (
          <div
            key={i}
            style={{
              width: c === ":" ? 42 : 78,
              height: 125,
              overflow: "hidden",
              textAlign: "center",
            }}
          >
            <div style={{ transform: `translateY(${-125 * p}px)` }}>
              <div>{c}</div>
              <div>{ui.clockFuture[i]}</div>
            </div>
          </div>
        ))}
      </div>
      <Pill
        text={ui.tomorrow}
        style={{
          right: 45,
          top: 337,
          opacity: reject,
          transform: `translateY(${12 * (1 - reject)}px)`,
        }}
      />
    </Card>
  );
};

const Trial = ({ t }: { t: number }) => {
  const recognized = enter(t, e.recognize + 0.04, 0.28);
  const typing = unit(
    (t - e.trial - 0.2) / Math.max(0.3, e.trialSubmit - e.trial - 0.3),
  );
  const typed = ui.trialEmail.slice(
    0,
    Math.floor(ui.trialEmail.length * typing),
  );
  return (
    <Card style={{ left: 40, top: 100, width: 840, height: 420 }}>
      <div
        style={{
          ...abs,
          left: 35,
          top: 30,
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 34,
          fontWeight: 750,
        }}
      >
        <Icon kind="mail" color={blue} />
        {ui.trialTitle}
      </div>
      <div
        style={{
          ...abs,
          left: 45,
          top: 145,
          width: 750,
          height: 70,
          boxSizing: "border-box",
          padding: "18px 23px",
          borderRadius: 17,
          border: "2px solid #d9e6fa",
          background: "#f7f9fc",
          fontSize: 30,
          color: ink,
          opacity: 1 - recognized,
        }}
      >
        {typed}
        <span style={{ color: blue, opacity: t < e.trialSubmit ? 1 : 0 }}>
          │
        </span>
      </div>
      <div
        style={{
          ...abs,
          left: 45,
          top: 145,
          right: 45,
          fontSize: 37,
          fontWeight: 750,
          color: ink,
          opacity: recognized,
          transform: `translateY(${14 * (1 - recognized)}px)`,
        }}
      >
        {ui.recognized}
      </div>
      <div
        style={{
          ...abs,
          left: 500,
          top: 260,
          width: 290,
          height: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: recognized > 0.4 ? green : blue,
          borderRadius: mix(18, 36, recognized),
          fontSize: 28,
          fontWeight: 750,
          color: "white",
          transform: `scale(${1 - 0.05 * bump(t, e.trialSubmit, 0.2)})`,
        }}
      >
        {recognized > 0.4 ? (
          <>
            <Icon kind="check" color="white" size={30} />
            {ui.recognizedShort}
          </>
        ) : (
          ui.trialAction
        )}
      </div>
    </Card>
  );
};

const Billing = ({ t }: { t: number }) => (
  <>
    <div style={{ ...abs, left: 50, top: 88, fontSize: 33, fontWeight: 750 }}>
      {ui.billingTitle}
    </div>
    {roles.map((role, i) => {
      const p = enter(t, e.upgrade + 0.05 + i * 0.09, 0.32),
        paid = enter(t, e.payments[i], 0.2);
      return (
        <Card
          key={role}
          style={{
            left: 40 + i * 280,
            top: 150,
            width: 260,
            height: 360,
            opacity: p,
            transform: `translateY(${30 * (1 - p)}px) rotate(${(i - 1) * 2 * (1 - p)}deg)`,
          }}
        >
          <div
            style={{
              padding: 23,
              color: ui.assistantColors[role],
              fontSize: 29,
              fontWeight: 750,
            }}
          >
            {ui.assistantNames[role]}
          </div>
          <div
            style={{ ...abs, left: 24, top: 94, fontSize: 24, color: muted }}
          >
            {ui.plans[i]}
          </div>
          <div
            style={{
              ...abs,
              left: 24,
              top: 145,
              width: 210,
              height: 13,
              borderRadius: 12,
              background: "#eef0f5",
              overflow: "hidden",
            }}
          >
            <div style={{ width: 210 * paid, height: 13, background: green }} />
          </div>
          <div
            style={{
              ...abs,
              left: 24,
              top: 179,
              fontSize: 27,
              color: green,
              fontWeight: 700,
              opacity: paid,
            }}
          >
              {ui.ready}
          </div>
          <div
            style={{
              ...abs,
              left: 20,
              top: 260,
              width: 220,
              height: 60,
              borderRadius: mix(17, 30, paid),
              background: paid > 0.5 ? "#e6f1ec" : blue,
              color: paid > 0.5 ? green : "white",
              display: "flex",
              gap: 10,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 27,
              fontWeight: 750,
              transform: `scale(${1 - 0.04 * bump(t, e.payments[i], 0.2)})`,
            }}
          >
            {paid > 0.5 ? (
              <Icon kind="check" color={green} size={32} />
            ) : (
              <Icon kind="credit-card" color="white" size={28} />
            )}
            {paid > 0.5 ? ui.active : ui.upgradeAction}
          </div>
        </Card>
      );
    })}
  </>
);

const Compare = ({ t }: { t: number }) => {
  const blocked = enter(t, e.limit_again + 0.05, 0.28);
  return (
    <Card style={{ left: 40, top: 90, width: 840, height: 440 }}>
      <div style={{ ...abs, left: 34, top: 28, fontSize: 33, fontWeight: 750 }}>
        {ui.comparisonTitle}
      </div>
      <div
        style={{
          ...abs,
          left: 30,
          top: 114,
          width: 780,
          height: 285,
          opacity: 1 - 0.82 * blocked,
        }}
      >
        {ui.compareRows.map((name, i) => (
          <span
            key={name}
            style={{
              ...abs,
              left: 0,
              top: 60 + i * 49,
              fontSize: 23,
              color: muted,
            }}
          >
            {name}
          </span>
        ))}
        {roles.map((role, i) => {
          const p = enter(t, e.compareMove + i * 0.12, 0.35);
          return (
            <div
              key={role}
              style={{
                ...abs,
                left: 158 + i * 207,
                top: 0,
                width: 195,
                height: 280,
                opacity: p,
                transform: `translateY(${25 * (1 - p)}px)`,
              }}
            >
              <span
                style={{
                  fontSize: 26,
                  color: ui.assistantColors[role],
                  fontWeight: 750,
                }}
              >
                {ui.assistantNames[role]}
              </span>
              {ui.compareRows.map((_, k) => (
                <div
                  key={k}
                  style={{
                    ...abs,
                    left: 0,
                    top: 65 + k * 49,
                    height: 14,
                    width:
                      (135 - ((i + k) % 3) * 22) *
                      enter(t, e.compareMove + i * 0.12 + k * 0.08, 0.3),
                    borderRadius: 8,
                    background: ui.assistantColors[role] + "32",
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>
      <div
        style={{
          ...abs,
          left: 230,
          top: 195,
          width: 380,
          height: 94,
          display: "flex",
          gap: 17,
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf0f2",
          color: red,
          border: "2px solid #ebcbd2",
          borderRadius: 26,
          fontSize: 35,
          fontWeight: 800,
          opacity: blocked,
          transform: `scale(${0.94 + 0.06 * blocked})`,
        }}
      >
        <Icon kind="circle-alert" color={red} size={38} />
        {ui.limit}
      </div>
    </Card>
  );
};

const Inventory = ({ t }: { t: number }) => {
  const ats = [e.subCount, e.timerCount, e.dashboardCount],
    nums = [ui.subCount, ui.timerCount, ui.dashboardCount];
  return (
    <>
      {nums.map((n, i) => {
        const p = enter(t, e.inventory + i * 0.1, 0.3),
          count = enter(t, ats[i], 0.32);
        return (
          <Card
            key={i}
            style={{
              left: 35 + i * 285,
              top: 105,
              width: 260,
              height: 195,
              opacity: p,
              transform: `translateY(${25 * (1 - p)}px) scale(${1 + 0.025 * bump(t, ats[i], 0.32)})`,
            }}
          >
            <div
              style={{
                textAlign: "center",
                paddingTop: 13,
                fontSize: 94,
                fontWeight: 800,
                color: i === 0 ? blue : i === 1 ? "#8970b7" : ink,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.1,
              }}
            >
              {Math.round(n * count)}
            </div>
            <div
              style={{
                padding: "15px 10px",
                textAlign: "center",
                fontSize: 25,
                color: muted,
                lineHeight: 1.1,
                fontWeight: 650,
              }}
            >
              {ui.metrics[i]}
            </div>
          </Card>
        );
      })}
      {Array.from({ length: 6 }, (_, i) => {
        const p = enter(t, e.timerCount + i * 0.075, 0.25);
        return (
          <Card
            key={i}
            style={{
              left: 55 + i * 76,
              top: 360,
              width: 62,
              height: 62,
              borderRadius: 18,
              opacity: p,
              transform: `translateY(${18 * (1 - p)}px)`,
            }}
          >
            <div style={{ padding: 13 }}>
              <Icon kind="clock" color="#8970b7" size={34} />
            </div>
          </Card>
        );
      })}
      {Array.from({ length: 5 }, (_, i) => {
        const p = enter(t, e.dashboardCount + i * 0.075, 0.25);
        return (
          <Card
            key={i}
            style={{
              left: 600 + i * 13,
              top: 359 - i * 10,
              width: 160,
              height: 117,
              borderRadius: 16,
              opacity: p,
              transform: `translateY(${18 * (1 - p)}px)`,
            }}
          >
            <div style={{ padding: 15 }}>
              <div
                style={{
                  width: 80,
                  height: 7,
                  background: "#d9e1ed",
                  borderRadius: 5,
                }}
              />
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  alignItems: "end",
                  gap: 8,
                }}
              >
                {[20, 34, 25, 40].map((h, k) => (
                  <span
                    key={k}
                    style={{
                      width: 18,
                      height: h,
                      borderRadius: 4,
                      background: "#abc9f0",
                    }}
                  />
                ))}
              </div>
            </div>
          </Card>
        );
      })}
    </>
  );
};

const Workspace = ({ t }: { t: number }) => {
  const cv = cvProgressAt(t);
  const stages = [
    { id: "clock", start: e.clock, end: e.trial, content: <Clock t={t} /> },
    { id: "trial", start: e.trial, end: e.upgrade, content: <Trial t={t} /> },
    {
      id: "billing",
      start: e.upgrade,
      end: e.compare,
      content: <Billing t={t} />,
    },
    {
      id: "compare",
      start: e.compare,
      end: e.inventory,
      content: <Compare t={t} />,
    },
    {
      id: "inventory",
      start: e.inventory,
      end: e.app_check,
      content: <Inventory t={t} />,
    },
  ];
  return (
    <Card
      style={{
        left: 80,
        top: 145,
        width: 920,
        height: 575,
        opacity: 1 - cv,
        overflow: "hidden",
      }}
    >
      <App t={t} />
      {stages.map((stage) => {
        if (t < stage.start || t >= stage.end + 0.25) return null;
        const incoming = enter(t, stage.start, 0.3),
          outgoing = enter(t, stage.end, 0.24);
        return (
          <div
            key={stage.id}
            style={{
              ...abs,
              inset: 0,
              opacity: incoming * (1 - outgoing),
              transform: `translateY(${18 * (1 - incoming) - 24 * outgoing}px)`,
            }}
          >
            {stage.content}
          </div>
        );
      })}
    </Card>
  );
};

const Characters = ({ t }: { t: number }) => {
  const a = assistantLayoutAt(t),
    actor = edit.actors[a.id],
    cv = cvProgressAt(t),
    close = closeAt(t);
  const current = roleStateAt(t).role;
  const alex =
    t >= e.broken
      ? "alex-frustrated"
      : t < e.clock
        ? "alex-coffee"
        : "alex-explain";
  const quota = quotaAt(current, t),
    blocked = quota < 0.02;
  return (
    <>
      <div
        style={{
          ...abs,
          left: 0,
          top: 0,
          width: 1080,
          height: 1920,
          opacity: (1 - cv) * (1 - close),
        }}
      >
        <PixelActor
          actor={edit.actors[alex]}
          x={255}
          foot={1510}
          height={620}
        />
      </div>
      <Card
        style={{
          left: 80,
          top: 775,
          width: 920,
          height: 95,
          borderRadius: 26,
          opacity: 1 - cv,
        }}
      >
        {roles.map((role, i) => (
          <div
            key={role}
            style={{
              ...abs,
              left: (i * 920) / 3,
              top: 0,
              width: 920 / 3,
              height: 95,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              color: role === current ? ui.assistantColors[role] : muted,
              fontSize: 29,
              fontWeight: 750,
              borderRadius: 23,
              background:
                role === current
                  ? ui.assistantColors[role] + "0d"
                  : "transparent",
            }}
          >
            <Icon
              kind="spark"
              size={27}
              color={role === current ? ui.assistantColors[role] : "#b5b9c2"}
            />
            {ui.assistantNames[role]}
            <i
              style={{
                width: 8,
                height: 8,
                borderRadius: 8,
                background: quotaAt(role, t) < 0.02 ? red : green,
              }}
            />
          </div>
        ))}
      </Card>
      <Card
        style={{
          left: a.x,
          top: 925,
          width: a.width,
          height: 585,
          borderRadius: 34,
          overflow: "hidden",
          opacity: 1 - cv,
          transform: `scale(${0.98 + 0.02 * a.arrival})`,
          transformOrigin: "center bottom",
        }}
      >
        <div
          style={{
            ...abs,
            left: 24,
            top: 23,
            color: ui.assistantColors[current],
            display: "flex",
            gap: 13,
            fontSize: 29,
            fontWeight: 750,
            alignItems: "center",
            zIndex: 2,
          }}
        >
          <Icon kind="spark" color={ui.assistantColors[current]} size={29} />
          {ui.assistantNames[current]}
        </div>
        <div
          style={{
            ...abs,
            right: 22,
            top: 24,
            width: 72,
            height: 35,
            borderRadius: 18,
            background: blocked ? "#faedf0" : "#eaf3ee",
            display: "grid",
            placeItems: "center",
            fontSize: 23,
            fontWeight: 750,
            color: blocked ? red : green,
          }}
        >
          {blocked ? "0" : "✓"}
        </div>
        <div
          style={{
            ...abs,
            left: 24,
            right: 24,
            top: 72,
            height: 5,
            borderRadius: 5,
            background: "#edf0f4",
            overflow: "hidden",
            zIndex: 2,
          }}
        >
          <div
            style={{
              height: 5,
              width: `${quota * 100}%`,
              background: blocked ? red : ui.assistantColors[current],
            }}
          />
        </div>
        <div
          style={{
            ...abs,
            top: 83,
            bottom: 0,
            left: 0,
            right: 0,
            overflow: "hidden",
            background: "white",
          }}
        >
          <Img
            src={staticFile(actor.url)}
            style={{
              ...abs,
              left: a.left,
              top: a.top,
              width: actor.width * a.scale,
              height: actor.height * a.scale,
              imageRendering: "pixelated",
            }}
          />
        </div>
      </Card>
    </>
  );
};

const CV = ({ t }: { t: number }) => {
  const p = cvProgressAt(t),
    title = cvTitleAt(t),
    photo = edit.actors[nodFrameAt(t)];
  if (p === 0) return null;
  return (
    <Card
      style={{
        left: 80,
        top: mix(245, 140, p),
        width: 920,
        height: 1380,
        borderRadius: mix(30, 24, p),
        opacity: p,
        transform: `scale(${0.76 + 0.24 * p}) rotate(${-2 * (1 - p)}deg)`,
        transformOrigin: "center top",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          ...abs,
          left: 64,
          top: 55,
          fontSize: 43,
          fontWeight: 800,
          letterSpacing: 3,
        }}
      >
        {ui.cvName}
      </div>
      <div style={{ ...abs, right: 62, top: 53 }}>
        <Icon kind="file" size={43} color={muted} />
      </div>
      <div
        style={{
          ...abs,
          left: 64,
          right: 64,
          top: 140,
          height: 2,
          background: "#eceef3",
        }}
      />
      <div
        style={{
          ...abs,
          left: 40,
          right: 40,
          top: 208,
          textAlign: "center",
          fontSize: 62,
          fontWeight: 750,
          letterSpacing: -2,
          opacity: title.prefix,
          transform: `translateY(${12 * (1 - title.prefix)}px)`,
        }}
      >
        {ui.cvPrefix}
      </div>
      <div
        style={{
          ...abs,
          left: 30,
          right: 30,
          top: 298,
          height: 130,
          fontSize: 86,
          lineHeight: 1.2,
          fontWeight: 850,
          letterSpacing: -3,
        }}
      >
        <div
          style={{
            ...abs,
            inset: 0,
            display: "flex",
            justifyContent: "center",
            opacity: title.before,
          }}
        >
          {[...ui.cvBefore].map((c, i) => {
            const q = enter(t, e.morph + i * 0.018, 0.32);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: 1 - q,
                  transform: `translateY(${-18 * q}px) scale(${1 - 0.04 * q})`,
                }}
              >
                {c}
              </span>
            );
          })}
        </div>
        <div
          style={{
            ...abs,
            inset: 0,
            display: "flex",
            justifyContent: "center",
            color: blue,
          }}
        >
          {[...ui.cvAfter].map((c, i) => {
            const q = enter(t, e.morph + 0.08 + i * 0.018, 0.32);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  opacity: q,
                  transform: `translateY(${18 * (1 - q)}px) scale(${0.96 + 0.04 * q})`,
                }}
              >
                {c}
              </span>
            );
          })}
        </div>
      </div>
      <div
        style={{
          ...abs,
          left: 260,
          top: 560,
          width: 400,
          height: 400,
          borderRadius: 230,
          overflow: "hidden",
          border: "3px solid #eceef3",
          background: "white",
          opacity: enter(t, e.cv_question + 0.45, 0.2),
        }}
      >
        <Img
          src={staticFile(photo.url)}
          style={{ width: 400, height: 400, imageRendering: "pixelated" }}
        />
      </div>
      <div
        style={{
          ...abs,
          left: 90,
          top: 1040,
          fontSize: 30,
          fontWeight: 750,
          color: muted,
        }}
      >
        {ui.cvLabel}
      </div>
      {ui.cvExperience.map((text, i) => (
        <div
          key={text}
          style={{
            ...abs,
            left: 90,
            right: 90,
            top: 1110 + i * 66,
            display: "flex",
            alignItems: "center",
            gap: 22,
            opacity: enter(t, e.cv_question + 0.22 + i * 0.08, 0.25),
          }}
        >
          <span
            style={{ color: blue, fontSize: 34, fontWeight: 750, width: 34 }}
          >
            {[ui.subCount, ui.timerCount, ui.dashboardCount][i]}
          </span>
          <span style={{ fontSize: 30, color: ink }}>{text}</span>
        </div>
      ))}
    </Card>
  );
};

const Pointer = ({ t }: { t: number }) => {
  const p = pointerAt(t),
    life = unit((t - p.at) / 0.35);
  if (!p.opacity || t >= e.cv_question) return null;
  return (
    <>
      {t >= p.at && t < p.at + 0.35 && (
        <div
          style={{
            ...abs,
            left: p.x - 22,
            top: p.y - 22,
            width: 44,
            height: 44,
            border: "3px solid #007aff",
            borderRadius: 50,
            opacity: 0.3 * (1 - life),
            transform: `scale(${0.5 + life * 1.4})`,
          }}
        />
      )}
      <svg
        width={44}
        height={52}
        viewBox="0 0 32 40"
        style={{
          ...abs,
          left: p.x,
          top: p.y,
          transform: `scale(${1 - 0.1 * p.press})`,
          transformOrigin: "0 0",
          filter: "drop-shadow(0 2px 3px #17232b20)",
        }}
      >
        <path
          d="M2 2v29l7-8 6 13 5-2-6-12 11-1z"
          fill="white"
          stroke={ink}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
};

export const SubscriberFilm = ({
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
        fontFamily: '"Subscriber Inter",sans-serif',
        color: ink,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          ...abs,
          left: 80,
          right: 80,
          top: 1528,
          height: 2,
          background: "#e9ebf1",
        }}
      />
      <Characters t={t} />
      <Workspace t={t} />
      <CV t={t} />
      <Pointer t={t} />
      {showCaptions && caption && (
        <div
          style={{
            ...abs,
            left: 65,
            right: 65,
            top: 1590,
            fontSize: 65,
            fontWeight: 850,
            lineHeight: 1.12,
            textAlign: "center",
            color: "white",
            WebkitTextStroke: "9px #20242b",
            paintOrder: "stroke fill",
            letterSpacing: -1.5,
          }}
        >
          {caption.text.toUpperCase()}
        </div>
      )}
      {audioEnabled && <Audio src={staticFile(edit.audioMaster)} />}
    </AbsoluteFill>
  );
};
