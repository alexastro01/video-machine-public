import type { Episode, FocusTarget } from "../engine/schema";
import { smooth, worldState } from "./timeline";
export type Vec3 = [number, number, number];
export const focusPoints: Record<FocusTarget, Vec3> = {
  copy: [37.15, 1.65, -0.05],
  cloud: [1, 4.05, -1],
  worm: [6, 1.7, 0],
  fly: [12, 2.15, 0],
  brain: [18, 2.2, 0],
  tissue: [24, 2.1, 0.25],
  servers: [24.15, 1.9, -2.4],
  preservation: [30, 2.2, 0],
  original: [35.2, 1.65, 1.2],
  pair: [36.1, 1.7, 0.3],
  portal: [37.15, 2, -0.5],
  "upload-button": [36, 1.5, 1.8],
  straw: [-0.8, 0.3, 1.2],
  tinder: [0.45, 1.1, 1.1],
  villagers: [8.1, 1.6, 0.1],
  food: [14.6, 1.1, 0.4],
  stocks: [21.45, 0.65, 0.7],
  tools: [28.6, 1.15, 0.65],
  traveler: [27.15, 1.65, 1.2],
};
export function loopState(episode: Episode, time: number) {
  if (episode.hook !== "pixel-transfer") return { worldTime: time, flash: 0 };
  const start = episode.duration - 0.6,
    cut = episode.duration - 0.34,
    end = episode.duration - 0.13;
  const flash =
    time < cut
      ? smooth((time - start) / (cut - start))
      : 1 - smooth((time - cut) / (end - cut));
  return { worldTime: time >= cut ? time - episode.duration : time, flash };
}
export function focusState(episode: Episode, time: number) {
  const { x } = worldState(episode, time);
  const weights: Partial<Record<FocusTarget, number>> = {};
  let weight = 0,
    zoom = 0;
  const offset: Vec3 = [0, 0, 0];
  const base: Vec3 = [x + 0.1, 1.55, 0];
  for (const scene of episode.scenes) {
    const prior =
      episode.scenes[Math.max(0, episode.scenes.indexOf(scene) - 1)];
    const arrival =
      prior.set !== scene.set || prior.specimen !== scene.specimen ? 1.25 : 0;
    for (const cue of scene.focus) {
      const begin = Math.max(scene.start + arrival, scene.start + cue.at - 0.6);
      const end = Math.min(
        scene.start + scene.duration - 0.12,
        scene.start + cue.at + cue.duration,
      );
      if (end <= begin || time <= begin || time >= end) continue;
      const ramp = Math.min(0.7, (end - begin) * 0.4);
      const w =
        smooth((time - begin) / ramp) *
        (1 - smooth((time - (end - ramp)) / ramp));
      const point: Vec3 =
        cue.target === "copy" && scene.set === "upload-lab"
          ? [1.05, 1.65, -0.05]
          : focusPoints[cue.target];
      weights[cue.target] = Math.max(weights[cue.target] ?? 0, w);
      weight += w;
      zoom += w * cue.zoom;
      point.forEach((v, i) => {
        offset[i] += (v - base[i]) * w;
      });
    }
  }
  const divisor = Math.max(1, weight);
  const point = base.map((v, i) => v + offset[i] / divisor) as Vec3;
  weights.original = Math.max(
    weights.original ?? 0,
    (weights.pair ?? 0) * 0.55,
  );
  weights.copy = Math.max(weights.copy ?? 0, (weights.pair ?? 0) * 0.55);
  return { weights, point, amount: Math.min(1, weight), zoom: zoom / divisor };
}
export function cameraState(episode: Episode, time: number) {
  const { x } = worldState(episode, time);
  const f = focusState(episode, time);
  const target: Vec3 = [
    x + 0.1 + (f.point[0] - x - 0.1) * 0.82,
    1.55 + (f.point[1] - 1.55) * 0.82,
    f.point[2] * 0.65,
  ];
  let position: Vec3 = [
    x + 2.2 + Math.sin(time * 0.25) * 0.11,
    4.65 + Math.sin(time * 0.3) * 0.06,
    10.3 - f.zoom * 0.65,
  ];
  let lookAt = target;
  let fov = 43 - f.zoom * 8.5;
  if (episode.hook === "pixel-transfer") {
    const end = episode.scenes[1]?.start ?? 3.4;
    const h = 1 - smooth((time - end + 1.05) / 1.05);
    const punch = smooth(time / 0.42) * (1 - smooth((time - 1.1) / 0.7));
    const opening: Vec3 = [0.15, 3.3, 8.7 - punch * 0.25];
    position = position.map((v, i) => v + (opening[i] - v) * h) as Vec3;
    const openingTarget: Vec3 = [-0.1, 1.95, 0.3];
    lookAt = target.map((v, i) => v + (openingTarget[i] - v) * h) as Vec3;
    fov += (38 - punch * 2.5 - fov) * h;
  }
  return { position, lookAt, fov };
}
