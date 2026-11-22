import { Easing } from "remotion";
import type { Waypoint } from "../developer/remocn/SimulatedCursor";
import cueSheet from "../../episodes/human-in-the-loop/cues.json";
import timeline from "../../episodes/human-in-the-loop/dialogue-timeline.json";
import plan from "../../episodes/human-in-the-loop/plan.json";

export const { events: e, clicks } = cueSheet;
export const fps = timeline.fps;
export const lines = timeline.lines.map((line) => ({
  ...line,
  first: Math.round(line.words[0].start * fps),
  last: Math.round(line.words[line.words.length - 1].end * fps),
}));
export const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = Easing.bezier(0.25, 0.02, 0.2, 1);
export const enter = (f: number, at: number, length: number) =>
  ease(clamp((f - at) / length));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

export function speakerStrength(frame: number, role: string) {
  return lines
    .filter((line) => line.speaker === role)
    .reduce(
      (value, line) =>
        Math.max(
          value,
          enter(frame, line.first - 5, 8) *
            (1 - enter(frame, line.last + 4, 11)),
        ),
      0,
    );
}

const typeFrames = plan.typeFrames;
const titles = plan.ui.headlines;
const edits = [
  { at: e.prompt, length: typeFrames.prompt },
  { at: e.supervisor, length: typeFrames.supervisor },
  { at: e.human, length: typeFrames.human },
];
const strikes = [e.strikeSenior, e.strikePrompt, e.strikeSupervisor];
export function headlineAt(f: number) {
  let stage = 0;
  for (const edit of edits) if (f >= edit.at) stage++;
  if (stage === 0)
    return { text: titles[0], strike: enter(f, strikes[0], 14), caret: false };
  const { at, length } = edits[stage - 1];
  const age = f - at;
  if (age < 6) {
    const previous = titles[stage - 1];
    return {
      text: previous.slice(0, Math.ceil(previous.length * (1 - age / 6))),
      strike: 1,
      caret: true,
    };
  }
  const letters = Math.ceil(
    titles[stage].length * clamp((age - 5) / (length - 5)),
  );
  return {
    text: titles[stage].slice(0, letters),
    strike: stage < 3 ? enter(f, strikes[stage], 14) : 0,
    caret: age < length + 20,
  };
}

export function profileLayout(f: number) {
  const settle = enter(f, 34, 47);
  const x = mix(0, 54, settle);
  const y = mix(0, 96, settle);
  const nav = mix(120, 77, settle);
  const cover = mix(400, 109, settle);
  return {
    settle,
    x,
    y,
    nav,
    cover,
    w: 1080 - 2 * x,
    h: mix(1920, 447, settle),
    avatar: mix(186, 116, settle),
    titleSize: mix(77, 71, settle),
    fieldY: nav + cover + mix(180, 119, settle),
    companionY: mix(994, 570, settle),
  };
}

export function clickIndex(f: number) {
  return clicks.filter((frame) => frame <= f).length - 1;
}
export function buttonPosition(i: number) {
  const dx = [0, 18, -12, 9, -5];
  const dy = [0, 9, -7, 6, -3];
  return { x: 529 + dx[i % dx.length], y: 638 + dy[i % dy.length] };
}
const target = (i: number) => {
  const { x, y } = buttonPosition(i);
  return { x: x + 244, y: y + 59 };
};
export const pointer: Waypoint[] = [
  { frame: e.button, x: 954, y: 887 },
  { frame: clicks[0] - 6, ...target(0), arc: 28 },
  ...clicks.map((frame, i) => ({ frame, ...target(i), click: true })),
];

export function deskFrame(f: number) {
  const i = clickIndex(f);
  if (i < 0) return 0;
  const interval = (clicks[i + 1] ?? clicks[i] + 6) - clicks[i];
  const phase = Math.min(1, (f - clicks[i]) / interval);
  // The right index finger contacts the mouse in native frames 3 and 4.
  return [3, 4, 5, 6, 7, 0, 1, 2][Math.min(7, Math.floor(phase * 8))];
}
