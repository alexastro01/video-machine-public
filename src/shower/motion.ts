import edit from "../../episodes/shower-singing/edit.json";
import plan from "../../episodes/shower-singing/plan.json";
import features from "../../episodes/shower-singing/features.json";
import { enter, move, unit, mix } from "../ok-motion/motion";

export { edit, plan, features, enter, move, unit, mix };
export const events = edit.events;
export type Phase =
  | "hook"
  | "dry"
  | "reaction"
  | "proof"
  | "tiles"
  | "tail"
  | "fullness"
  | "swap"
  | "absorb"
  | "same"
  | "joke"
  | "loop";
export const phaseAt = (time: number): Phase =>
  ([...edit.shots].reverse().find((s) => time >= s.start)?.id ??
    "hook") as Phase;

export type Point = { x: number; y: number };
export type Segment = {
  from: Point;
  to: Point;
  start: number;
  length: number;
  dx: number;
  dy: number;
};
export function reflectedPath(direction: number[]): Segment[] {
  const bounds = plan.graphics.roomBounds;
  const magnitude = Math.hypot(...direction);
  let dx = direction[0] / magnitude,
    dy = direction[1] / magnitude;
  let from = { ...plan.graphics.source },
    total = 0;
  const segments: Segment[] = [];
  for (let i = 0; i < plan.graphics.reflectionCount; i++) {
    const tx =
      Math.abs(dx) < 1e-9
        ? Infinity
        : ((dx > 0 ? bounds.right : bounds.left) - from.x) / dx;
    const ty =
      Math.abs(dy) < 1e-9
        ? Infinity
        : ((dy > 0 ? bounds.bottom : bounds.top) - from.y) / dy;
    const length = Math.min(tx, ty);
    const to = { x: from.x + dx * length, y: from.y + dy * length };
    segments.push({ from, to, start: total, length, dx, dy });
    total += length;
    if (Math.abs(tx - length) < 1e-5) dx = -dx;
    if (Math.abs(ty - length) < 1e-5) dy = -dy;
    from = to;
  }
  return segments;
}
export const paths = plan.graphics.directions.map(reflectedPath);
export const pathPoint = (segments: Segment[], distance: number) => {
  const s = segments.find(
    (s) => distance >= s.start && distance <= s.start + s.length,
  );
  if (!s) return null;
  const index = segments.indexOf(s);
  return {
    x: s.from.x + s.dx * (distance - s.start),
    y: s.from.y + s.dy * (distance - s.start),
    dx: s.dx,
    dy: s.dy,
    bounces: index,
  };
};
export const reflectionEnergy = (bounces: number, softness: number) =>
  mix(
    plan.graphics.hardReflection,
    plan.graphics.softReflection,
    unit(softness),
  ) ** bounces;
export const impactStrength = (time: number, arrival: number) =>
  time < arrival ? 0 : 1 - enter(time, arrival, 0.22);

export const layoutAt = (time: number) => {
  const normal = { x: 70, y: 300, scale: 1 };
  const centered = (scale: number) => ({
    x: 540 - 470 * scale,
    y: 800 - 500 * scale,
    scale,
  });
  const keys = [
    { at: -0.07, ...centered(0.94) },
    { at: 0.35, ...centered(1.04) },
    { at: events.dryStart, ...centered(1.04) },
    { at: events.dryStart + 0.16, ...centered(0.95) },
    { at: events.reaction, ...centered(0.95) },
    { at: events.reaction + 0.25, ...normal },
    { at: events.proof + 0.45, x: 70, y: 300, scale: 0.7 },
    { at: events.tiles + 0.45, ...normal },
    { at: events.tail + 0.45, x: 70, y: 280, scale: 0.7 },
    { at: events.swap + 0.45, ...normal },
    { at: events.same + 0.45, x: 70, y: 465, scale: 0.45 },
    { at: events.joke + 0.45, ...normal },
  ];
  let prior = keys[0];
  for (const next of keys.slice(1)) {
    const start = Math.max(prior.at, next.at - 0.45);
    if (time < next.at) {
      const p = move(time, start, next.at - start);
      return {
        x: mix(prior.x, next.x, p),
        y: mix(prior.y, next.y, p),
        scale: mix(prior.scale, next.scale, p),
      };
    }
    prior = next;
  }
  return prior;
};
export const softnessAt = (time: number) => move(time, events.swap + 0.1, 0.9);
export const vocalLevelAt = (time: number, start: number) => {
  const at = time - start;
  if (at < 0 || at >= features.vocalDuration) return 0;
  return (
    features.vocalLevels[
      Math.min(features.vocalLevels.length - 1, Math.floor(at * 60))
    ] ?? 0
  );
};
export const poseAt = (
  time: number,
): "sing" | "rest" | "surprised" | "deadpan" => {
  const phase = phaseAt(time);
  if (phase === "reaction" || phase === "swap") return "surprised";
  if (phase === "joke" || phase === "tiles" || phase === "absorb")
    return "deadpan";
  if (phase === "hook" || phase === "dry") {
    if (time < 0.06) return "sing";
    const level = vocalLevelAt(
      time,
      time >= events.dryStart ? events.dryStart : events.wetStart,
    );
    return time < events.wetStart || level > 0.17 ? "sing" : "rest";
  }
  return "rest";
};
export const emissionStarts = (
  time: number,
  pathIndex: number,
  hook: boolean,
) => {
  if (hook) {
    const begins = [events.wetStart, events.dryStart];
    const selected = time >= events.dryStart ? begins[1] : begins[0];
    const start = time < events.wetStart ? -0.4 : selected;
    return Array.from(
      { length: 6 },
      (_, i) => start + i * 0.34 + pathIndex * 0.07,
    );
  }
  const contact = paths[pathIndex][0].length / plan.graphics.pixelsPerSecond;
  const start = events.reflect - contact + pathIndex * 0.11;
  if (time >= events.swap) {
    return Array.from(
      { length: 5 },
      (_, i) => events.swap + 0.1 + i * 0.4 + pathIndex * 0.07,
    );
  }
  return Array.from({ length: 7 }, (_, i) => start + i * 0.4);
};
export const endWipeAt = (time: number) =>
  move(time, events.loop, Math.max(0.1, edit.duration - events.loop - 0.08));
