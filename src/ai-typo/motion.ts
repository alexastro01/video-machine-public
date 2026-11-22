import { Easing } from "remotion";
import raw from "../../episodes/ai-typo/edit.json";
export const edit = raw;
export const e = edit.events;
export const ui = edit.ui;
export const unit = (x: number) => Math.max(0, Math.min(1, x));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const out = Easing.bezier(0.23, 1, 0.32, 1);
const travel = Easing.bezier(0.77, 0, 0.175, 1);
export const enter = (t: number, at: number, d = 0.3) =>
  out(unit((t - at) / d));
export const move = (t: number, at: number, d = 0.5) =>
  travel(unit((t - at) / d));
export const phaseAt = (t: number) =>
  [...edit.shots].reverse().find((s) => t >= s.start)?.id ?? "hook";
export const countAt = (t: number) => {
  const keys = [
    [e.counter1, ui.initialCount],
    [e.counter12, ui.componentsCount],
    [e.counter34, ui.frameworkCount],
    [e.counter87, ui.finalCount],
  ];
  let n = 0;
  for (const [at, value] of keys) {
    if (t < at) break;
    const p = enter(t, at, 0.46);
    if (p < 1) return Math.min(ui.finalCount, Math.round(mix(n, value, p)));
    n = value;
  }
  return n;
};
export const aiCloseAt = (t: number) =>
  Math.max(
    ...["architecture", "complete"].map((id) => {
      const l = edit.lines.find((x) => x.id === id)!;
      return enter(t, l.start, 0.32) * (1 - enter(t, l.end - 0.06, 0.28));
    }),
  );
export const buttonAt = (t: number) => {
  const p = move(t, e.typoReveal, 0.46);
  return {
    x: mix(180, 105, p),
    y: mix(370, 200, p),
    width: mix(520, 710, p),
    height: mix(108, 168, p),
    font: mix(65, 100, p),
    opacity: t < e.preview ? 1 : enter(t, e.typoReveal, 0.16),
    text: ui.typo,
  };
};
export const actorPoseAt = (t: number) => ({
  alex:
    t < e.files
      ? "alex-coffee"
      : t >= e.typoReveal
        ? "alex-frustrated"
        : "alex-explain",
  opus:
    t >= e.complete
      ? "opus-proud"
      : ["hook", "files", "framework", "us", "letters", "verify"].includes(
            phaseAt(t),
          )
        ? "opus-think"
        : "opus-present",
});

export const opusLayoutAt = (t: number) => {
  const close = aiCloseAt(t);
  const id = actorPoseAt(t).opus as keyof typeof edit.actors;
  const a = edit.actors[id];
  const bodyScale = 545 / a.bodyHeight;
  const portraitScale = Math.min(
    (1.18 * 1400) / a.bodyHeight,
    860 / (a.bounds[2] - a.bounds[0]),
  );
  const scale = mix(bodyScale, portraitScale, close);
  // Interpolate complete endpoint transforms. Using the changing scale inside
  // the body endpoint sends the head through the top edge during a zoom.
  const left = mix(
    212 - a.pivotX * bodyScale,
    460 - ((a.bounds[0] + a.bounds[2]) / 2) * portraitScale,
    close,
  );
  const top = mix(
    580 - a.footY * bodyScale,
    28 - a.bounds[1] * portraitScale,
    close,
  );
  return {
    id,
    close,
    x: mix(565, 80, close),
    width: mix(425, 920, close),
    scale,
    left,
    top,
  };
};
