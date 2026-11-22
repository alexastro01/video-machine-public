import edit from "../../episodes/start-the-task/revisions/v2-before-editorial/edit.json";

export const e = edit.events;
export { edit };
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const move = (t: number, at: number, duration: number) => {
  const p = clamp((t - at) / duration);
  return 1 - (1 - p) ** 3;
};
export const smooth = (t: number, at: number, duration: number) => {
  const p = clamp((t - at) / duration);
  return p * p * (3 - 2 * p);
};
export const span = (t: number, start: number, end: number) =>
  t >= start && t < end;
export const graphicsOpacity = (t: number) =>
  smooth(t, e.graphics, 0.48) * (1 - smooth(t, e.returnDesk, 0.55));
export const pointerAt = (t: number) => {
  const p = move(t, e.open - 0.28, 0.28);
  return {
    x: mix(930, 610, p),
    y: mix(1190, 855, p),
    press: smooth(t, e.open, 0.08) * (1 - smooth(t, e.open + 0.12, 0.12)),
    opacity: move(t, e.open - 0.3, 0.12) * (1 - move(t, e.file + 0.2, 0.2)),
  };
};
export const typedSentence = "I can start with a rough draft.";
export const sentenceAt = (t: number) =>
  typedSentence.slice(
    0,
    Math.floor(clamp((t - e.rough) / 0.78) * typedSentence.length),
  );
export const typingFrame = (t: number) =>
  Math.min(11, Math.max(0, Math.floor((t - e.typing + 1e-7) / 0.1)));
export const worldCamera = (t: number) => {
  const opening = 1 - move(t, -0.04, 0.8);
  const coffee = smooth(t, e.coffeeIn, 0.18) * (1 - smooth(t, e.still, 0.18));
  const problem = smooth(t, e.still, 0.35) * (1 - smooth(t, e.starter, 0.5));
  const end = smooth(t, e.returnDesk, 0.55);
  const cups = smooth(t, e.coffeeEnd - 0.2, 0.4);
  return {
    position: [
      mix(0, 0.25, end) + cups * 0.12 + coffee * 0.12 - opening * 0.4,
      2.35 - end * 0.18 + opening * 0.28,
      7.4 - problem * 0.6 - cups * 0.65 - coffee * 0.42 - opening * 1.15,
    ] as [number, number, number],
    target: [0.02 + cups * 0.2, 1.52 - end * 0.11, 0.18] as [
      number,
      number,
      number,
    ],
  };
};
