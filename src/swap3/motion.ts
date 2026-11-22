import raw from "../../episodes/billionaire-body-swap-3/edit.json";
import type { Plan } from "../paid/types";
export const edit = raw as Plan;
export const ui = raw.ui;
export const e = edit.events;
export const clamp = (p: number) => Math.max(0, Math.min(1, p));
export const smooth = (t: number, start: number, duration: number) => {
  const p = clamp((t - start) / duration);
  return p * p * (3 - 2 * p);
};
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const shotAt = (t: number) =>
  [...edit.shots].reverse().find((s) => t >= s.start - 1e-8) ?? edit.shots[0];
export const nativeFrame = (t: number, start: number, count = 16) =>
  Math.max(0, Math.min(count - 1, Math.floor((t - start + 1e-7) * 10)));
export const land = (t: number, contact: number, height = 0.58) => {
  const p = clamp((t - contact + 0.28) / 0.28);
  return (
    height * (1 - p) ** 2 +
    Math.sin(clamp((t - contact) / 0.16) * Math.PI) * 0.012
  );
};
export const phoneReveal = (t: number) => t >= e.reveal && t < e.reaction;
