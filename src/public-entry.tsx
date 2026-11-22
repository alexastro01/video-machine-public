import {
  AbsoluteFill,
  Composition,
  Sequence,
  Still,
  registerRoot,
} from "remotion";
import type { Caption } from "@remotion/captions";
import { CharacterSheet } from "./CharacterSheet";
import { Captions, captionPages } from "./components/Captions";
import { episodeSchema } from "./engine/schema";
import { StoryScene } from "./scenes/StoryScene";
import pilot from "../episodes/one-second-ahead/episode.json";
import pilotCaptions from "../episodes/one-second-ahead/captions.json";

const episode = episodeSchema.parse(pilot);
const pages = captionPages(pilotCaptions as Caption[]);

const ShadowPilot = () => (
  <AbsoluteFill>
    {episode.scenes.map((scene) => {
      const start = Math.round(scene.start * episode.fps);
      const end = Math.round((scene.start + scene.duration) * episode.fps);
      return (
        <Sequence
          key={scene.id}
          name={scene.action}
          from={start}
          durationInFrames={end - start}
        >
          <StoryScene scene={scene} episode={episode} portrait />
        </Sequence>
      );
    })}
    <Captions pages={pages} portrait hookDuration={episode.scenes[1].start} />
  </AbsoluteFill>
);

const PublicRoot = () => (
  <>
    <Composition
      id="ShadowPilot"
      component={ShadowPilot}
      durationInFrames={Math.round(episode.duration * episode.fps)}
      fps={episode.fps}
      width={1080}
      height={1920}
    />
    <Still
      id="IllustratedCast"
      component={CharacterSheet}
      width={1920}
      height={1080}
    />
  </>
);

registerRoot(PublicRoot);
