import { Easing } from "remotion";
import raw from "../../episodes/full-stack-subscriber/edit.json";

export const edit = raw;
export const e = edit.events;
export const ui = edit.ui;
export type Role = "opus" | "astra" | "gemini";
export type ActorId = keyof typeof edit.actors;
export const roles: Role[] = ["opus", "astra", "gemini"];
export const unit = (v: number) => Math.max(0, Math.min(1, v));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const travel = Easing.bezier(0.65, 0, 0.2, 1);
export const enter = (t: number, at: number, d = 0.3) =>
  ease(unit((t - at) / d));
export const move = (t: number, at: number, d = 0.45) =>
  travel(unit((t - at) / d));
export const bump = (t: number, at: number, d = 0.25) =>
  Math.sin(Math.PI * unit((t - at) / d));
export const roleChanges: { at: number; role: Role }[] = [
  { at: 0, role: "opus" },
  { at: e.ask_astra, role: "astra" },
  { at: e.ask_gemini, role: "gemini" },
  { at: e.clock, role: "astra" },
  { at: e.trial, role: "opus" },
  { at: e.upgrade, role: "gemini" },
  { at: e.compare, role: "astra" },
  { at: e.app_check, role: "opus" },
  { at: e.cv_question, role: "gemini" },
];
export const roleStateAt = (t: number) =>
  [...roleChanges].reverse().find((x) => t >= x.at)!;
export const phaseAt = (t: number) => {
  if (t >= e.cv_question) return "cv";
  if (t >= e.app_check) return "app";
  if (t >= e.inventory) return "inventory";
  if (t >= e.compare) return "compare";
  if (t >= e.upgrade) return "billing";
  if (t >= e.trial) return "trial";
  if (t >= e.clock) return "clock";
  return "hook";
};
export const quotaAt = (role: Role, t: number) => {
  const first = {
    opus: e.limit_opus,
    astra: e.limit_astra,
    gemini: e.limit_gemini,
  }[role];
  if (t < e.paid) return 1 - enter(t, first, 0.25);
  if (t < e.compare) return enter(t, e.paid, 0.3);
  return 1 - move(t, e.compare, e.limit_again - e.compare + 0.15);
};
export const cvProgressAt = (t: number) => enter(t, e.cv_question, 0.55);
export const appBodyOpacityAt = (t: number) => {
  if (t < e.clock) return 1;
  if (t < e.app_check) return 1 - enter(t, e.clock, 0.18);
  return enter(t, e.app_check, 0.25);
};
export const closeAt = (t: number) => {
  const line = edit.lines.find((l) => l.id === "limit_again")!;
  return (
    enter(t, line.start + 0.1, 0.32) * (1 - enter(t, line.end + 0.02, 0.3))
  );
};
export const assistantLayoutAt = (t: number) => {
  const state = roleStateAt(t),
    close = closeAt(t);
  const id = (
    state.role === "opus" && t >= e.app_check
      ? "opus-think"
      : `${state.role}-present`
  ) as ActorId;
  const actor = edit.actors[id];
  const bodyScale = 460 / actor.bodyHeight;
  const portraitScale = Math.min(
    1420 / actor.bodyHeight,
    860 / (actor.bounds[2] - actor.bounds[0]),
  );
  const scale = mix(bodyScale, portraitScale, close);
  return {
    role: state.role,
    id,
    close,
    x: mix(570, 80, close),
    width: mix(430, 920, close),
    scale,
    left: mix(
      215 - actor.pivotX * bodyScale,
      460 - ((actor.bounds[0] + actor.bounds[2]) / 2) * portraitScale,
      close,
    ),
    top: mix(
      480 - actor.footY * bodyScale,
      24 - actor.bounds[1] * portraitScale,
      close,
    ),
    arrival: enter(t, state.at, 0.22),
  };
};
export const nodFrameAt = (t: number): "alex-cv-neutral" | "alex-cv-nod" =>
  t >= e.nodDown && t < e.nodUp ? "alex-cv-nod" : "alex-cv-neutral";
export const cvTitleAt = (t: number) => ({
  prefix: enter(t, e.cvPrefix, 0.22),
  before: enter(t, e.cvDeveloper, 0.22),
  morph: move(t, e.morph, 0.6),
  after: enter(t, e.morph + 0.08, 0.5),
});
export const interactions = [
  { id: "app", at: 0, x: 540, y: 540 },
  { id: "astra", at: e.ask_astra, x: 540, y: 822 },
  { id: "gemini", at: e.ask_gemini, x: 847, y: 822 },
  { id: "clock", at: e.clockMove, x: 811, y: 387 },
  { id: "trial", at: e.trialSubmit, x: 765, y: 540 },
  ...e.payments.map((at, i) => ({
    id: `payment-${i}`,
    at,
    x: 250 + i * 280,
    y: 585,
  })),
].sort((a, b) => a.at - b.at);
export const pointerAt = (t: number) => {
  const next = interactions.find((a) => t <= a.at) ?? interactions.at(-1)!;
  const index = interactions.indexOf(next),
    previous = interactions[Math.max(0, index - 1)];
  const duration = Math.min(0.22, next.at - previous.at) || 0.22;
  const p = move(t, next.at - duration, duration);
  const nearest = [...interactions].sort(
    (a, b) => Math.abs(t - a.at) - Math.abs(t - b.at),
  )[0];
  return {
    x: mix(previous.x, next.x, p),
    y: mix(previous.y, next.y, p),
    opacity: Math.abs(t - nearest.at) < 0.34 ? 1 : 0,
    press: bump(t, nearest.at, 0.18),
    at: nearest.at,
  };
};
