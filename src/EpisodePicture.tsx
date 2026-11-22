import { Sequence } from "remotion";
import type { Episode } from "./engine/schema";
import { StoryScene } from "./scenes/StoryScene";
import { PixelWorld } from "./pixel/PixelWorld";
import { TudorWorld } from "./pixel/TudorWorld";
import { TudorReviewWorld } from "./pixel/TudorReviewWorld";
import { TudorImmersiveWorld } from "./pixel/TudorImmersiveWorld";
import { UkWorld } from "./pixel/UkWorld";
import { UkStoryWorld } from "./pixel/UkStoryWorld";

export function EpisodePicture({
  episode,
  portrait,
}: {
  episode: Episode;
  portrait: boolean;
}) {
  if (episode.renderer === "pixel3d") {
    if (episode.world === "uk-vanish")
      if (episode.ukEdit?.style === "story-v6")
        return <UkStoryWorld episode={episode} />;
    if (episode.world === "uk-vanish")
      return <UkWorld episode={episode} portrait={portrait} />;
    if (episode.world !== "tudor")
      return <PixelWorld episode={episode} portrait={portrait} />;
    if (episode.reviewEdit?.scenery === "pixel-village-v1")
      return <TudorImmersiveWorld episode={episode} portrait={portrait} />;
    if (episode.reviewEdit)
      return <TudorReviewWorld episode={episode} portrait={portrait} />;
    return <TudorWorld episode={episode} portrait={portrait} />;
  }
  return (
    <>
      {episode.scenes.map((scene) => (
        <Sequence
          key={scene.id}
          name={`${scene.label} · ${scene.action}`}
          from={Math.round(scene.start * episode.fps)}
          durationInFrames={
            Math.round((scene.start + scene.duration) * episode.fps) -
            Math.round(scene.start * episode.fps)
          }
          premountFor={15}
        >
          <StoryScene episode={episode} scene={scene} portrait={portrait} />
        </Sequence>
      ))}
    </>
  );
}
