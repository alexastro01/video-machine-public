import * as THREE from "three";
import edit from "../../episodes/start-the-task/edit.json";

export { edit };
export const e = edit.events;
export const clamp = (p: number) => Math.max(0, Math.min(1, p));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const smooth = (t: number, at: number, duration: number) => {
  const p = clamp((t - at) / duration);
  return p * p * (3 - 2 * p);
};
export const out = (t: number, at: number, duration: number) =>
  1 - (1 - clamp((t - at) / duration)) ** 3;
export const graphicsMix = (t: number) =>
  smooth(t, e.graphics, 0.55) *
  (1 - smooth(t, e.returnDesk, e.returnEnd - e.returnDesk));
export const sentence = edit.ui.sentence;
export const continuation = edit.ui.continuation;
export const documentAt = (t: number) => {
  const first = sentence.slice(
    0,
    Math.floor(clamp((t - e.type) / e.typeDuration) * sentence.length),
  );
  const next = continuation.slice(
    0,
    Math.floor(clamp((t - e.result - 0.18) / 0.95) * continuation.length),
  );
  return {
    first,
    next,
    words: [first, next].join(" ").trim().split(/\s+/).filter(Boolean).length,
  };
};
export const cameraAt = (t: number) => {
  const opening = 1 - out(t, -0.035, 0.7);
  const end = smooth(t, e.returnDesk, 0.6);
  const coffee = smooth(t, e.coffeeWord - 0.12, 0.6);
  return {
    position: [
      -0.06 - opening * 0.16 + end * 0.12 + coffee * 0.12,
      2.35 + opening * 0.08 - end * 0.1,
      7.4 - opening * 0.2 - coffee * 0.2,
    ] as [number, number, number],
    target: [0.0 + coffee * 0.1, 1.45 - end * 0.04, 0.16] as [
      number,
      number,
      number,
    ],
  };
};
export const actorAt = (t: number) => {
  const c = cameraAt(t);
  const camera = new THREE.PerspectiveCamera(36, 1080 / 1920, 0.1, 45);
  camera.position.set(...c.position);
  camera.lookAt(...c.target);
  camera.updateMatrixWorld();
  const foot = new THREE.Vector3(-0.25, 0.015, 1.28).project(camera);
  const head = new THREE.Vector3(-0.25, 1.79, 1.28).project(camera);
  const p = graphicsMix(t);
  return {
    x: mix((foot.x + 1) * 540, 227, p),
    foot: mix((1 - foot.y) * 960, 1405, p),
    height: mix((head.y - foot.y) * 960, 400, p),
    pose: "seated" as const,
  };
};
export const heroAt = (t: number) => {
  const p = graphicsMix(t);
  const open = smooth(t, e.file, 0.5);
  const research = smooth(t, e.research, 0.5);
  return {
    x: mix(130, 140, p),
    y: mix(284, 365 - research * 90, p),
    width: mix(820, 800, p),
    height: mix(420 + open * 100, 480 + open * 220, p),
    radius: mix(36, 50, p),
  };
};
export const cupAt = (t: number, index: number) => {
  const falling =
    index === 2 ? 1 - clamp((t + 0.035) / (e.cupImpact + 0.035)) ** 2 : 0;
  const landing =
    index === 2
      ? Math.sin(clamp((t - e.cupImpact) / 0.18) * Math.PI) * 0.025
      : 0;
  return {
    x: 0.02 + index * 0.33,
    y: 1.033 + falling * 0.75 + landing,
    z: 0.94,
  };
};
export const pointerAt = (t: number) => {
  const p = out(t, e.contact - 0.3, 0.3);
  return {
    x: mix(960, 720, p),
    y: mix(1200, 695, p),
    opacity: out(t, e.contact - 0.32, 0.08) * (1 - out(t, e.file + 0.2, 0.18)),
    press: smooth(t, e.contact, 0.06) * (1 - smooth(t, e.contact + 0.1, 0.1)),
    ring: clamp((t - e.contact) / 0.34),
  };
};
