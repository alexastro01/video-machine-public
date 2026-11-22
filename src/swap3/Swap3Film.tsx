import { useMemo, type CSSProperties } from "react";
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
import transcript from "../../episodes/billionaire-body-swap-3/transcript-source.json";
import { edit, e, nativeFrame, phoneReveal, smooth, ui } from "./motion";
import { Swap3World, useSwap3Assets } from "./Swap3World";

loadFont({
  family: "Swap3 Inter",
  url: staticFile("episodes/start-the-task/fonts/InterVariable.woff2"),
  weight: "100 900",
});
const abs: CSSProperties = { position: "absolute" };
const Wave = ({ t }: { t: number }) => {
  const a = edit.assets.find((x) => x.id === "adult-wave-gif")!,
    m = a.animation!,
    c = m.crop;
  const frame = nativeFrame(t, e.reveal, m.frameCount),
    scale = 680 / c.width;
  return (
    <div
      style={{
        ...abs,
        left: 20,
        top: 60,
        width: 680,
        height: 1045,
        overflow: "hidden",
      }}
    >
      <Img
        src={staticFile(a.url)}
        style={{
          ...abs,
          maxWidth: "none",
          imageRendering: "pixelated",
          width: m.width * scale,
          height: m.height * scale,
          left: -((frame % m.columns) * m.cellWidth + c.x) * scale,
          top: -(Math.floor(frame / m.columns) * m.cellHeight + c.y) * scale,
        }}
      />
    </div>
  );
};
const PhoneReveal = ({ t }: { t: number }) => {
  if (!phoneReveal(t)) return null;
  const p = smooth(t, e.reveal, 0.16);
  return (
    <>
      <AbsoluteFill style={{ background: "#112936", opacity: 0.65 }} />
      <div
        style={{
          ...abs,
          left: 170,
          top: 240,
          width: 740,
          height: 1300,
          borderRadius: 88,
          padding: 18,
          background: "#1d232a",
          border: "4px solid #75848d",
          boxShadow: "0 30px 100px #07192166",
          transform: `translateY(${(1 - p) * 50}px) scale(${0.94 + p * 0.06})`,
        }}
      >
        <div
          style={{
            ...abs,
            inset: 18,
            background: "linear-gradient(150deg,#75979f,#d6c4a5)",
            borderRadius: 68,
            overflow: "hidden",
          }}
        >
          <Wave t={t} />
          <div
            style={{
              ...abs,
              top: 20,
              left: 280,
              width: 160,
              height: 35,
              borderRadius: 30,
              background: "#1d232a",
            }}
          />
          <div
            style={{
              ...abs,
              left: 299,
              bottom: 60,
              width: 120,
              height: 120,
              background: "#b64d48",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
            }}
          >
            <svg width="72" height="72" viewBox="0 0 24 24">
              <path
                d="M4 13c5-4 11-4 16 0v4l-5-1v-3a12 12 0 0 0-6 0v3l-5 1z"
                fill="white"
              />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
};
const Photo = ({
  t,
  start,
  kind,
}: {
  t: number;
  start: number;
  kind: "exam" | "contract";
}) => {
  if (t < start || t >= e.takePhone) return null;
  const p = smooth(t, start, 0.25),
    reverse = kind === "exam";
  return (
    <div
      style={{
        ...abs,
        left: reverse ? 605 : 135,
        top: reverse ? 225 : 210,
        width: 340,
        height: 390,
        borderRadius: 32,
        padding: 18,
        background: reverse ? "#f7f7f9" : "#087afa",
        boxShadow: "0 18px 50px #152d3d35",
        opacity: p,
        transform: `translate(${(1 - p) * 160}px,${(1 - p) * (reverse ? 40 : -40)}px) scale(${0.8 + p * 0.2})`,
      }}
    >
      <div
        style={{
          background: "#f4eddc",
          height: 350,
          borderRadius: 15,
          padding: "45px 17px",
          color: "#273e4b",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 43, fontWeight: 750 }}>
          {reverse ? ui.examTitle : ui.contractTitle}
        </div>
        <div
          style={{
            fontSize: reverse ? 57 : 49,
            fontWeight: 650,
            marginTop: 40,
            letterSpacing: -2,
          }}
        >
          {reverse ? ui.examQuestion : ui.contractShortValue}
        </div>
        <div style={{ height: 3, background: "#b7c0b9", marginTop: 40 }} />
      </div>
    </div>
  );
};
export const Swap3Film = ({
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
  const assets = useSwap3Assets();
  const cues = useMemo(
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const c = cues.find((x) => t * 1000 >= x.startMs && t * 1000 < x.endMs);
  return (
    <AbsoluteFill
      style={{
        background: "#37596a",
        fontFamily: '"Swap3 Inter",sans-serif',
        overflow: "hidden",
      }}
    >
      {assets && <Swap3World t={t} assets={assets} />}
      <Photo t={t} start={e.sendContract} kind="contract" />{" "}
      <Photo t={t} start={e.sendExam} kind="exam" />
      <PhoneReveal t={t} />
      {showCaptions && c && (
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
            src={staticFile("episodes/billionaire-body-swap-3/narration.wav")}
          />
          <Audio
            src={staticFile("episodes/billionaire-body-swap-3/music.wav")}
          />
          <Audio
            src={staticFile("episodes/billionaire-body-swap-3/effects.wav")}
          />
        </>
      )}
    </AbsoluteFill>
  );
};
