import { PixelStage } from "./PixelStage";
import { UkLights } from "./UkGeometry";
import {
  DetailedRunway,
  IrelandAtlas,
  SceneryCamera,
  SceneryMetrics,
} from "./UkScenery";
import type { SceneryDebug } from "./uk-scenery-model";
export type SceneryReviewProps = {
  view: "runway" | "ireland";
  progress: number;
  debug: SceneryDebug;
  zoom: number;
  seed: number;
  time: number;
};
export const sceneryReviewDefaults: SceneryReviewProps = {
  view: "ireland",
  progress: 0.1,
  debug: "beauty",
  zoom: 1,
  seed: 29,
  time: 0.5,
};
export function UkSceneryReview({
  view,
  progress,
  debug,
  zoom,
  seed,
  time,
}: SceneryReviewProps) {
  return (
    <PixelStage key={view} portrait background="#12283d" orthographic={view === "ireland"}>
      <SceneryCamera view={view} progress={progress} zoom={zoom} />
      <UkLights scenery cold={view === "ireland"} />
      {view === "ireland" ? (
        <IrelandAtlas progress={progress} time={time} debug={debug} />
      ) : (
        <DetailedRunway
          progress={progress}
          time={time}
          seed={seed}
          debug={debug}
        />
      )}
      <SceneryMetrics />
    </PixelStage>
  );
}
