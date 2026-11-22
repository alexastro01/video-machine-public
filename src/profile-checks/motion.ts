import edit from "../../episodes/profile-checks/edit.json";
import plan from "../../episodes/profile-checks/plan.json";
import { Easing } from "remotion";
import { enter, move, mix, unit } from "../ok-motion/motion";
export { edit, plan, enter, move, mix, unit };
export const e = edit.events;
const panelEase = Easing.bezier(0.4, 0, 0.6, 1);
export const endingAt = (t: number) => {
  const smooth = (start: number, duration: number) =>
    panelEase(unit((t - start) / duration));
  return {
    return: smooth(e.loop, plan.ending.returnDuration),
    outgoing: smooth(e.loop, plan.ending.outgoingDuration),
    incoming: smooth(
      e.loop + plan.ending.incomingDelay,
      plan.ending.incomingDuration,
    ),
    character: smooth(
      e.loop + plan.ending.characterDelay,
      plan.ending.characterDuration,
    ),
  };
};
export const phaseAt = (time: number) =>
  [...edit.shots].reverse().find((s) => time >= s.start)?.id ?? "hook";
export const visible = (t: number, start: number, end: number, d = 0.2) =>
  enter(t, start, d) * (1 - enter(t, end, d));
type Panel = { x: number; y: number; w: number; h: number; r: number };
const key = (
  at: number,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  duration = 0.5,
) => ({ at, x, y, w, h, r, duration });
export const panelAt = (t: number): Panel => {
  const keys = [
    key(0, 108, 362, 864, 678, 64),
    key(0.4, 90, 340, 900, 700, 70),
    key(e.closePress, 90, 340, 900, 700, 70),
    key(e.closePress + 0.48, 448, 550, 184, 184, 44),
    key(e.notice + 0.36, 90, 460, 900, 244, 56),
    key(e.chat - 0.05, 90, 460, 900, 244, 56),
    key(e.chat + 0.43, 90, 580, 900, 300, 60),
    key(e.typing - 0.12, 90, 580, 900, 300, 60),
    key(e.typing + 0.28, 90, 550, 370, 174, 66),
    key(e.escape, 90, 550, 370, 174, 66),
    key(e.escape + 0.45, 90, 420, 900, 500, 60),
    key(e.incoming, 90, 420, 900, 500, 60),
    key(e.incoming + 0.4, 90, 340, 900, 700, 70),
    key(e.mutual, 90, 340, 900, 700, 70),
    key(e.mutual + 0.48, 70, 380, 940, 650, 70),
    key(e.loop, 70, 380, 940, 650, 70),
    key(
      e.loop + plan.ending.returnDuration,
      108,
      362,
      864,
      678,
      64,
      plan.ending.returnDuration,
    ),
    key(e.end - 1 / edit.fps, 108, 362, 864, 678, 64),
  ];
  let previous = keys[0];
  for (const next of keys.slice(1)) {
    if (t < next.at) {
      const duration = Math.min(next.duration, next.at - previous.at);
      const p = panelEase(unit((t - next.at + duration) / duration));
      return {
        x: mix(previous.x, next.x, p),
        y: mix(previous.y, next.y, p),
        w: mix(previous.w, next.w, p),
        h: mix(previous.h, next.h, p),
        r: mix(previous.r, next.r, p),
      };
    }
    previous = next;
  }
  return previous;
};
export const draftAt = (t: number) => {
  const first = plan.ui.firstDraft,
    second = plan.ui.secondDraft;
  if (t < e.delete1) {
    const p = unit((t - e.draft1) / 0.76);
    return first.slice(0, Math.floor(first.length * p));
  }
  if (t < e.research) {
    return first.slice(
      0,
      Math.round(first.length * (1 - move(t, e.delete1, 0.22))),
    );
  }
  if (t < e.delete2) {
    const p = unit((t - e.draft2) / 0.36);
    return second.slice(0, Math.floor(second.length * p));
  }
  return second.slice(
    0,
    Math.round(second.length * (1 - move(t, e.delete2, 0.2))),
  );
};
export const contactAt = (
  t: number,
  contact: number,
  x: number,
  y: number,
) => ({
  x: mix(x + 100, x, move(t, contact - 0.25, 0.25)),
  y: mix(y + 130, y, move(t, contact - 0.25, 0.25)),
  opacity: visible(t, contact - 0.25, contact + 0.14, 0.1),
  ripple: unit((t - contact) / 0.3),
  rippleOpacity: t < contact ? 0 : 1 - unit((t - contact) / 0.3),
});
export const planeAt = (t: number) => {
  const p = move(t, e.plane, 0.58),
    q = 1 - p;
  return {
    x: q ** 2 * 170 + 2 * q * p * 340 + p ** 2 * 730,
    y: q ** 2 * 320 + 2 * q * p * 115 + p ** 2 * 230,
  };
};
