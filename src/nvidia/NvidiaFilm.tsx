import { useMemo } from "react";
import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import transcript from "../../episodes/nvidia-four-trillion/transcript-source.json";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import { edit, plan, stageAt, transitionAt } from "./motion";
import { NvidiaWorld, useNvidiaAssets } from "./NvidiaWorld";

loadFont({
  family: "Nvidia Inter",
  url: staticFile("episodes/nvidia-four-trillion/fonts/InterVariable.woff2"),
  weight: "100 900",
});
export function NvidiaFilm({
  captions,
  showCaptions,
  audioEnabled,
}: {
  captions: Caption[];
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const assets = useNvidiaAssets();
  const transition = transitionAt(t);
  const cues = useMemo(
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const cue = cues.find((c) => t * 1000 >= c.startMs && t * 1000 < c.endMs);
  const text = cue?.text;
  const fontSize = Math.min(84, 910 / Math.max(1, (text?.length ?? 0) * 0.55));
  return (
    <AbsoluteFill style={{ background: "#294753" }}>
      {assets && (
        <AbsoluteFill
          style={
            transition?.treatment === "focus match"
              ? {
                  filter: `blur(${4.5 * transition.amount}px)`,
                  transform: `scale(${1 + 0.012 * transition.amount})`,
                }
              : undefined
          }
        >
          <NvidiaWorld assets={assets} t={t} />
        </AbsoluteFill>
      )}
      {transition?.treatment === "warm dip" && (
        <AbsoluteFill
          style={{
            backgroundColor: "#b39d7c",
            opacity: 0.64 * transition.amount,
          }}
        />
      )}
      {showCaptions && text ? (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: `${stageAt(t) === "compute" ? 77 : plan.captionPercent}%`,
            transform: "translate(-50%,-50%)",
            width: 1000,
            textAlign: "center",
            fontFamily: "Nvidia Inter",
            fontWeight: 850,
            fontSize,
            lineHeight: 1.1,
            letterSpacing: -1.8,
            color: "#fff",
            WebkitTextStroke: "9px #101820",
            paintOrder: "stroke fill",
            textShadow: "0 4px 0 #101820",
          }}
        >
          {text}
        </div>
      ) : null}
      {audioEnabled ? <Audio src={staticFile(edit.audioMaster)} /> : null}
    </AbsoluteFill>
  );
}
