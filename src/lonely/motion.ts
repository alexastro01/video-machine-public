import edit from "../../episodes/lonely-around-people/edit.json";
import plan from "../../episodes/lonely-around-people/plan.json";
import { enter, move, mix, unit } from "../ok-motion/motion";
export { edit, plan, enter, move, mix, unit };
export const e = edit.events;
export const diagram = plan.diagram;
export const connectionShineAt = (time: number) => ({
  opacity:
    enter(time, e.feelConnection, 0.12) *
    (1 -
      enter(time, e.feelConnectionEnd + diagram.shineTailSeconds - 0.18, 0.18)),
  progress: move(
    time,
    e.feelConnection,
    e.feelConnectionEnd - e.feelConnection + diagram.shineTailSeconds,
  ),
});
export const phaseAt = (time: number) =>
  [...edit.shots].reverse().find((s) => time >= s.start)?.id ?? "hook";
export const hookAt = (time: number) => {
  const word =
    [...edit.lines.hook.words].reverse().find((w) => time >= w.start) ??
    edit.lines.hook.words[0];
  const age = time - e.alone;
  return {
    word: word.text.replace("?", "").toUpperCase(),
    opacity: 1 - enter(time, e.included, 0.25),
    scale: 1 + 0.1 * (1 - move(time, word.start, 0.14)),
    shakeX:
      age >= 0 && age < 0.32
        ? Math.sin(age * 92) * 18 * (1 - age / 0.32) ** 2
        : 0,
    dark: (time >= e.alone ? 1 : 0) * (1 - enter(time, e.included, 0.48)),
  };
};
export const crowdPoints = [
  [185, 820],
  [895, 820],
  [135, 1060],
  [945, 1060],
  [200, 1305],
  [880, 1305],
  [350, 760],
  [730, 760],
  [335, 1470],
  [745, 1470],
  [125, 1500],
  [955, 1500],
];
const key = (
  at: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  tail: number,
) => ({ at, x, y, w, h, r, tail });
export const bubbleAt = (time: number) => {
  const keys = [
    key(e.included, 380, 615, 320, 8, 4, 0),
    key(e.included + 0.42, 220, 480, 640, 190, 65, 18),
    key(
      e.gap + 0.5,
      diagram.leftX,
      diagram.centerY - diagram.barHeight / 2,
      diagram.rightX - diagram.leftX,
      diagram.barHeight,
      diagram.barHeight / 2,
      0,
    ),
    key(
      e.fine,
      diagram.leftX,
      diagram.centerY - diagram.barHeight / 2,
      diagram.rightX - diagram.leftX,
      diagram.barHeight,
      diagram.barHeight / 2,
      0,
    ),
    key(e.fine + 0.4, 380, 600, 600, 190, 58, 20),
    key(e.trust + 0.4, 300, 620, 680, 220, 62, 20),
    key(e.send, 300, 620, 680, 220, 62, 20),
    key(e.sent, 120, 315, 700, 185, 60, 20),
    key(e.payoff + 0.3, 100, 315, 600, 185, 60, 20),
  ];
  let prior = keys[0];
  for (const next of keys.slice(1)) {
    if (time < next.at) {
      const duration = next.h === diagram.barHeight && prior.h > 30 ? 0.54 : 0.42;
      const start = Math.max(prior.at, next.at - duration);
      const p = move(time, start, next.at - start);
      return Object.fromEntries(
        ["x", "y", "w", "h", "r", "tail"].map((k) => [
          k,
          mix(prior[k as keyof typeof prior], next[k as keyof typeof next], p),
        ]),
      ) as {
        x: number;
        y: number;
        w: number;
        h: number;
        r: number;
        tail: number;
      };
    }
    prior = next;
  }
  return prior;
};
export const bubblePath = (
  w: number,
  h: number,
  radius: number,
  tail: number,
) => {
  const r = Math.min(radius, h / 2, w / 2),
    tx = w * 0.2;
  return `M${r} 0 H${w - r} Q${w} 0 ${w} ${r} V${h - r} Q${w} ${h} ${w - r} ${h} H${tx + tail} L${tx - tail * 0.2} ${h + tail} L${tx} ${h} H${r} Q0 ${h} 0 ${h - r} V${r} Q0 0 ${r} 0 Z`;
};
export const gapAmount = (t: number) =>
  enter(t, e.gapWord, 0.25) * (1 - enter(t, e.fine, 0.32));
export const pointerAt = (t: number) => {
  const p = move(t, e.send - 0.36, 0.36);
  return {
    x: mix(1010, 940, p),
    y: mix(1100, 900, p),
    opacity:
      enter(t, e.send - 0.36, 0.08) * (1 - enter(t, e.send + 0.13, 0.12)),
  };
};
export const tapAt = (t: number) => ({
  ring: t < e.send ? 0 : enter(t, e.send, 0.3),
  opacity: t < e.send ? 0 : 1 - enter(t, e.send, 0.3),
  scale: 1 - 0.1 * enter(t, e.send, 0.06) * (1 - enter(t, e.send + 0.06, 0.12)),
});
export const honestTextAt = (t: number) =>
  edit.lines.honest.words
    .slice(1)
    .filter((w) => t >= w.start)
    .map((w) => w.text)
    .join(" ");
export const replyTextAt = (t: number) =>
  edit.lines.snacks.words
    .filter((w) => t >= w.start)
    .map((w) => w.text)
    .join(" ");
