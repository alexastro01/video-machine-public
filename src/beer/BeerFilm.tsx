import { useMemo } from "react";
import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import edit from "../../episodes/beer-feels-good/edit.json";
import transcript from "../../episodes/beer-feels-good/transcript-source.json";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import { base } from "./Cast";
import { Opening, Calm, Reaction } from "./AtTheBar";
import { Circulation, Reward } from "./Neuroscience";
import { Night, Conclusion } from "./Night";
import { Aperture } from "./Stage";
import { colours as c, smooth } from "./graphics";

const e = edit.events;
const absolute = { position: "absolute" } as const;

function Picture({ t }: { t: number }) {
  if (t < e.calm) {
    const glass = smooth(t, e.blood - 0.33, 0.51);
    return (
      <>
        {glass < 1 ? <Opening t={t} /> : null}
        <Aperture x={284} y={848} p={glass} rim="#ffd182">
          <Circulation t={t} />
        </Aperture>
      </>
    );
  }
  if (t < e.cost) {
    const inside = smooth(t, e.reward - 0.14, 0.5);
    return (
      <>
        {inside < 1 ? <Calm t={t} /> : null}
        <Aperture x={599} y={421} p={inside} rim="#f4a1cf">
          <Reward t={t} />
        </Aperture>
      </>
    );
  }
  if (t < e.wears) return <Reaction t={t} />;
  if (t < e.recap - 0.08) return <Night t={t} />;
  return <Conclusion t={t} />;
}

export const BeerFilm = ({
  captions,
  showCaptions,
  audioEnabled,
}: {
  captions: Caption[];
  showCaptions: boolean;
  audioEnabled: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const deliveryGain = 10 ** (edit.deliveryGainDb / 20);
  const cues = useMemo(
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const cue = cues.find(
    (item) =>
      frame >= Math.ceil((item.startMs / 1000) * fps - 1e-7) &&
      frame < Math.ceil((item.endMs / 1000) * fps - 1e-7),
  );
  return (
    <AbsoluteFill
      style={{
        background: c.background,
        overflow: "hidden",
        fontFamily: "DM Sans",
      }}
    >
      <Picture t={t} />
      {showCaptions && cue ? (
        <div
          style={{
            ...absolute,
            top: edit.captionY,
            left: 95,
            width: 890,
            minHeight: 100,
            textAlign: "center",
            color: "white",
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: -0.8,
            WebkitTextStroke: "7px #130b29",
            paintOrder: "stroke fill",
            textShadow: "0 3px 0 #130b29",
          }}
        >
          {cue.text}
        </div>
      ) : null}
      {audioEnabled ? (
        <>
          <Audio
            src={staticFile(base + "narration.wav")}
            volume={deliveryGain}
          />
          <Audio src={staticFile(base + "music.wav")} volume={deliveryGain} />
          <Audio src={staticFile(base + "effects.wav")} volume={deliveryGain} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
