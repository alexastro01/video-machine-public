import { useMemo } from "react";
import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import edit from "../../episodes/is-coffee-actually-a-drug/edit.json";
import transcript from "../../episodes/is-coffee-actually-a-drug/transcript-source.json";
import { progressiveCaptionCues } from "../engine/progressive-captions";
import { Aperture } from "../beer/Stage";
import { Cafe, CupCloseup, Sleep } from "./Cafe";
import { BrainField, CaffeineTrail, Origin, Receptor } from "./Neuroscience";
import { Canvas, base, cupCut, e, smooth } from "./Illustration";

import {
  BindingCloseup,
  LeadAdenosine,
  clockCut,
  handoffEnd,
  pocketCut,
} from "./Binding";

function Picture({ t }: { t: number }) {
  if (t < cupCut) return <Cafe t={t} scene="open" />;
  if (t < e.awake - 0.15) {
    const inside = smooth(t, e.caffeine - 0.15, 0.34);
    return (
      <>
        {inside < 1 ? <CupCloseup t={t} /> : null}
        <Aperture p={inside} x={545} y={670} rim="#e5c68f">
          <Origin t={t} />
        </Aperture>
        <CaffeineTrail t={t} />
      </>
    );
  }
  if (t < e.brain + 0.24) {
    const inside = smooth(t, e.brain - 0.14, 0.38);
    return (
      <>
        {inside < 1 ? <Cafe t={t} scene="awake" /> : null}
        <Aperture p={inside} x={525} y={548} rim="#a8c6ab">
          <BrainField t={t} />
        </Aperture>
      </>
    );
  }
  if (t < handoffEnd) {
    const inside = smooth(t, e.receptor - 0.2, 0.4);
    return (
      <>
        {inside < 1 ? <BrainField t={t} /> : null}
        <Aperture p={inside} x={422} y={722} rim="#a4c6b2">
          <Receptor t={t} />
        </Aperture>
        <Canvas>
          <LeadAdenosine t={t} />
        </Canvas>
      </>
    );
  }
  if (t < pocketCut) return <Receptor t={t} />;
  if (t < e.alert) return <BindingCloseup t={t} />;
  if (t < e.sleep) return <Cafe t={t} scene="alert" />;
  if (t < e.clears) return <Sleep t={t} />;
  if (t < clockCut) return <BindingCloseup t={t} clear />;
  return <Cafe t={t} scene="end" />;
}

export function CoffeeFilm({
  captions,
  showCaptions,
  audioEnabled,
}: {
  captions: Caption[];
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cues = useMemo(
    () => progressiveCaptionCues(captions, transcript.words),
    [captions],
  );
  const cue = cues.find(
    (c) =>
      frame >= Math.ceil((c.startMs * fps) / 1000 - 1e-7) &&
      frame < Math.ceil((c.endMs * fps) / 1000 - 1e-7),
  );
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#21494c",
        overflow: "hidden",
        fontFamily: "DM Sans",
      }}
    >
      <Picture t={t} />
      {showCaptions && cue ? (
        <div
          style={{
            position: "absolute",
            left: 83,
            top: edit.captionY,
            width: 914,
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
      ) : null}
      {audioEnabled ? (
        <Audio
          src={staticFile(base + "mix.wav")}
          name="Kai, original cafe score and timed Foley"
        />
      ) : null}
    </AbsoluteFill>
  );
}
