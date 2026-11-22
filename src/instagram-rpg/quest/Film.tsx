import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { PixelLayer, root } from "../art";
import { Road, Party, Encounter } from "./World";
import { Gates } from "./Gates";
import { Hud } from "./Hud";
import { FieldLine, Payoff } from "./Captions";
import { edit } from "./staging";

export function InstagramQuest({
  showCaptions,
  audioEnabled,
}: {
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <Sequence
        name="The stone road"
        layout="none"
        durationInFrames={edit.frames - 1}
      >
        <PixelLayer>
          <Road f={f} />
        </PixelLayer>
      </Sequence>
      <Sequence
        name="Encounter and three gates"
        layout="none"
        durationInFrames={edit.frames - 1}
      >
        <PixelLayer>
          <Encounter f={f} />
          <Gates f={f} />
        </PixelLayer>
      </Sequence>
      <Sequence
        name="Party and guardians"
        layout="none"
        durationInFrames={edit.frames - 1}
      >
        <PixelLayer>
          <Party f={f} />
        </PixelLayer>
      </Sequence>
      <Sequence
        name="Story cues and minimap"
        layout="none"
        durationInFrames={edit.frames - 1}
      >
        <PixelLayer>
          <Hud f={f} />
          {showCaptions && <FieldLine f={f} />}
        </PixelLayer>
      </Sequence>
      <Sequence
        name="Closing portrait exchange"
        layout="none"
        durationInFrames={edit.frames - 1}
      >
        <Payoff f={f} showCaptions={showCaptions} />
      </Sequence>
      {audioEnabled && <Audio src={staticFile(root + "full/mix.wav")} />}
    </AbsoluteFill>
  );
}
