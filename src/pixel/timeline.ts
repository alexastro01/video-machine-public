import type { Episode, Scene } from "../engine/schema";
export const smooth = (v: number) => {
  const x = Math.max(0, Math.min(1, v));
  return x * x * (3 - 2 * x);
};
export function stageX(scene: Scene): number {
  const tudor = {
    "tudor-cottage": 0,
    "tudor-village": 7,
    "tudor-market": 14,
    "tudor-square": 21,
    "tudor-clinic": 28,
  };
  if (scene.set in tudor) return tudor[scene.set as keyof typeof tudor];
  if (scene.set === "upload-lab") return 0;
  if (scene.set === "neuron-gallery")
    return scene.specimen === "worm" ? 6 : scene.specimen === "fly" ? 12 : 18;
  if (scene.set === "data-vault") return 24;
  if (scene.set === "preservation-room") return 30;
  return 36;
}
export function worldState(episode: Episode, time: number) {
  let index = 0;
  episode.scenes.forEach((s, i) => {
    if (time >= s.start) index = i;
  });
  const scene = episode.scenes[index];
  const previous = episode.scenes[Math.max(0, index - 1)];
  const travel = smooth((time - scene.start) / 1.25);
  const x = stageX(previous) + (stageX(scene) - stageX(previous)) * travel;
  const walking =
    travel > 0 && travel < 1 && stageX(previous) !== stageX(scene);
  return { scene, index, x, travel, walking, local: time - scene.start };
}
export function actorPose(
  scene: Scene,
  time: number,
  walking: boolean,
): number {
  if (walking) return 0;
  if (
    scene.action === "specimen" ||
    scene.action === "scan" ||
    scene.id === "memories"
  )
    return 4;
  if (scene.action === "preserve" || scene.id === "continuity") return 6;
  if (scene.action === "choose") return 7;
  if (scene.action === "duplicate" || scene.action === "archive") return 5;
  return time < 2 ? 6 : 7;
}
export function copyPose(scene: Scene): number {
  if (scene.action === "choose") return 7;
  if (scene.id === "memories") return 4;
  return scene.id === "continuity" ? 5 : 0;
}
