import clock from "../../episodes/make-no-mistakes-story/clock.json";

import plan from "../../episodes/make-no-mistakes-story/plan.json";

export const screen = plan.screen;
export const requestId = plan.request;
export const promptTask = plan.prompt.slice(0, plan.prompt.indexOf(".") + 1);
export const promptEnding = plan.prompt.slice(promptTask.length).trim();
export const e = clock.events;
export const st = clock.stages;
export const total = clock.frames;
export const words = clock.words;
export const phrases = clock.phrases;
export const poses = clock.poses;
export const mouth = clock.mouth;
export type Stage = keyof typeof st;
const ordered = Object.entries(st) as [Stage, number][];
export const stageAt = (f: number): Stage =>
  ordered.filter(([, start]) => f >= start).at(-1)?.[0] ?? "hook";
export const clamp = (v: number) => Math.min(1, Math.max(0, v));
export const phase = (f: number, start: number, length: number) =>
  clamp((f - start) / Math.max(1, length));
export const ease = (f: number, start: number, length: number) => {
  const t = phase(f, start, length);
  return t * t * (3 - 2 * t);
};
export const lerp = (from: number, to: number, t: number) =>
  from + (to - from) * t;
export const arc = (f: number, start: number, length: number) =>
  Math.sin(Math.PI * phase(f, start, length));
export const palette = {
  ink: "#2e223e",
  sub: "#6d5b7e",
  violet: "#7151a5",
  wine: "#482d69",
  line: "#b9a9cb",
  purple: "#b49ed8",
  light: "#f5eef8",
  paper: "#fffcf5",
  sun: "#f2c96e",
  green: "#22725b",
  mint: "#d5eee2",
  red: "#b84e5b",
  pink: "#f5dee0",
};

export function talkingLift(f: number) {
  const i = words.findIndex((w) => w.start * 60 > f);
  const index = (i < 0 ? words.length : i) - 1;
  if (index < 0) return 0;
  const word = words[index];
  const start = Math.ceil(word.start * 60);
  const next = Math.ceil((words[index + 1]?.start ?? word.end + 0.2) * 60);
  const length = Math.min(
    19,
    next - start,
    Math.max(5, Math.ceil((word.end - word.start) * 60) + 3),
  );
  const t = (f - start) / Math.max(1, length);
  if (t <= 0 || t >= 1) return 0;
  const amount = Math.min(12, 4 + length * 0.52);
  return (
    amount *
    (t < 0.36
      ? Math.sin((Math.PI * t) / 0.72)
      : (1 + Math.cos((Math.PI * (t - 0.36)) / 0.64)) / 2)
  );
}
