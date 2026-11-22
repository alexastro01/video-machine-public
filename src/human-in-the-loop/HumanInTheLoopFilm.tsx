import { useMemo } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import type { Caption } from "@remotion/captions";
import actors from "../../episodes/ai-review-loop/assets/actors.json";
import transcript from "../../episodes/human-in-the-loop/transcript-source.json";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import { PixelActor } from "../developer/primitives";
import { ApprovalQueue } from "./ApprovalQueue";
import { LavaBackground } from "./LavaBackground";
import { art, Profile, WorkCards } from "./Profile";
import {
  clicks,
  deskFrame,
  e,
  enter,
  fps,
  lines,
  speakerStrength,
} from "./motion";
import "./film.css";

loadFont({
  family: "Loop Inter",
  url: staticFile("episodes/ai-review-loop/fonts/InterVariable.woff2"),
  weight: "100 900",
});
const partners = [
  { role: "opus", pose: "opus-think", at: 30, until: lines[1].first - 3 },
  {
    role: "opus",
    pose: "opus-proud",
    at: lines[1].first - 3,
    until: lines[3].first - 21,
  },
  {
    role: "astra",
    pose: "astra-present",
    at: lines[3].first - 21,
    until: lines[5].first - 21,
  },
  {
    role: "gemini",
    pose: "gemini-present",
    at: lines[5].first - 21,
    until: lines[7].first - 22,
  },
  {
    role: "opus",
    pose: "opus-present",
    at: lines[7].first - 22,
    until: clicks[0],
  },
] as const;
function Cast({ frame }: { frame: number }) {
  if (frame >= clicks[0] - 2) {
    return (
      <Img
        src={art(`alex-click-${deskFrame(frame)}`)}
        className="hl-seated"
      />
    );
  }
  const reveal = enter(frame, 35, 37);
  if (reveal === 0) return null;
  const atDiff =
    enter(frame, e.diff - 7, 12) *
    (1 - enter(frame, e.strikeSupervisor + 15, 15));
  const base = 1508 + 41 * atDiff + (1 - reveal) * 62;
  const key =
    frame < lines[2].first - 6
      ? "alex-coffee"
      : frame < lines[6].first - 7
        ? "alex-explain"
        : "alex-frustrated";
  const strength = speakerStrength(frame, "alex");
  const emphasis = lines
    .filter((l) => l.speaker === "alex")
    .reduce(
      (sum, l) => sum + Math.sin(Math.PI * enter(frame, l.first - 2, 23)),
      0,
    );
  const partner = partners.find((p) => frame >= p.at && frame < p.until);
  const faceHeight = 662 - 17 * atDiff;
  return (
    <>
      <PixelActor
        actor={actors[key]}
        x={293}
        foot={base}
        height={faceHeight + Math.sin(frame / 29) * 1.6}
        style={{
          opacity: reveal * (0.69 + 0.31 * strength),
          filter: `contrast(${0.985 + 0.055 * strength})`,
          transform: `rotate(${-0.7 * emphasis}deg)`,
          transformOrigin: "51% 92%",
        }}
      />
      {partner &&
        (() => {
          const light = speakerStrength(frame, partner.role);
          const changePose = partner.pose === "opus-proud";
          const arrive = changePose ? 1 : enter(frame, partner.at, 13);
          const leave =
            partner.pose === "opus-think"
              ? 0
              : enter(frame, partner.until - 9, 9);
          const weight = arrive * (1 - leave);
          const height = 681 - 19 * atDiff + Math.sin(frame / 31 + 1.2) * 1.6;
          return (
            <PixelActor
              actor={actors[partner.pose]}
              x={763 + (1 - arrive) * 34 + leave * 23}
              foot={base}
              height={height}
              style={{
                opacity: reveal * weight * (0.69 + 0.31 * light),
                filter: `contrast(${0.985 + 0.055 * light})`,
              }}
            />
          );
        })()}
    </>
  );
}
export function HumanInTheLoopFilm({
  captions,
  showCaptions,
  audioEnabled,
}: {
  captions: Caption[];
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const frame = useCurrentFrame();
  const chunks = useMemo(
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const ms = (frame * 1000) / fps;
  const caption = chunks.find((c) => ms >= c.startMs && ms < c.endMs);
  return (
    <AbsoluteFill className="hl-film">
      <LavaBackground className="hl-texture" />
      <Cast frame={frame} />
      <Profile frame={frame} />
      <WorkCards frame={frame} />
      <ApprovalQueue frame={frame} />
      {showCaptions && caption && (
        <div className="hl-captions">{caption.text}</div>
      )}
      {audioEnabled && (
        <Audio src={staticFile("episodes/human-in-the-loop/mix.wav")} />
      )}
    </AbsoluteFill>
  );
}
