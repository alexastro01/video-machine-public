import { Easing } from "remotion";
import raw from "../../episodes/ai-review-loop/edit.json";

export const edit = raw;
export const e = edit.events;
export const ui = edit.ui;
export type Role = "opus" | "gemini" | "astra";
export type Speaker = "alex" | Role;
export type CodeState = "original" | "simplified" | "architecture";
export type ActorId = keyof typeof edit.actors;
export const roles: Role[] = ["opus", "gemini", "astra"];
export const roleColors = {
  opus: "#a75235",
  gemini: "#3659ac",
  astra: "#70559b",
};
export const unit = (n: number) => Math.max(0, Math.min(1, n));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const travelEase = Easing.bezier(0.43, 0, 0.24, 1);
export const enter = (t: number, at: number, duration = 0.3) =>
  ease(unit((t - at) / duration));
const windowAt = (t: number, start: number, end: number, ramp: number) =>
  enter(t, start, ramp) * (1 - enter(t, end, ramp));

export function speakerFocusAt(t: number): Record<Speaker, number> {
  const light = { alex: 0, opus: 0, gemini: 0, astra: 0 };
  for (const cue of e.speakerCues) {
    const end = cue.line === "cleaner" ? edit.duration : cue.end + 0.015;
    if (t < cue.start - 0.075 || t > end + 0.12) continue;
    const focus = enter(t, cue.start - 0.075, 0.1) * (1 - enter(t, end, 0.12));
    const speaker = cue.speaker as Speaker;
    light[speaker] = Math.max(light[speaker], focus);
  }
  return light;
}

const states: CodeState[] = ["simplified", "architecture", "original"];
const changes: { at: number; state: CodeState; role: Role }[] = [
  { at: 0, state: "original", role: "astra" },
  { at: e.opusEdit, state: "simplified", role: "opus" },
  { at: e.geminiEdit, state: "architecture", role: "gemini" },
  { at: e.astraEdit, state: "original", role: "astra" },
  ...e.fastHandoffs.map((h, i) => ({
    at: h.contact,
    state: states[i],
    role: roles[i],
  })),
];
export const codeAt = (t: number) => {
  const i = changes.reduce(
    (found, change, index) => (t >= change.at ? index : found),
    -1,
  );
  const current = changes[Math.max(0, i)];
  return {
    current,
    previous: changes[Math.max(0, i - 1)],
    progress: i <= 0 ? 1 : unit((t - current.at) / 0.2),
  };
};

export const comparisonStart = e.loopEnd;
export const comparisonPhase = (t: number) =>
  unit((t - comparisonStart) / (e.compare + 0.22 - comparisonStart));
export const codeOpacity = (t: number) => 1 - unit(comparisonPhase(t) / 0.3);
export const diffOpacity = (t: number) =>
  unit((comparisonPhase(t) - 0.32) / 0.48);
const widths = { original: 938, simplified: 838, architecture: 938 };
const heights = { original: 472, simplified: 405, architecture: 496 };
type FilePose = {
  x: number;
  top: number;
  w: number;
  h: number;
  angle: number;
  compact: number;
};
function deskPose(t: number): FilePose {
  const { current, previous } = codeAt(t);
  const p = enter(t, current.at, 0.28);
  const arrival = enter(t, 0, 0.33);
  return {
    x: 540 - 12 * (1 - arrival),
    top: 130 + 12 * (1 - arrival),
    w: mix(widths[previous.state], widths[current.state], p),
    h: mix(heights[previous.state], heights[current.state], p),
    angle: 0,
    compact: 0,
  };
}
const stops: FilePose[] = [
  { x: 244, top: 554, w: 416, h: 246, angle: -3, compact: 1 },
  { x: 548, top: 535, w: 416, h: 246, angle: 2, compact: 1 },
  { x: 833, top: 552, w: 416, h: 246, angle: -2, compact: 1 },
];
const diffPose: FilePose = {
  x: 540,
  top: 118,
  w: 946,
  h: 594,
  angle: 0,
  compact: 0,
};
function between(a: FilePose, b: FilePose, p: number, lift: number): FilePose {
  if (p <= 0) return a;
  if (p >= 1) return b;
  const arc = Math.sin(Math.PI * p) * lift;
  return {
    x: mix(a.x, b.x, p),
    top: mix(a.top, b.top, p) - arc,
    w: mix(a.w, b.w, p),
    h: mix(a.h, b.h, p),
    angle: mix(a.angle, b.angle, p) + arc * 0.055,
    compact: mix(a.compact, b.compact, p),
  };
}
export const filePoseAt = (t: number): FilePose => {
  if (t < e.loopStart) return deskPose(t);
  if (t >= comparisonStart)
    return between(stops[2], diffPose, travelEase(comparisonPhase(t)), 32);
  const index = e.fastHandoffs.reduce(
    (found, h, index) => (t >= h.at ? index : found),
    -1,
  );
  const handoff = e.fastHandoffs[index];
  const from = index === 0 ? deskPose(e.loopStart) : stops[index - 1];
  const p = travelEase(unit((t - handoff.at) / handoff.duration));
  return between(from, stops[index], p, index === 0 ? 41 : 91);
};

export const cursorAt = (t: number) => {
  const approach = travelEase(
    unit((t - e.hoverStart) / (e.hoverOver - e.hoverStart)),
  );
  const retreat = travelEase(unit((t - e.hoverLeave) / 0.39));
  const x = mix(mix(525, 851, approach), 590, retreat);
  const y = mix(mix(374, 153, approach), 317, retreat);
  return {
    x,
    y,
    opacity: windowAt(t, e.hoverStart, e.hoverLeave + 0.29, 0.16),
    hover: unit((175 - y) / 16) * unit((x - 733) / 20),
  };
};
export const wideAt = (t: number) => t >= e.loopStart - 0.12 && t < e.compare;
const wideFeet = [204, 542, 848];
export type Placement = {
  id: ActorId;
  speaker: Speaker;
  center: number;
  foot: number;
  height: number;
  angle: number;
  gaze: number;
};
export const castAt = (t: number): Placement[] => {
  if (wideAt(t))
    return roles.map((role, i) => {
      const h = e.fastHandoffs[i];
      const reach = enter(t, h.at, 0.2) - enter(t, h.contact + 0.07, 0.32);
      return {
        id: (role + "-present") as ActorId,
        speaker: role,
        center: wideFeet[i],
        foot: 1482,
        height: 637 + 20 * reach,
        angle: -2.4 * reach,
        gaze: 0,
      };
    });
  const gemini = t >= e.gemini_request && t < e.astra_request;
  const astra = t >= e.astra_request && t < e.again;
  const close = windowAt(t, e.gemini_first, e.astra_request - 0.13, 0.24);
  const thinking = t < e.opus_first;
  const deciding = t >= e.hoverStart && t < e.hoverLeave;
  const coffee = (gemini && t >= e.gemini_first) || deciding;
  const role: Role = gemini ? "gemini" : astra ? "astra" : "opus";
  const glance = enter(t, e.glance + 0.02, 0.16);
  const settle = enter(t, e.glance, 0.23) - enter(t, e.glance + 0.55, 0.32);
  const proud = enter(t, e.cleaner, 0.15) - enter(t, e.cleaner + 0.24, 0.25);
  return [
    {
      speaker: "alex",
      id:
        t >= e.hours
          ? "alex-frustrated"
          : coffee
            ? "alex-coffee"
            : "alex-explain",
      center: 228 + 20 * close,
      foot: 1482,
      height: 694 + 128 * close,
      angle: gemini ? -2.8 * settle : deciding ? -1.6 * cursorAt(t).hover : 0,
      gaze: gemini ? glance : 0.17,
    },
    {
      speaker: role,
      id:
        t >= e.cleaner
          ? "opus-proud"
          : thinking
            ? "opus-think"
            : ((role + "-present") as ActorId),
      center: 801,
      foot: 1482,
      height: 739 + 30 * close,
      angle: -2.0 * proud,
      gaze: 0,
    },
  ];
};
export const placedBounds = (p: Placement) => {
  const actor = edit.actors[p.id],
    scale = p.height / actor.bodyHeight;
  return {
    actor,
    scale,
    x: p.center,
    left: p.center + (actor.bounds[0] - actor.pivotX) * scale,
    right: p.center + (actor.bounds[2] - actor.pivotX) * scale,
    top: p.foot - p.height,
  };
};
export function palmAt(t: number, index: number) {
  const p = castAt(t)[index];
  // Tips of the extended palms in the three existing presentation poses.
  const hand = [
    [426, 716],
    [423, 802],
    [445, 704],
  ][index];
  const actor = edit.actors[p.id],
    scale = p.height / actor.bodyHeight;
  const dx = (hand[0] - actor.pivotX) * scale,
    dy = (hand[1] - actor.footY) * scale,
    r = (p.angle * Math.PI) / 180;
  return {
    x: p.center + dx * Math.cos(r) - dy * Math.sin(r),
    y: p.foot + dx * Math.sin(r) + dy * Math.cos(r),
  };
}
