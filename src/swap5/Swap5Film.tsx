import { useMemo } from "react";
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import type { Caption } from "@remotion/captions";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import transcript from "../../episodes/billionaire-body-swap-5/transcript-source.json";
import { Swap5World, useSwap5Assets } from "./Swap5World";
loadFont({
  family: "Swap5 Inter",
  url: staticFile("episodes/start-the-task/fonts/InterVariable.woff2"),
  weight: "100 900",
});
export const Swap5Film = ({
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
    assets = useSwap5Assets();
  const cues = useMemo(
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const c = cues.find((x) => t * 1000 >= x.startMs && t * 1000 < x.endMs);
  return (
    <AbsoluteFill
      style={{
        background: "#355261",
        fontFamily: '"Swap5 Inter",sans-serif',
        overflow: "hidden",
      }}
    >
      {assets && <Swap5World t={t} assets={assets} />}{" "}
      {showCaptions && c && (
        <div
          style={{
            position: "absolute",
            left: 75,
            right: 75,
            top: 1530,
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
            src={staticFile("episodes/billionaire-body-swap-5/narration.wav")}
          />
          <Audio
            src={staticFile("episodes/billionaire-body-swap-5/music.wav")}
          />
          <Audio
            src={staticFile("episodes/billionaire-body-swap-5/effects.wav")}
          />
        </>
      )}
    </AbsoluteFill>
  );
};
