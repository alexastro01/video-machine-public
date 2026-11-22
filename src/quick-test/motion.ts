import plan from "../../episodes/astra-one-quick-test/plan.json";

export const motion = plan.motion;
export const ui = plan.ui;
export const unit = (x: number) => Math.max(0, Math.min(1, x));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const ease = (t: number, at: number, duration: number) => {
  const p = unit((t - at) / duration);
  return p * p * (3 - 2 * p);
};
export const between = (t: number, from: number, to: number, ramp: number) =>
  ease(t, from, ramp) * (1 - ease(t, to, ramp));

/** Both props use this one take-off, rotation, contact and recovery. */
export const backflip = (t: number, start: number) => {
  const p = unit((t - start) / motion.flight);
  const air = 4 * p * (1 - p);
  const turn = p * p * (3 - 2 * p);
  const load = Math.sin(Math.PI * unit((t - start + 0.14) / 0.14));
  const settle = Math.sin(
    Math.PI * unit((t - start - motion.flight) / motion.recoil),
  );
  return {
    lift: 153 * air,
    pitch: -2 * Math.PI * turn,
    roll: -0.16 * air,
    travel: 23 * Math.sin(2 * Math.PI * p),
    scaleY: 1 - 0.095 * load - 0.1 * settle,
    scaleX: 1 + 0.035 * load + 0.055 * settle,
    air,
    settle,
    contact: unit((t - start - motion.flight) / 0.31),
  };
};

export type Point = { x: number; y: number };
export const point = (x: number, y: number): Point => ({ x, y });
export const move = (a: Point, b: Point, p: number) =>
  point(mix(a.x, b.x, p), mix(a.y, b.y, p));
const path: [number, Point][] = [
  [0, point(675, 596)],
  [motion.firstPay, point(592, 568)],
  [0.79, point(595, 570)],
  [1.3, point(922, 172)],
  [1.86, point(820, 253)],
  [2.63, point(820, 253)],
  [3.5, point(838, 212)],
  [motion.tryButton, point(823, 207)],
  [4.38, point(826, 212)],
  [5.82, point(850, 232)],
  [6.62, point(850, 232)],
  [7.05, point(733, 281)],
  [7.4, point(650, 275)],
  [8.72, point(650, 275)],
  [11.97, point(650, 275)],
  [12.7, point(660, 560)],
  [13.29, point(592, 570)],
  [14.26, point(592, 570)],
  [15.24, point(712, 481)],
  [motion.secondPay - 0.67, point(712, 481)],
  [motion.secondPay - 0.13, point(594, 568)],
  [motion.secondPay, point(594, 568)],
  [motion.secondPay + 0.35, point(640, 625)],
  [motion.anotherAlert - 0.37, point(640, 625)],
  [motion.anotherAlert - 0.01, point(923, 251)],
  [motion.anotherAlert + 0.14, point(938, 245)],
];
export function cursorAt(t: number) {
  for (let i = 1; i < path.length; i++) {
    const [at, target] = path[i];
    if (t <= at)
      return move(
        path[i - 1][1],
        target,
        ease(t, path[i - 1][0], at - path[i - 1][0]),
      );
  }
  return path[path.length - 1][1];
}
