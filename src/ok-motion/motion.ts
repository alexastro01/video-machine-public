import { Easing } from "remotion";
import saved from "../../episodes/ok-message-motion/edit.json";
import plan from "../../episodes/ok-message-motion/motion-plan.json";
export type MotionEdit = typeof saved;
export const edit = saved;
export const cues = edit.events;
export const curves = {
  out: Easing.bezier(0.23, 1, 0.32, 1),
  move: Easing.bezier(0.77, 0, 0.175, 1),
};
export const unit = (v: number) => Math.max(0, Math.min(1, v));
export const enter = (t: number, start: number, duration = 0.25) =>
  curves.out(unit((t - start) / duration));
export const move = (t: number, start: number, duration = 0.5) =>
  curves.move(unit((t - start) / duration));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const motionTiming = plan.motionTiming;
export const emailRoute = "M390 900 C390 1030 560 890 650 1020";
export const emailPositionAt = (progress: number) => {
  const p = unit(progress),
    q = 1 - p;
  return {
    x: q ** 3 * 390 + 3 * q * q * p * 390 + 3 * q * p * p * 560 + p ** 3 * 650,
    y:
      q ** 3 * 900 + 3 * q * q * p * 1030 + 3 * q * p * p * 890 + p ** 3 * 1020,
  };
};
export const voiceEmphasisAt = (time: number, events: MotionEdit["events"]) =>
  enter(time, events.imagined, motionTiming.toneAttackSeconds) *
  (1 - enter(time, events.imaginedEnd, motionTiming.toneReleaseSeconds));
export const tapFeedbackAt = (time: number, approachStart: number) => {
  const contact = approachStart + motionTiming.tapApproachSeconds,
    ripple = unit((time - contact) / motionTiming.tapRippleSeconds);
  return {
    travel: move(time, approachStart, motionTiming.tapApproachSeconds),
    press:
      enter(time, contact, motionTiming.pressInSeconds) *
      (1 -
        enter(
          time,
          contact + motionTiming.pressHoldSeconds,
          motionTiming.pressOutSeconds,
        )),
    ripple,
    rippleOpacity: time < contact ? 0 : 1 - ripple,
  };
};
export const stageAt = (t: number, model: MotionEdit = edit) =>
  [...model.shots].reverse().find((s) => t >= s.start)?.id ?? "hook";
type BubbleLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  font: number;
  opacity: number;
};
const start: BubbleLayout = {
  x: 60,
  y: 638,
  width: 244,
  height: 154,
  font: 91,
  opacity: 1,
};
const bubbleKeys = (cues: MotionEdit["events"]) => [
  { at: 0, ...start },
  {
    at: cues.introPush + 0.55,
    x: 110,
    y: 390,
    width: 570,
    height: 290,
    font: 190,
    opacity: 1,
  },
  {
    at: cues.reading + 0.4,
    x: 100,
    y: 430,
    width: 880,
    height: 350,
    font: 238,
    opacity: 1,
  },
  {
    at: cues.cues + 0.4,
    x: 285,
    y: 350,
    width: 510,
    height: 270,
    font: 165,
    opacity: 1,
  },
  {
    at: cues.argument + 0.28,
    x: 65,
    y: 300,
    width: 390,
    height: 220,
    font: 135,
    opacity: 1,
  },
  {
    at: cues.study + 0.2,
    x: 65,
    y: 300,
    width: 390,
    height: 220,
    font: 135,
    opacity: 0,
  },
  {
    at: cues.reconsider + 0.4,
    x: 270,
    y: 300,
    width: 540,
    height: 280,
    font: 175,
    opacity: 1,
  },
  {
    at: cues.sender + 0.15,
    x: 270,
    y: 300,
    width: 540,
    height: 280,
    font: 175,
    opacity: 0,
  },
  { at: cues.payoff + 0.45, ...start },
];
export const bubbleAt = (
  time: number,
  model: MotionEdit = edit,
): BubbleLayout => {
  const keys = bubbleKeys(model.events);
  let last = keys[0];
  for (const next of keys.slice(1)) {
    const begin = Math.max(last.at, next.at - 0.55);
    if (time < next.at) {
      const p = move(time, begin, next.at - begin);
      return {
        x: mix(last.x, next.x, p),
        y: mix(last.y, next.y, p),
        width: mix(last.width, next.width, p),
        height: mix(last.height, next.height, p),
        font: mix(last.font, next.font, p),
        opacity: mix(last.opacity, next.opacity, p),
      };
    }
    last = next;
  }
  return last;
};
export const finiteFrame = (
  time: number,
  start: number,
  count = 12,
  frameMs = 100,
) =>
  Math.min(
    count - 1,
    Math.max(0, Math.floor(((time - start) * 1000) / frameMs)),
  );
export const visiblePhrase = (
  text: string,
  time: number,
  start: number,
  duration: number,
) => {
  const characters = Array.from(text);
  return characters
    .slice(0, Math.round(characters.length * unit((time - start) / duration)))
    .join("");
};
