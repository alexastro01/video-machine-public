import type { FlatEdit } from "./schema";
import { between, lerp, smooth } from "./art";

export type Hand =
  | "open"
  | "point"
  | "thumb"
  | "palm"
  | "fist"
  | "cover"
  | "pinch"
  | "slam"
  | "press"
  | "write";
export type Mood =
  | "bright"
  | "thinking"
  | "wry"
  | "doubt"
  | "happy"
  | "startled"
  | "tired"
  | "focused";
type Arm = [number, number, number, number, number, Hand];
type Pose = {
  l: Arm;
  r: Arm;
  head: number;
  lean: number;
  shoulder: number;
  gazeX: number;
  gazeY: number;
  mood: Mood;
};
const rest: Arm = [162, 688, 264, 731, -24, "fist"];
const palm: Arm = [683, 669, 771, 535, 55, "palm"];
const point: Arm = [715, 521, 683, 358, -19, "point"];
const leftOpen: Arm = [163, 602, 89, 485, 43, "palm"];
const base: Pose = {
  l: rest,
  r: palm,
  head: -2,
  lean: 0,
  shoulder: 0,
  gazeX: 3,
  gazeY: -4,
  mood: "bright",
};
const p = (change: Partial<Pose>): Pose => ({ ...base, ...change });
export const poses: Record<string, Pose> = {
  point: p({ r: point, head: -6, gazeY: -11, lean: -1 }),
  explain: p({
    l: [168, 674, 267, 651, -57, "open"],
    r: palm,
    head: 3,
    gazeX: 1,
  }),
  type: p({
    l: [173, 692, 332, 707, 105, "pinch"],
    r: [691, 675, 601, 694, 100, "press"],
    head: 5,
    gazeY: 6,
    mood: "focused",
  }),
  anticipate: p({
    l: [181, 636, 305, 610, -30, "fist"],
    r: [669, 633, 568, 605, 4, "fist"],
    shoulder: -13,
    mood: "thinking",
  }),
  thumb: p({
    l: rest,
    r: [690, 615, 680, 475, -9, "thumb"],
    head: -3,
    mood: "happy",
    gazeX: 1,
  }),
  shrug: p({
    l: leftOpen,
    r: palm,
    head: 6,
    shoulder: -21,
    gazeX: -3,
    mood: "wry",
  }),
  stop: p({
    l: rest,
    r: [715, 627, 712, 453, -4, "open"],
    head: -4,
    lean: -1,
    mood: "doubt",
  }),
  quote: p({
    l: [176, 614, 234, 488, -18, "pinch"],
    r: [695, 600, 662, 462, 6, "pinch"],
    head: 2,
    mood: "thinking",
  }),
  question: p({
    l: leftOpen,
    r: [652, 542, 525, 389, -51, "pinch"],
    head: 9,
    gazeX: -3,
    gazeY: -8,
    mood: "thinking",
  }),
  dismiss: p({
    l: rest,
    r: [707, 553, 747, 405, 25, "open"],
    head: -6,
    gazeX: -4,
    mood: "wry",
  }),
  scan: p({
    l: [157, 660, 296, 672, -35, "fist"],
    r: [691, 409, 526, 230, -63, "palm"],
    head: -7,
    lean: 1,
    gazeY: -10,
    mood: "focused",
  }),
  read: p({
    l: [158, 663, 282, 587, -55, "palm"],
    r: [674, 610, 588, 468, -41, "point"],
    head: 1,
    gazeX: -2,
    mood: "focused",
  }),
  look: p({
    l: rest,
    r: [688, 617, 716, 481, -13, "pinch"],
    head: -4,
    gazeY: -12,
    mood: "thinking",
  }),
  present: p({
    l: [172, 669, 290, 666, -53, "palm"],
    r: [714, 613, 790, 463, 54, "palm"],
    head: -4,
    gazeY: -6,
  }),
  brace: p({
    l: [183, 623, 299, 539, -19, "fist"],
    r: [663, 621, 580, 518, -11, "fist"],
    head: 1,
    shoulder: -15,
    mood: "startled",
  }),
  facepalm: p({
    l: [157, 681, 272, 741, -35, "fist"],
    r: [663, 497, 462, 298, -10, "cover"],
    head: 8,
    shoulder: 7,
    gazeY: 5,
    mood: "tired",
  }),
  catch: p({
    l: [173, 669, 304, 658, -50, "palm"],
    r: [743, 609, 747, 432, 36, "palm"],
    head: -8,
    lean: 2,
    gazeX: 10,
    gazeY: -9,
    mood: "startled",
  }),
  retry: p({
    l: rest,
    r: [696, 540, 618, 386, -42, "point"],
    head: 2,
    gazeX: 2,
    gazeY: -8,
    mood: "focused",
  }),
  celebrate: p({
    l: [124, 450, 169, 292, 7, "fist"],
    r: [715, 487, 739, 334, 0, "thumb"],
    head: -5,
    shoulder: -9,
    gazeX: 0,
    mood: "happy",
  }),
  guard: p({
    l: [171, 637, 343, 576, -64, "open"],
    r: [680, 651, 563, 570, -26, "palm"],
    head: 4,
    mood: "doubt",
  }),
  caution: p({
    l: [147, 639, 181, 515, 3, "open"],
    r: [679, 564, 645, 405, -22, "point"],
    head: 5,
    gazeX: -3,
    mood: "doubt",
  }),
  panic: p({
    l: [122, 485, 212, 304, 4, "open"],
    r: [715, 461, 631, 278, -8, "open"],
    head: -7,
    shoulder: -26,
    gazeY: -11,
    mood: "startled",
  }),
  windup: p({
    l: [152, 659, 298, 618, -35, "fist"],
    r: [740, 488, 739, 390, 10, "fist"],
    head: 5,
    lean: 0,
    gazeX: 9,
    gazeY: 10,
    mood: "focused",
  }),
  strike: p({
    l: [163, 674, 307, 638, -34, "fist"],
    r: [700, 586, 762, 704, 0, "slam"],
    head: 8,
    lean: 0,
    gazeX: 10,
    gazeY: 10,
    mood: "focused",
  }),
  recoil: p({
    l: rest,
    r: [718, 598, 756, 609, 5, "slam"],
    head: 5,
    gazeX: 7,
    gazeY: 8,
    mood: "wry",
  }),
  reset: p({
    l: rest,
    r: [680, 658, 645, 725, 108, "open"],
    head: -2,
    gazeX: 0,
    mood: "bright",
  }),
  write: p({
    l: [155, 652, 274, 559, -55, "palm"],
    r: [666, 622, 527, 524, -57, "write"],
    head: 7,
    gazeX: -3,
    gazeY: 6,
    mood: "focused",
  }),
  offer: p({
    l: [156, 661, 279, 589, -54, "palm"],
    r: [685, 615, 726, 480, 48, "palm"],
    head: -3,
    gazeY: -5,
  }),
  wide: p({
    l: [134, 601, 54, 460, 32, "open"],
    r: [715, 594, 793, 435, 26, "open"],
    head: -3,
    mood: "startled",
  }),
  pinch: p({
    l: [190, 643, 318, 535, -26, "pinch"],
    r: [647, 620, 539, 516, -19, "pinch"],
    head: 4,
    shoulder: 7,
    mood: "focused",
  }),
  orbit: p({
    l: rest,
    r: [694, 524, 625, 371, -31, "point"],
    head: -5,
    gazeY: -11,
    mood: "bright",
  }),
  send: p({
    l: [176, 667, 274, 596, -29, "open"],
    r: [701, 541, 811, 394, 53, "point"],
    head: -6,
    lean: 2,
    gazeX: 8,
    gazeY: -9,
    mood: "happy",
  }),
};
function mixArm(a: Arm, b: Arm, t: number, arc: number): Arm {
  const mid = Math.sin(Math.PI * t);
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t) - mid * arc * 0.3,
    lerp(a[2], b[2], t) + mid * arc * 0.6,
    lerp(a[3], b[3], t) - mid * arc,
    lerp(a[4], b[4], t),
    t < 0.47 ? a[5] : b[5],
  ];
}
export const host = {
  x: 508,
  y: 1523,
  scale: 0.656,
  anchorX: 435,
  anchorY: 862,
};
export function framePose(f: number, flat: FlatEdit, contact: number) {
  const upcoming = flat.poses.findIndex((item) => item.at > f);
  const index =
    upcoming < 0 ? flat.poses.length - 1 : Math.max(0, upcoming - 1);
  const cue = flat.poses[index],
    current = poses[cue.name],
    previous = poses[flat.poses[Math.max(0, index - 1)].name];
  const span =
    cue.name === "strike"
      ? 4
      : cue.name === "recoil"
        ? 9
        : cue.name === "facepalm"
          ? 9
          : cue.name === "celebrate"
            ? 10
            : 14;
  const t = index === 0 ? 1 : smooth(f, cue.at, span);
  const l = mixArm(previous.l, current.l, t, 18),
    r = mixArm(previous.r, current.r, t, cue.name === "strike" ? 5 : 24);
  const atContact = f >= contact - 4 && f <= contact + 7;
  if (!atContact) {
    const wave = Math.sin(f * 0.074);
    r[2] += wave * 3;
    r[3] += Math.sin(f * 0.079 + 0.3) * 3.7;
    l[3] += Math.sin(f * 0.067 + 1.3) * 3;
  }
  let syllable = 0;
  for (const at of flat.stresses) {
    const age = f - at;
    if (age < -3 || age > 18) continue;
    const value =
      age < 0
        ? -0.38 * Math.sin((Math.PI * (age + 3)) / 3)
        : age < 5
          ? Math.sin((Math.PI * 0.5 * age) / 5)
          : Math.cos(((age - 5) * Math.PI) / 19) * Math.exp(-(age - 5) / 5.8);
    if (Math.abs(value) > Math.abs(syllable)) syllable = value;
  }
  const strain = atContact ? 0 : between(syllable, -0.5, 1) * 0.044;
  const breath = atContact ? 0 : Math.sin(f * 0.035) * 1.6;
  return {
    l,
    r,
    head: lerp(previous.head, current.head, t) + 0.65 * Math.sin(f * 0.043),
    lean: lerp(previous.lean, current.lean, t),
    shoulder: lerp(previous.shoulder, current.shoulder, t),
    gazeX: lerp(previous.gazeX, current.gazeX, t),
    gazeY: lerp(previous.gazeY, current.gazeY, t),
    mood: t < 0.43 ? previous.mood : current.mood,
    strain,
    breath,
  };
}
export type Rig = ReturnType<typeof framePose>;
export function wristOnScreen(r: Rig) {
  const rad = (r.lean * Math.PI) / 180,
    dx = r.r[2] - host.anchorX,
    dy = r.r[3] - host.anchorY;
  return {
    x:
      host.x +
      (dx * Math.cos(rad) - dy * Math.sin(rad)) *
        host.scale *
        (1 - r.strain * 0.89),
    y:
      host.y +
      r.breath +
      (dx * Math.sin(rad) + dy * Math.cos(rad)) * host.scale * (1 + r.strain),
  };
}
