import plan from "../../episodes/rip/edit.json";
import timeline from "../../episodes/rip/timeline.json";

export { plan, timeline };
export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export function ramp(f: number, a: number, b: number) {
  return clamp01((f - a) / (b - a));
}
export function smooth(f: number, a: number, b: number) {
  const t = ramp(f, a, b);
  return t * t * (3 - 2 * t);
}
export function pulse(f: number, start: number, length: number) {
  return Math.sin(Math.PI * ramp(f, start, start + length));
}
export function pop(f: number, start: number) {
  return 1 + 0.15 * pulse(f, start, 18);
}
// A fast entry with one overshoot, then an exact rest position.
export function land(f: number, start: number, distance: number) {
  if (f < start) return -distance * (1 - ramp(f, start - 12, start) ** 2);
  if (f < start + 6) return 9 * pulse(f, start, 6);
  if (f < start + 14) return -5 * pulse(f, start + 6, 8);
  return 0;
}
export function typeAt(text: string, f: number, limits: number[]) {
  return text.slice(0, Math.ceil(text.length * ramp(f, limits[0], limits[1])));
}
export const lineAt = (f: number) =>
  timeline.lines.find(
    (line) => f >= line.frame && f < line.frame + line.mouth.length,
  );

export function claimAt(f: number) {
  const { posts, cues } = plan;
  if (f < cues.draft) return posts.article;
  if (f < cues.replaceType[0]) return typeAt(posts.draft, f, cues.draftType);
  return posts.replace.replace(
    plan.wordEdit.to,
    typeAt(plan.wordEdit.to, f, cues.replaceType),
  );
}
export const publishedAt = (f: number) =>
  f < plan.cues.draft || f >= plan.cues.publish[0];
export const artPath = (name: string) =>
  "episodes/rip/build-failed/art/" + name;
