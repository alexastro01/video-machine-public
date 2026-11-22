import { useMemo } from "react";
import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import edit from "../../episodes/norbert-explains-billionaire-income-tax/edit.json";
import plan from "../../episodes/norbert-explains-billionaire-income-tax/opening.json";
import transcript from "../../episodes/norbert-explains-billionaire-income-tax/transcript-source.json";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import { Canvas, mix, smooth } from "../beer/graphics";
import { Aperture } from "../beer/Stage";
import { certificateSeal, Cutaway } from "./Cutaway";
import { Desk, projectedSeal } from "./Desk";
import { ShareSeal } from "./Paper";

export function ShareLedgerFilm({
  episodeId,
  captions,
  showCaptions,
  audioEnabled,
}: {
  episodeId: string;
  captions: Caption[];
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const transition = edit.events.diagram;
  const iris = smooth(t, transition - 0.2, 0.49);
  const travel = smooth(t, transition - 0.2, 0.61);
  const oldSeal = projectedSeal(t);
  const sealX = mix(oldSeal.x, certificateSeal.x, travel);
  const sealY = mix(oldSeal.y, certificateSeal.y, travel);
  const cues = useMemo(
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const ms = t * 1000;
  const cue = cues.find((c) => ms >= c.startMs && ms < c.endMs);
  return (
    <AbsoluteFill
      style={{
        background: "#214843",
        overflow: "hidden",
        fontFamily: "DM Sans",
      }}
    >
      {iris < 1 && <Desk t={t} />}
      <Aperture p={iris} x={oldSeal.x} y={oldSeal.y} rim="#ebcc88">
        <Cutaway t={t} />
      </Aperture>
      <Canvas>
        <ShareSeal
          x={sealX}
          y={sealY}
          scale={mix(oldSeal.scale, certificateSeal.scale, travel)}
        />
      </Canvas>
      {showCaptions && cue && (
        <div
          style={{
            position: "absolute",
            left: 82,
            top: plan.captionY,
            width: 916,
            textAlign: "center",
            fontSize: 69,
            fontWeight: 850,
            lineHeight: 1.1,
            letterSpacing: -0.9,
            color: "#fffdf6",
            WebkitTextStroke: "7px #25333b",
            paintOrder: "stroke fill",
            textShadow: "0 4px 0 #25333b",
          }}
        >
          {cue.text}
        </div>
      )}
      {audioEnabled && (
        <Audio
          src={staticFile(`episodes/${episodeId}/mix.wav`)}
          name="Kai, café score and desk effects"
        />
      )}
    </AbsoluteFill>
  );
}
