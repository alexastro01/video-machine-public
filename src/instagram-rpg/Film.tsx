import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { PixelLayer, root } from "./art";
import { FieldCaptions, PortraitDialogue } from "./Dialogue";
import { Hud } from "./Hud";
import { Monsters, Party, RouteLights, Signs, Terrain } from "./World";

export function InstagramRpgFilm({
  portraits,
  showCaptions,
  audioEnabled,
}: {
  portraits: boolean;
  showCaptions: boolean;
  audioEnabled: boolean;
}) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#153d3e", overflow: "hidden" }}>
      <Sequence layout="none" name="Northbound stone road">
        <PixelLayer>
          <Terrain f={f} />
          <RouteLights f={f} />
        </PixelLayer>
      </Sequence>
      <Sequence layout="none" name="Algorithm encounter">
        <PixelLayer>
          <Monsters f={f} portraits={portraits} />
          <Signs f={f} />
        </PixelLayer>
      </Sequence>
      <Sequence layout="none" name="Alex, Opus, Astra and Gemini">
        <PixelLayer>
          <Party f={f} portraits={portraits} />
        </PixelLayer>
      </Sequence>
      <Sequence layout="none" name="Views and live minimap">
        <PixelLayer>
          <Hud f={f} />
        </PixelLayer>
      </Sequence>
      <Sequence
        layout="none"
        name={portraits ? "Portrait dialogue" : "Field dialogue"}
      >
        {portraits ? (
          <PortraitDialogue f={f} showCaptions={showCaptions} />
        ) : showCaptions ? (
          <PixelLayer>
            <FieldCaptions f={f} />
          </PixelLayer>
        ) : null}
      </Sequence>
      {audioEnabled && <Audio src={staticFile(root + "mix.wav")} />}
    </AbsoluteFill>
  );
}
