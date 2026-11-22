import raw from "../../episodes/billionaire-body-swap-5/edit.json";
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
export const phoneShot = (id: string) =>
  [
    "face-hook",
    "balance-hook",
    "question-hook",
    "wrong",
    "caps",
    "nibbles",
  ].includes(id);
export const phoneBlockStart = (id: string) =>
  ["wrong", "caps"].includes(id) ? e.wrong : id === "nibbles" ? e.nibbles : 0;
export const cameraForShot = (id: string, t: number, start: number) => {
  let position: [number, number, number] = [
      0,
      1.65,
      3.05 - 0.05 * smooth(t, start, 1.8),
    ],
    target: [number, number, number] = [0, 1.02, -0.38];
  if (phoneShot(id)) {
    position = [0, 1.25, 1.6 - 0.025 * smooth(t, phoneBlockStart(id), 1.2)];
    target = [0, 1.12, 0.58];
  }
  if (["cage", "shoebox", "wheel"].includes(id)) {
    position = [0, 1.75, 4.0 - 0.05 * smooth(t, e.cage, 1.8)];
    target = [0, 0.4, 0];
  }
  if (id === "wheel") {
    position = [0.28, 0.85, 1.75];
    target = [0.28, 0.3, 0];
  }
  if (["security", "payoff", "guard"].includes(id)) {
    position = [0, 1.6, 5.4 - 0.06 * smooth(t, e.security, 1.6)];
    target = [0, 1.1, 0];
  }
  return { position, target };
};
