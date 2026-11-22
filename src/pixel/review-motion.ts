import type { Episode } from "../engine/schema";
import type { Vec3 } from "./focus";
import { smooth } from "./timeline";
export type ReviewShot = NonNullable<Episode["reviewEdit"]>["shots"][number];
export function reviewShot(episode: Episode, time: number) {
  const shots = episode.reviewEdit!.shots;
  let index = 0;
  shots.forEach((s, i) => {
    if (time >= s.start) index = i;
  });
  const shot = shots[index],
    local = Math.max(0, time - shot.start);
  return { shot, index, local, progress: Math.min(1, local / shot.duration) };
}
export function reviewCamera(episode: Episode, time: number) {
  const { shot, local, progress } = reviewShot(episode, time);
  const opening = {
    position: [-1.3, 2.3, 7.8] as Vec3,
    lookAt: [-0.75, 0.3, 1.5] as Vec3,
    fov: 38,
  };
  if (time >= episode.duration - 1 / episode.fps - 0.0001)
    return { ...opening, focus: 4.6, blur: 0 };
  const views: Record<
    ReviewShot["angle"],
    { position: Vec3; lookAt: Vec3; fov: number }
  > = {
    wake: opening,
    face: { position: [-0.85, 2.4, 6.8], lookAt: [-0.75, 0.7, 1.2], fov: 35 },
    wide: { position: [3.3, 3.7, 9.3], lookAt: [0.1, 1.65, 0.4], fov: 43 },
    top: { position: [0.5, 7.8, 5.8], lookAt: [0.05, 0.9, 0.9], fov: 40 },
    detail: { position: [1.8, 3.2, 6.3], lookAt: [0.3, 1.75, 0.8], fov: 35 },
    low: { position: [1.9, 0.85, 7.1], lookAt: [0.0, 1.5, 0.5], fov: 43 },
    quiet: { position: [1.8, 2.9, 5.8], lookAt: [0.25, 1.6, 0.65], fov: 35 },
    loop: opening,
  };
  const base =
    shot.angle === "face" && shot.activity === "stocks"
      ? {
          position: [0.4, 2.4, 6.8] as Vec3,
          lookAt: [0.45, 0.55, 0.2] as Vec3,
          fov: 37,
        }
      : views[shot.angle];
  if (shot.angle === "wide" && shot.activity === "stocks")
    base.lookAt = [0.4, 0.7, 0.4];
  if (shot.angle === "detail" && shot.activity === "strike") {
    base.position = [-0.2, 3, 7];
    base.lookAt = [0, 0.5, 1.2];
    base.fov = 40;
  }
  if (shot.activity === "years") {
    const pull = smooth(local / 0.42),
      nearPosition: Vec3 = [2, 1.8, 3.5],
      nearTarget: Vec3 = [1.55, 0.8, 0.2];
    base.position = base.position.map(
      (v, i) => nearPosition[i] + (v - nearPosition[i]) * pull,
    ) as Vec3;
    base.lookAt = base.lookAt.map(
      (v, i) => nearTarget[i] + (v - nearTarget[i]) * pull,
    ) as Vec3;
  }
  const punch =
    shot.angle === "quiet"
      ? progress * 0.12
      : Math.sin(Math.min(1, local / 0.24) * Math.PI) * 0.35;
  const shake =
    shot.activity === "wake" ||
    shot.activity === "stocks" ||
    shot.activity === "brace"
      ? Math.exp(-local * 10) * 0.065
      : 0;
  const position = base.position.map(
    (v, i) =>
      v +
      (i === 2 ? -punch : 0) +
      (i < 2 ? (Math.sin(local * 90 + i * 2) - Math.sin(i * 2)) * shake : 0),
  ) as Vec3;
  // Whips move only during the first four frames of a new shot.
  if (shot.cutStyle === "whip") position[0] += (1 - smooth(local / 0.13)) * 1.4;
  const focus = Math.hypot(...position.map((v, i) => v - base.lookAt[i]));
  return {
    position,
    lookAt: base.lookAt,
    fov: base.fov,
    focus,
    blur:
      shot.angle === "face"
        ? 1.2
        : shot.angle === "detail" || shot.angle === "quiet"
          ? 0.7
          : 0,
  };
}
export function reviewActor(episode: Episode, time: number) {
  const { shot, local } = reviewShot(episode, time),
    a = shot.activity;
  const loop = time >= episode.duration - 0.2;
  const actual = loop ? "wake" : a;
  const poses = {
    wake: 0,
    cold: 1,
    strike: 2,
    speak: 3,
    years: 3,
    search: 3,
    eat: 4,
    stocks: 5,
    cut: 6,
    tools: 7,
    brace: 7,
    comment: 3,
    loop: 0,
  };
  return {
    pose: actual === "wake" && !loop && local > 0.36 ? 1 : poses[actual],
    x: actual === "stocks" ? 0.45 : actual === "strike" ? -0.3 : -0.8,
    y: actual === "stocks" ? 0.12 : 0,
    z: actual === "stocks" ? -0.05 : actual === "strike" ? 1.8 : 1.25,
    lean:
      actual === "wake"
        ? -0.22 *
          (loop
            ? smooth((time - episode.duration + 0.2) / (0.2 - 1 / episode.fps))
            : 1 - smooth(local / 0.38))
        : actual === "cold"
          ? Math.sin(local * 45) * 0.025
          : actual === "strike"
            ? -Math.abs(Math.sin(local * 5)) * 0.055
            : actual === "eat"
              ? Math.sin(local * 4) * 0.035
              : actual === "brace"
                ? -0.06
                : 0,
  };
}
