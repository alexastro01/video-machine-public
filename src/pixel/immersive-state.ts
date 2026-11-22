import type { Episode } from "../engine/schema";
import { reviewShot } from "./review-motion";
import { smooth } from "./timeline";
export const sceneBackplates: Record<string, string> = {
  "tudor-cottage": "cottage-cold",
  "tudor-village": "village",
  "tudor-market": "market",
  "tudor-square": "square",
  "tudor-clinic": "barber",
};
export function immersiveState(episode: Episode, time: number) {
  const { shot, local, progress } = reviewShot(episode, time);
  const last = time >= episode.duration - 1 / episode.fps - 0.0001;
  const loop = shot.activity === "loop";
  const activity = loop ? "wake" : shot.activity;
  const poseMap = {
    wake: { artwork: "four-extra" as const, pose: 0 },
    cold: { artwork: "four-core" as const, pose: 0 },
    strike: { artwork: "four-core" as const, pose: 1 },
    speak: { artwork: "four-extra" as const, pose: 1 },
    years: { artwork: "four-extra" as const, pose: 1 },
    search: { artwork: "four-extra" as const, pose: 1 },
    eat: { artwork: "four-core" as const, pose: 2 },
    stocks: { artwork: "four-extra" as const, pose: 2 },
    cut: { artwork: "four-extra" as const, pose: 3 },
    tools: { artwork: "four-core" as const, pose: 3 },
    brace: { artwork: "four-core" as const, pose: 3 },
    comment: { artwork: "four-extra" as const, pose: 1 },
    loop: { artwork: "four-extra" as const, pose: 0 },
  };
  const pose =
    activity === "wake" && !loop && local > 0.48
      ? poseMap.cold
      : poseMap[activity];
  const scene = episode.scenes.find((s) => s.id === shot.sceneId)!;
  const sway =
    activity === "cold"
      ? Math.sin(local * 31) * 0.011
      : activity === "eat"
        ? Math.sin(local * 4) * 0.025
        : activity === "strike"
          ? -Math.abs(Math.sin(local * 5)) * 0.025
          : 0;
  const wakeLean = loop
    ? -0.08 *
      smooth((time - episode.duration + 0.24) / (0.24 - 1 / episode.fps))
    : -0.08 * (1 - smooth(local / 0.42));
  const zoom =
    last || loop
      ? 1
      : shot.activity === "strike"
        ? 1.055
        : 1 + Math.sin(Math.min(1, local / 0.35) * Math.PI) * 0.018;
  return {
    shot,
    local,
    progress,
    backplate: sceneBackplates[scene.set],
    visualTime: last
      ? 0
      : loop
        ? time - episode.duration + 1 / episode.fps
        : time,
    camera: {
      position: [0, 4.35, 14] as [number, number, number],
      target: [0, 1.75, 0] as [number, number, number],
      zoom,
    },
    hero: {
      ...pose,
      x: activity === "stocks" ? -0.3 : -0.55,
      y: 0,
      z: activity === "stocks" ? 0.1 : 1.1,
      height: 2.9,
      lean: activity === "wake" ? wakeLean : sway,
    },
  };
}
