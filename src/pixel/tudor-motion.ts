import type { Episode } from "../engine/schema";
import { focusState, type Vec3 } from "./focus";
import { smooth, worldState } from "./timeline";
export function tudorClock(episode: Episode, time: number) {
  const start = episode.duration - 0.5,
    cut = episode.duration - 0.28,
    end = episode.duration - 0.1;
  const flash =
    time < cut
      ? smooth((time - start) / (cut - start))
      : 1 - smooth((time - cut) / (end - cut));
  return { worldTime: time >= cut ? time - episode.duration : time, flash };
}
export function tudorCamera(episode: Episode, time: number) {
  const { x } = worldState(episode, time);
  const f = focusState(episode, time);
  let position: Vec3 = [
    x + 2.1 + Math.sin(time * 0.24) * 0.1,
    4.4 + Math.sin(time * 0.32) * 0.06,
    10.1 - f.zoom * 0.65,
  ];
  let lookAt: Vec3 = [
    x + 0.1 + (f.point[0] - x - 0.1) * 0.8,
    1.5 + (f.point[1] - 1.5) * 0.75,
    f.point[2] * 0.55,
  ];
  let fov = 42 - f.zoom * 7;
  const hookEnd = episode.scenes[1]?.start ?? 3;
  const h = 1 - smooth((time - hookEnd + 0.9) / 0.9);
  const punch = smooth(time / 0.38) * (1 - smooth((time - 0.9) / 0.7));
  const introPosition: Vec3 = [0.65, 3.2, 7.9 - punch * 0.22],
    introTarget: Vec3 = [-0.45, 1.55, 0.7];
  position = position.map((v, i) => v + (introPosition[i] - v) * h) as Vec3;
  lookAt = lookAt.map((v, i) => v + (introTarget[i] - v) * h) as Vec3;
  fov += (37 - punch * 2 - fov) * h;
  return { position, lookAt, fov };
}
export function tudorActor(episode: Episode, time: number) {
  const state = worldState(episode, time);
  const { scene, local, walking, x } = state;
  const recoiling =
    scene.action === "treat" ? smooth((local - 2) / 0.8) * 0.26 : 0;
  const xPosition = x - 0.85 - recoiling;
  const end = episode.scenes[1]?.start ?? 3;
  const waking = scene.action === "wake" && local < 0.65;
  const lean = waking ? -0.35 * (1 - smooth(local / 0.5)) : 0;
  const pose = walking
    ? 0
    : scene.action === "wake"
      ? 6
      : scene.action === "strike"
        ? 7
        : scene.action === "puzzle"
          ? 5
          : scene.action === "eat"
            ? 4
            : scene.action === "survive"
              ? 5
              : 6;
  return {
    x: xPosition,
    pose,
    lean,
    y: 0.06 * (1 - smooth((time - end) / 0.5)),
    walking,
  };
}
