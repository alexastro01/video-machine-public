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
import transcript from "../../episodes/billionaire-body-swap-4/transcript-source.json";
import { e, mix, shotAt, smooth, ui } from "./motion";
import { Swap4World, useSwap4Assets } from "./Swap4World";
loadFont({
  family: "Swap4 Inter",
  url: staticFile("episodes/start-the-task/fonts/InterVariable.woff2"),
  weight: "100 900",
});
const abs: CSSProperties = { position: "absolute" };
const ink = "#263f4c",
  blue = "#5390b6";
const Head = ({
  young = false,
  size = 180,
}: {
  young?: boolean;
  size?: number;
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: young ? "#e9ece8" : "#dbe9ed",
      overflow: "hidden",
      border: "5px solid white",
      boxShadow: "0 10px 24px #233d4d19",
      position: "relative",
    }}
  >
    {young ? (
      <Img
        src={staticFile(
          "episodes/billionaire-body-swap-3/art/young-puzzled.png",
        )}
        style={{
          ...abs,
          left: size * 0.1,
          top: size * 0.02,
          width: size * 0.84,
          imageRendering: "pixelated",
        }}
      />
    ) : (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="37" r="17" fill={blue} />
        <path d="M18 98V86a32 32 0 0 1 64 0v12" fill={blue} />
      </svg>
    )}
  </div>
);
const Paper = ({ style }: { style?: CSSProperties }) => (
  <div
    style={{
      ...abs,
      width: 148,
      height: 180,
      background: "#fffef8",
      borderRadius: 13,
      boxShadow: "0 9px 18px #27465322",
      border: "2px solid #d7dfda",
      padding: 23,
      ...style,
    }}
  >
    <div
      style={{ height: 9, background: blue, borderRadius: 9, marginBottom: 22 }}
    />
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          height: 6,
          background: "#b8c4c4",
          borderRadius: 6,
          marginBottom: 17,
          width: i === 2 ? "60%" : "100%",
        }}
      />
    ))}
  </div>
);
const Panel = ({
  t,
  start,
  children,
  height = 760,
}: {
  t: number;
  start: number;
  children: ReactNode;
  height?: number;
}) => {
  const p = smooth(t, start, 0.24);
  return (
    <>
      <AbsoluteFill style={{ background: "#18303f", opacity: 0.6 * p }} />
      <div
        style={{
          ...abs,
          left: 80,
          top: 395,
          width: 920,
          height,
          borderRadius: 50,
          background: "#f6f7f3",
          boxShadow: "0 30px 100px #102a3f55",
          color: ink,
          opacity: p,
          transform: `translateY(${(1 - p) * 75}px) scale(${0.96 + 0.04 * p})`,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </>
  );
};
const Inserts = ({ t }: { t: number }) => {
  const shot = shotAt(t);
  if (shot.id === "cta") {
    const p = smooth(t, e.cta, 0.24);
    const words = transcript.words.filter((w) => w.line === "cta");
    let index = 0;
    return (
      <>
        <AbsoluteFill style={{ background: "#18303f", opacity: 0.12 * p }} />
        <div
          style={{
            ...abs,
            left: 80,
            top: 260,
            width: 920,
            height: 380,
            borderRadius: 48,
            background: "#f6f7f3",
            boxShadow: "0 24px 70px #102a3f40",
            color: ink,
            opacity: p,
            transform: `translateY(${(1 - p) * 32}px) scale(${0.975 + 0.025 * p})`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              ...abs,
              bottom: -16,
              left: 430,
              width: 42,
              height: 42,
              borderRadius: 7,
              background: "#f6f7f3",
              transform: "rotate(45deg)",
            }}
          />
          {ui.viewerQuestionRows.map((row, r) => (
            <div
              key={row}
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 15,
                fontSize: r === 0 ? 65 : 76,
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: -1.5,
              }}
            >
              {row.split(" ").map((word) => {
                const at = words[index++].start;
                const reveal = smooth(t, at, 0.1);
                return (
                  <span
                    key={word}
                    style={{
                      opacity: reveal,
                      transform: `translateY(${(1 - reveal) * 10}px)`,
                      color: word === "YOUR" ? blue : ink,
                    }}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </>
    );
  }
  if (shot.id === "partner")
    return (
      <Panel t={t} start={e.partner}>
        <div
          style={{
            ...abs,
            left: 0,
            right: 0,
            top: 58,
            textAlign: "center",
            fontSize: 50,
            fontWeight: 800,
            letterSpacing: -1.5,
          }}
        >
          {ui.project}
        </div>
        <div style={{ ...abs, left: 130, top: 175 }}>
          <Head young />
        </div>
        <div style={{ ...abs, left: 610, top: 175 }}>
          <Head />
        </div>
        <div
          style={{
            ...abs,
            left: 110,
            top: 370,
            width: 220,
            textAlign: "center",
            fontWeight: 750,
            fontSize: 33,
          }}
        >
          {ui.young}
        </div>
        <div
          style={{
            ...abs,
            left: 590,
            top: 370,
            width: 220,
            textAlign: "center",
            fontWeight: 750,
            fontSize: 33,
          }}
        >
          {ui.partner}
        </div>
        <svg
          style={{ ...abs, left: 330, top: 246 }}
          width="260"
          height="35"
          viewBox="0 0 260 35"
        >
          <path
            d="M0 17h245m-13-13 15 13-15 13"
            stroke="#bbc8c8"
            strokeWidth="5"
            fill="none"
          />
        </svg>
        {[0, 1, 2].map((i) => {
          const p = smooth(t, e.allocation + 0.05 + i * 0.15, 0.48);
          return (
            <Paper
              key={i}
              style={{
                left: mix(155, 610 + i * 13, p),
                top: mix(485 + i * 13, 474 + i * 15, p),
                transform: `rotate(${mix(-5 + i * 5, -5 + i * 5, p)}deg)`,
              }}
            />
          );
        })}
      </Panel>
    );
  if (shot.id === "salary")
    return (
      <Panel t={t} start={e.salary} height={690}>
        <div
          style={{
            ...abs,
            left: 0,
            right: 0,
            top: 88,
            fontSize: 150,
            fontWeight: 800,
            textAlign: "center",
            letterSpacing: -7,
          }}
        >
          {ui.pocketMoney}
        </div>
        {[0, 1, 2, 3].map((i) => {
          const p = smooth(t, e.salary + 0.12 + i * 0.13, 0.32);
          return (
            <svg
              key={i}
              style={{
                ...abs,
                left: 125 + i * 162,
                top: mix(315, 365, p),
                opacity: p,
                transform: `scale(${0.8 + 0.2 * p})`,
              }}
              width="180"
              height="180"
              viewBox="0 0 180 180"
            >
              <ellipse cx="90" cy="102" rx="71" ry="70" fill="#95794c" />
              <circle
                cx="90"
                cy="89"
                r="71"
                fill="#d9bd77"
                stroke="#b39150"
                strokeWidth="5"
              />
              <circle
                cx="90"
                cy="89"
                r="57"
                fill="none"
                stroke="#eddaa4"
                strokeWidth="4"
              />
              <text
                x="90"
                y="119"
                textAnchor="middle"
                fontSize="83"
                fontWeight="750"
                fill="#7a633a"
              >
                £
              </text>
            </svg>
          );
        })}
      </Panel>
    );
  if (shot.id === "result")
    return (
      <Panel t={t} start={e.result} height={830}>
        <div
          style={{
            ...abs,
            left: 0,
            right: 0,
            top: 48,
            textAlign: "center",
            fontSize: 50,
            fontWeight: 800,
          }}
        >
          {ui.teamLabel}
        </div>
        {ui.rankLabels.map((rank, i) => {
          const p = smooth(t, e.result + 0.05 + i * 0.07, 0.26);
          return (
            <div
              key={rank}
              style={{
                ...abs,
                left: 65,
                right: 65,
                top: 155 + i * 145,
                height: 125,
                background: i === 3 ? "#e9d7d1" : "#e8eeeb",
                borderRadius: 25,
                display: "flex",
                alignItems: "center",
                gap: 28,
                padding: "0 30px",
                opacity: p,
                transform: `translateX(${(1 - p) * 40}px)`,
              }}
            >
              <div style={{ width: 65, fontSize: 56, fontWeight: 800 }}>
                {rank}
              </div>
              <Head young={i === 3} size={100} />
              <div
                style={{
                  height: 13,
                  borderRadius: 20,
                  width: i === 3 ? 90 : 310 - i * 40,
                  background: i === 3 ? "#ac6257" : blue,
                }}
              />
              {i === 3 && (
                <span
                  style={{
                    fontSize: 40,
                    fontWeight: 800,
                    color: "#95534c",
                    marginLeft: "auto",
                  }}
                >
                  {ui.lastPlace}
                </span>
              )}
            </div>
          );
        })}
      </Panel>
    );
  if (shot.id === "manager-phone") {
    const p = smooth(t, e.managerPhone, 0.25);
    return (
      <>
        <AbsoluteFill style={{ background: "#18303f", opacity: 0.6 * p }} />
        <div
          style={{
            ...abs,
            left: 245,
            top: 280,
            width: 590,
            height: 1050,
            borderRadius: 75,
            padding: 20,
            background: "#c5cdd0",
            boxShadow: "0 30px 100px #102a3f55",
            opacity: p,
            transform: `translateY(${(1 - p) * 70}px) rotate(${(1 - p) * -4}deg) scale(${0.92 + 0.08 * p})`,
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 56,
              background: "#f5f7f5",
              position: "relative",
              display: "flex",
              alignItems: "center",
              flexDirection: "column",
              paddingTop: 170,
              color: ink,
            }}
          >
            <Head size={170} />
            <div
              style={{
                fontSize: 54,
                fontWeight: 750,
                marginTop: 45,
                letterSpacing: -2,
              }}
            >
              {ui.headteacher}
            </div>
            <svg
              style={{ position: "absolute", bottom: 150 }}
              width="120"
              height="120"
              viewBox="0 0 120 120"
            >
              <circle cx="60" cy="60" r="57" fill="#87ac95" />
              <path
                d="M36 31c-5 0-10 7-9 14 4 22 25 44 47 48 7 1 15-6 15-11l-15-12-10 7c-10-6-18-15-23-25l7-8z"
                fill="white"
              />
            </svg>
            <div
              style={{
                ...abs,
                left: 216,
                top: 18,
                width: 120,
                height: 26,
                borderRadius: 30,
                background: "#c5cdd0",
              }}
            />
          </div>
        </div>
      </>
    );
  }
  return null;
};
export const Swap4Film = ({
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
    t = frame / fps,
    assets = useSwap4Assets();
  const cues = useMemo(
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const c = cues.find((x) => t * 1000 >= x.startMs && t * 1000 < x.endMs);
  return (
    <AbsoluteFill
      style={{
        background: "#375463",
        fontFamily: '"Swap4 Inter",sans-serif',
        overflow: "hidden",
      }}
    >
      {assets && <Swap4World t={t} assets={assets} />}
      <Inserts t={t} />
      {showCaptions && c && t < e.cta && (
        <div
          style={{
            ...abs,
            left: 75,
            right: 75,
            top: 1510,
            textAlign: "center",
            color: "white",
            fontSize: 70,
            fontWeight: 850,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            WebkitTextStroke: "9px #182b35",
            paintOrder: "stroke fill",
          }}
        >
          {c.text.toUpperCase()}
        </div>
      )}
      {audioEnabled && (
        <>
          <Audio
            src={staticFile("episodes/billionaire-body-swap-4/narration.wav")}
          />
          <Audio
            src={staticFile("episodes/billionaire-body-swap-4/music.wav")}
          />
          <Audio
            src={staticFile("episodes/billionaire-body-swap-4/effects.wav")}
          />
        </>
      )}
    </AbsoluteFill>
  );
};
