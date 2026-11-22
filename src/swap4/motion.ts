import raw from "../../episodes/billionaire-body-swap-4/edit.json";
import type { Plan } from "../paid/types";
export const edit = raw as Plan;
export const ui = raw.ui;
export const e = edit.events;
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (t: number, start: number, duration: number) => {
  const p = clamp((t - start) / duration);
  return p * p * (3 - 2 * p);
};
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const shotAt = (t: number) =>
  [...edit.shots].reverse().find((s) => t >= s.start - 1e-8) ?? edit.shots[0];
export const nativeFrame = (t: number, start: number, count = 16) =>
  Math.max(0, Math.min(count - 1, Math.floor((t - start + 1e-7) * 10)));
export const drop = (t: number, contact: number, height = 0.55) =>
  height * (1 - smooth(t, contact - 0.28, 0.28)) ** 2;
export const cameraForShot = (id: string, t: number, start: number) => {
  const p = smooth(t, start, 1.8);
  const close = [
    "billionaire-hook",
    "lawyer",
    "talent",
    "exposure",
    "performance",
    "exactly",
    "procedure",
    "stay",
    "familiar",
    "why",
    "last",
    "worked",
    "internship",
    "partner",
    "fire",
    "manager",
    "trip",
  ].includes(id);
  let position: [number, number, number] = [0, 1.92, 5.6 - 0.1 * p];
  let target: [number, number, number] = [0, 1.12, -0.3];
  if (close) {
    position = [0, 1.65, 3.05 - 0.05 * p];
    target = [0, 1.02, -0.38];
  }
  if (id === "expense") {
    position = [0, 1.9, 3.2 - 0.1 * p];
    target = [0.05, 1.15, 0.1];
  }
  return { position, target };
};
