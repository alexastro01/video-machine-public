import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { OkMotionFilm } from "./OkMotionFilm";
import currentEdit from "../../episodes/ok-message-motion/edit.json";
import currentCaptions from "../../episodes/ok-message-motion/captions.json";
import currentSpeed from "../../episodes/ok-message-motion/speed-1p2x.json";
import teenEdit from "../../episodes/ok-message-motion-teen/edit.json";
import teenCaptions from "../../episodes/ok-message-motion-teen/captions.json";
import teenSpeed from "../../episodes/ok-message-motion-teen/speed-1p2x.json";

export const voiceVersions = {
  current: {
    edit: currentEdit,
    captions: currentCaptions,
    speed: currentSpeed,
  },
  teen: { edit: teenEdit, captions: teenCaptions, speed: teenSpeed },
};
export const OkVoiceVersion = ({
  voice,
  audioEnabled = true,
}: {
  voice: "current" | "teen";
  audioEnabled?: boolean;
}) => {
  const frame = useCurrentFrame(),
    v = voiceVersions[voice];
  const sourceFrame = Math.min(
    Math.round(v.edit.duration * v.edit.fps) - 1,
    Math.floor(frame * v.speed.playbackRate),
  );
  return (
    <AbsoluteFill>
      <OkMotionFilm
        sourceFrame={sourceFrame}
        timing={v.edit}
        captions={v.captions}
        audioEnabled={false}
      />
      {audioEnabled && <Audio src={staticFile(v.speed.mixFile)} />}
    </AbsoluteFill>
  );
};
