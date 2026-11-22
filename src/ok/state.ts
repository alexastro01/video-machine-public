import * as THREE from "three";
import episode from "../../episodes/ok-message/episode.json";

export const SAMPLE = {
  width: 1080,
  height: 1920,
  fps: episode.fps,
  duration: episode.duration,
};
export const CHAT = { dotX: 226, dotY: 756, dotRadius: 8.5 };
export const TIMING = episode.sampleEdit.timings;
export const MESSAGE = episode.sampleEdit;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const progress = (t: number, a: number, b: number) =>
  clamp((t - a) / (b - a));
export const smooth = (t: number, a: number, b: number) => {
  const p = progress(t, a, b);
  return p * p * (3 - 2 * p);
};
export const out = (t: number, a: number, b: number) =>
  1 - (1 - progress(t, a, b)) ** 3;
const mix = (a: number, b: number, p: number) => a + (b - a) * p;

export const cameraAt = (time: number) => {
  const p = smooth(time, TIMING.cameraStart, TIMING.cameraEnd);
  const close = smooth(time, TIMING.reactionStart, TIMING.reactionEnd);
  return {
    position: [
      mix(0, 0.16, p),
      mix(1.6, 2.52, p),
      mix(7, 8.7 - close * 1.05, p),
    ] as [number, number, number],
    target: [0, mix(1.6, 1.3, p), 0] as [number, number, number],
    fov: 38,
  };
};

export const chatAt = (time: number) => {
  const push = smooth(time, TIMING.pushStart, TIMING.depth);
  const leave = smooth(time, TIMING.room, TIMING.roomEnd);
  return {
    scale: mix(1, 1.65, push),
    x: (540 - CHAT.dotX) * push,
    y: -100 * push,
    opacity: 1 - leave,
    leaveY: -100 * leave,
    dot: {
      x: mix(CHAT.dotX, 540, push),
      y: mix(CHAT.dotY, 656, push),
      radius: CHAT.dotRadius * mix(1, 1.65, push),
    },
  };
};

export const cameraObjectAt = (time: number) => {
  const c = cameraAt(time);
  const camera = new THREE.PerspectiveCamera(
    c.fov,
    SAMPLE.width / SAMPLE.height,
    0.1,
    70,
  );
  camera.position.set(...c.position);
  camera.lookAt(...c.target);
  camera.updateMatrixWorld();
  return camera;
};

export const ballAt = (time: number) => {
  const ui = chatAt(TIMING.depth);
  const distance = 7;
  const halfH = Math.tan(((38 / 2) * Math.PI) / 180) * distance;
  const from = {
    x:
      ((ui.dot.x / SAMPLE.width - 0.5) * 2 * halfH * SAMPLE.width) /
      SAMPLE.height,
    y: 1.6 + (0.5 - ui.dot.y / SAMPLE.height) * 2 * halfH,
    radius: (ui.dot.radius / SAMPLE.height) * 2 * halfH,
  };
  const lift = smooth(time, TIMING.depth, TIMING.liftEnd);
  let y = mix(from.y, 2.8, lift);
  if (time >= TIMING.drop) {
    const fall = progress(time, TIMING.drop, TIMING.impact);
    y = mix(2.8, 1.32, fall * fall);
  }
  if (time >= TIMING.impact && time <= TIMING.bounceEnd) {
    const p = progress(time, TIMING.impact, TIMING.bounceEnd);
    y = 1.32 + Math.sin(p * Math.PI) * 0.2 * (1 - p);
  }
  return {
    x: mix(from.x, 0.73, lift),
    y,
    z: mix(0, 0.26, lift),
    radius: mix(from.radius, 0.32, out(time, TIMING.depth, TIMING.growthEnd)),
    opacity: smooth(time, TIMING.depth - 0.02, TIMING.depth + 0.06),
  };
};

export const projectedBallAt = (time: number) => {
  const b = ballAt(time);
  const v = new THREE.Vector3(b.x, b.y, b.z).project(cameraObjectAt(time));
  return {
    x: ((v.x + 1) / 2) * SAMPLE.width,
    y: ((1 - v.y) / 2) * SAMPLE.height,
  };
};

export const actorFrameAt = (time: number) =>
  time < TIMING.imaginedVoice
    ? Math.min(5, Math.max(0, Math.floor((time - TIMING.impact) / 0.1)))
    : Math.min(11, 5 + Math.floor((time - TIMING.imaginedVoice) / 0.1));
