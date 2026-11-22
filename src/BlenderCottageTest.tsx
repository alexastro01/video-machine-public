import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Audio } from "@remotion/media";
import { StoryItems } from "./components/StoryItems";
import { ReviewCaptions } from "./components/ReviewCaptions";
import { getStudioEpisode } from "./StudioFilm";
import { CutWipe } from "./pixel/TudorImmersiveWorld";
import { immersiveState } from "./pixel/immersive-state";
import "./components/Typography";

const saved = getStudioEpisode("survive-1500");
const flintCloseStart = saved.episode.reviewEdit!.shots.find(
  (shot) => shot.activity === "strike",
)!.start;
const episode = {
  ...saved.episode,
  storyItems: saved.episode.storyItems?.map((item) => ({
    ...item,
    y: 17,
    size: item.file.includes("matches") ? 30 : 26,
  })),
};

/** Separate calibration composition; the finished episode remains unchanged. */
export function BlenderCottageTest({
  audioEnabled = true,
}: {
  audioEnabled?: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  return (
    <AbsoluteFill style={{ background: "#263a44" }}>
      <Img
        src={staticFile(
          `episodes/survive-1500/blender-cottage-test-v1/frames/${String(frame + 1).padStart(4, "0")}.png`,
        )}
        style={{ width: "100%", height: "100%", imageRendering: "pixelated" }}
      />
      <StoryItems episode={episode} time={time} />
      <CutWipe
        state={immersiveState(episode, time)}
        colors={episode.reviewEdit!.wipeColors}
      />
      <AbsoluteFill
        style={{
          boxShadow: "inset 0 0 130px 15px #172b3430",
          pointerEvents: "none",
        }}
      />
      <ReviewCaptions
        captions={saved.captions}
        episode={episode}
        portrait
        verticalPercent={time >= flintCloseStart ? 76 : undefined}
      />
      {audioEnabled && (
        <Audio
          src={staticFile(
            "episodes/survive-1500/blender-cottage-test-audio-v1.wav",
          )}
        />
      )}
    </AbsoluteFill>
  );
}
