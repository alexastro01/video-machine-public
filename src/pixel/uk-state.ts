import type { Episode } from "../engine/schema";
import { smooth } from "./timeline";
import { atlasFrameAt } from "./atlas-animation";
import pilotAtlas from "../../public/pixel/animations/miko-pilot-reaction-v2-atlas.json";
export type UkShot = NonNullable<Episode["ukEdit"]>["shots"][number];
export function ukState(episode: Episode, time: number) {
  const edit = episode.ukEdit!;
  const shot =
    edit.shots.find((s) => time >= s.start && time < s.start + s.duration) ??
    edit.shots.at(-1)!;
  const local = Math.max(0, time - shot.start),
    progress = Math.min(1, local / shot.duration);
  const final = time >= episode.duration - 1 / episode.fps - 0.0001;
  const closing = time >= edit.commentStart;
  const ireland = episode.scenes.find((s) => s.id === "ireland");
  if (!ireland)
    throw new Error("The UK edit needs its Ireland narration anchor.");
  const hookEnd = ireland.start;
  const loopBlend = closing
    ? smooth((time - (episode.duration - 0.7)) / 0.6666667)
    : 0;
  const visualTime = final
    ? 0
    : closing
      ? (time - edit.commentStart) * (1 - loopBlend)
      : time;
  const view = final ? "cockpit" : shot.view;
  const scene = episode.scenes.find((s) => s.id === shot.sceneId)!;
  const sceneTime = time - scene.start;
  const vanish = closing
    ? 0.06 + Math.sin(visualTime * 0.8) * 0.025
    : Math.min(1, 0.06 + (time / hookEnd) * 0.84);
  const animation = edit.pilotAnimation;
  const pilotAnimation = animation
    ? {
        asset: animation.asset,
        height: animation.height,
        frame: final
          ? 0
          : atlasFrameAt(closing ? time - edit.commentStart : time, {
              start: closing ? animation.closingAt : animation.openingAt,
              frameDurationMs: pilotAtlas.frameDurationMs,
              endFrame: closing
                ? pilotAtlas.frameCount - 1
                : animation.openingHoldFrame,
              holdFrame: closing ? 0 : animation.openingHoldFrame,
            }),
      }
    : undefined;
  return {
    shot,
    local,
    progress,
    view,
    visualTime,
    sceneTime,
    closing: closing && !final,
    final,
    vanish,
    loopBlend,
    pilotAnimation,
  };
}
export const drop = (progress: number, seed: number, layer = 1) =>
  smooth((progress - seed * 0.66 - layer * 0.075) / 0.24);
