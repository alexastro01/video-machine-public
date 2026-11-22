import cue from "../../episodes/make-no-mistakes/cues.json";
import plan from "../../episodes/make-no-mistakes/plan.json";

export const e = cue.events;
export const stages = cue.stages;
export const lines = cue.lines;
export const request = plan.request;
export const tabs = plan.tabs;
export const stepIds = ["front", "token", "gpu", "stream", "database"] as const;
export type Step = (typeof stepIds)[number];
export type SceneName = keyof typeof stages;
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const progress = (f: number, at: number, frames: number) =>
  clamp((f - at) / frames);
export const ease = (f: number, at: number, frames: number) => {
  const t = progress(f, at, frames);
  return t * t * (3 - 2 * t);
};
export const arrive = (f: number, at: number, frames = 16) =>
  1 - Math.pow(1 - progress(f, at, frames), 3);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const sceneAt = (f: number): SceneName =>
  (Object.keys(stages) as SceneName[]).filter((id) => stages[id] <= f).at(-1) ??
  "hook";
export const recapFrames = [e.rFront, e.rTokens, e.rGpu, e.rStream, e.rDb];
