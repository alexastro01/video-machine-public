import timing from "../../../episodes/alex-astro-instagram-algorithm-rpg/full/timing.json";
import { mix, pulse, smooth, type ArtName, type Role } from "../art";

export const edit = timing;
export const c = timing.cues;
export const center = 135;
export const fieldFont = '"DM Sans", Arial, sans-serif';
export function wordIndex(f: number) {
  const next = edit.starts.findIndex((start) => start > f);
  return next < 0 ? edit.words.length - 1 : Math.max(0, next - 1);
}
export function visible(f: number, start: number, end: number, ease = 12) {
  return smooth(f, start - ease, start) * (1 - smooth(f, end, end + ease));
}
export function speaking(f: number): Role {
  return f < c.wrong || (f >= c.question && f < c.reply) ? "alex" : "opus";
}
export function wordBounce(f: number) {
  const i = wordIndex(f),
    s = edit.starts[i];
  return pulse(f, s, Math.min(14, (edit.starts[i + 1] ?? edit.frames) - s));
}
export const roads = [
  { key: "feed", label: "Feed", x: 48, y: 206, frame: c.feed },
  { key: "stories", label: "Stories", x: 72, y: 146, frame: c.stories },
  { key: "reels", label: "Reels", x: center, y: 103, frame: c.reels },
  { key: "explore", label: "Explore", x: 195, y: 145, frame: c.explore },
  { key: "search", label: "Search…", x: 208, y: 206, frame: c.reels + 14 },
] as const;
type Stance = { x: number; y: number };
const home: Record<Role, Stance> = {
  alex: { x: 121, y: 319 },
  opus: { x: 151, y: 337 },
  astra: { x: 111, y: 354 },
  gemini: { x: 151, y: 374 },
};
const guide: Record<Role, Stance> = {
  alex: { x: 113, y: 346 },
  opus: { x: 145, y: 337 },
  astra: { x: 106, y: 374 },
  gemini: { x: 157, y: 375 },
};
const finale: Record<Role, Stance> = {
  alex: { x: 123, y: 262 },
  opus: { x: 150, y: 268 },
  astra: { x: 111, y: 284 },
  gemini: { x: 157, y: 290 },
};
function toward(a: Stance, b: Stance, t: number) {
  return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) };
}
export function actor(role: Role, f: number) {
  let p = toward(home[role], guide[role], smooth(f, c.wrong - 7, c.wrong + 27));
  if (role === "opus") {
    const intercept =
      smooth(f, c.wrong - 15, c.wrong + 5) *
      (1 - smooth(f, c.split + 13, c.feed + 18));
    p = toward(p, { x: center, y: 310 }, intercept);
  }
  const clock = visible(f, c.hourglass - 8, c.pass1 - 5, 32);
  const shrine = visible(f, c.heart - 7, c.you - 3, 32);
  const toss = visible(f, c.sendAction - 7, c.more + 14, 26);
  if (role === "astra")
    p = toward(
      p,
      { x: 105 + 7 * smooth(f, c.gateOpen, c.gateOpen + 14), y: 237 },
      clock,
    );
  if (role === "gemini") p = toward(p, { x: 160, y: 238 }, shrine);
  if (role === "alex") p = toward(p, { x: 120, y: 267 }, toss);
  p = toward(p, finale[role], smooth(f, c.question - 23, c.question + 8));
  const endWalk = edit.steps.findIndex((k) => k > f);
  const nearest =
    edit.steps[(endWalk === -1 ? edit.steps.length : endWalk) - 1] ?? -100;
  const walking =
    f >= nearest &&
    f - nearest < 18 &&
    !(role === "opus" && f < c.your && f > c.wrong + 20);
  const phase = { alex: 0, opus: 5, astra: 9, gemini: 13 }[role];
  const gait = walking ? Math.sin(((f - nearest + phase) * Math.PI) / 17) : 0;
  let pose = "back";
  if (role === "alex") {
    if (f < c.views) pose = "act";
    else if (f < c.me + 8) pose = "quest-recoil";
    else if (f < c.one) pose = "quest-right";
    else if (f < c.family) pose = "quest-study";
    else if (f < c.your) pose = "quest-rear-right";
    else if (f >= c.planeDoor && f < c.sendAction) pose = "act";
    else if (f >= c.sendAction && f < c.reach) pose = "quest-toss";
    else if (f >= c.reach && f < c.recap) pose = "quest-rear-right";
    else if (f >= c.question && f < c.pressing) pose = "quest-study";
    else if (f >= c.pressing) pose = "quest-send";
  } else if (role === "opus") {
    if (f < c.wrong - 15) pose = "quest-left";
    else if (f < c.wrong - 5) pose = "quest-rear-left";
    else if (f < c.one + 4) pose = "quest-interrupt";
    else if (f < c.whole) pose = "front";
    else if (f < c.feed) pose = "quest-interrupt";
    else if (f < c.reels) pose = "quest-right";
    else if (f < c.three) pose = "quest-point-north";
    else if (f < c.gate1) pose = "quest-count";
    else if (f < c.stay) pose = "quest-left";
    else if (f < c.end) pose = "front";
    else if (f < c.pass1) pose = "quest-point-north";
    else if (f < c.likes) pose = "quest-right";
    else if (f < c.folks) pose = "front";
    else if (f < c.gate3) pose = "quest-right";
    else if (f < c.sendAction) pose = "quest-point-north";
    else if (f < c.strangers) pose = "quest-left";
    else if (f < c.recap) pose = "quest-rear-right";
    else if (f < c.bigThree) pose = "quest-point-north";
    else if (f < c.question) pose = "quest-count";
    else if (f < c.reply) pose = "quest-left";
    else pose = "quest-turn-camera";
  } else if (role === "astra") {
    if (clock > 0.48)
      pose =
        f < c.howLong
          ? "quest-guard"
          : f < c.gateOpen
            ? "quest-invert"
            : f < c.pass1
              ? "quest-yield"
              : "quest-cheer";
    else if (f < c.wrong) pose = "quest-right";
    else if (f < c.split) pose = "quest-rear-right";
    else if (f < c.your) pose = "quest-left";
    else if (f >= c.lit && f < c.recap) pose = "quest-cheer";
    else if (f >= c.question) pose = "quest-right";
  } else {
    if (shrine > 0.48)
      pose =
        f < c.likes
          ? "quest-guard"
          : f < c.weigh
            ? "quest-heart"
            : f < c.follow
              ? "quest-offer"
              : "quest-cheer";
    else if (f < c.wrong) pose = "quest-left";
    else if (f < c.family) pose = "quest-rear-left";
    else if (f < c.your) pose = "quest-right";
    else if (f >= c.lit && f < c.recap) pose = "quest-cheer";
    else if (f >= c.question) pose = "quest-left";
  }
  if (
    walking &&
    (pose === "back" ||
      (role !== "opus" &&
        (clock < 0.42 || role !== "astra") &&
        (shrine < 0.42 || role !== "gemini") &&
        f >= c.your &&
        f < c.portal))
  ) {
    const foot = Math.floor((f + phase) / 9) % 4;
    pose =
      foot === 0
        ? "quest-rear-left"
        : foot === 1
          ? "walk-l"
          : foot === 2
            ? "quest-rear-right"
            : "walk-r";
  }
  const h =
    { alex: 59, opus: 59, astra: 51, gemini: 51 }[role] -
    (f >= c.question ? 3 : 0);
  const hop = speaking(f) === role ? wordBounce(f) : 0;
  return {
    ...p,
    h,
    hop,
    shift: Math.abs(gait) * 1.3,
    pose: `${role}-${pose}` as ArtName,
  };
}
