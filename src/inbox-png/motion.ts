import { Easing } from "remotion";
import cues from "../../episodes/inbox-dot-png/cues.json";
import timeline from "../../episodes/inbox-dot-png/dialogue-timeline.json";
import type { Waypoint } from "../developer/remocn/SimulatedCursor";
import { cursorPosition } from "../developer/remocn/SimulatedCursor";

export const e = cues;
export const fps = timeline.fps;
export const box = { x: 112, y: 220 };
export const grip = { x: 566, y: 468 };
const trash = { x: 385, y: 625 };
const drop = { x: 383, y: 600 };
export type Speaker = "alex" | "opus" | "gemini" | "astra";
export const lines = timeline.lines.map((line) => ({
  ...line,
  speaker: line.speaker as Speaker,
  inFrame: Math.round(line.words[0].start * fps),
  outFrame: Math.round(line.words[line.words.length - 1].end * fps),
}));
export const clamp = (p: number) => Math.min(1, Math.max(0, p));
const ease = Easing.bezier(0.26, 0.05, 0.2, 1);
export const move = (frame: number, start: number, length: number) =>
  ease(clamp((frame - start) / length));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const pointerPath: Waypoint[] = [
  { frame: e.click1 - 44, x: 764, y: 520 },
  { frame: e.click1 - 12, ...trash, arc: 28 },
  { frame: e.click1, ...trash, click: true },
  { frame: e.click2, ...trash, click: true },
  { frame: e.click3, ...trash, click: true },
  { frame: e.approach, ...trash },
  { frame: e.grab - 5, ...grip, arc: 12 },
  { frame: e.grab, ...grip, click: true },
  { frame: e.grab + 7, ...grip },
  { frame: e.pulled, ...drop, arc: 11 },
  { frame: e.tug, ...drop },
  { frame: e.tug + 10, x: drop.x - 23, y: drop.y + 9 },
  { frame: e.release, x: drop.x - 23, y: drop.y + 9 },
  { frame: e.release + 21, x: 330, y: 703, arc: 7 },
];

export function imagePose(frame: number) {
  const hand = cursorPosition(Math.min(frame, e.release), pointerPath);
  const progress = move(frame, e.grab + 7, e.pulled - e.grab - 7);
  const wobble = Math.sin(Math.PI * move(frame, e.tug, 21));
  const lift = Math.sin(Math.PI * progress);
  const gallery = move(frame, e.fileName - 12, 36);
  const scale = mix(1 - 0.27 * progress, 0.461, gallery);
  const angle = mix(-5.7 * progress - 1.6 * lift - 2.3 * wobble, -2.6, gallery);
  const dx = frame <= e.grab ? 0 : hand.x - grip.x;
  const dy = frame <= e.grab ? 0 : hand.y - grip.y;
  // Work in the grabbed pixel's coordinate system, including the move to the file shelf.
  const targetX = 114 + (grip.x - box.x) * 0.461;
  const targetY = 368 + (grip.y - box.y) * 0.461;
  return {
    x: mix(grip.x + dx, targetX, gallery),
    y: mix(grip.y + dy, targetY, gallery),
    scale,
    angle,
    gallery,
  };
}

export function voiceLight(frame: number, role: Speaker) {
  let strength = 0;
  for (const line of lines.filter((l) => l.speaker === role)) {
    const out = line.id === "dark" ? timeline.frames : line.outFrame;
    strength = Math.max(
      strength,
      move(frame, line.inFrame - 4, 7) * (1 - move(frame, out + 1, 8)),
    );
  }
  return strength;
}
