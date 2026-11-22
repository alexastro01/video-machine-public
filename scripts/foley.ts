import { writeFileSync } from "node:fs";
import type { Episode } from "../src/engine/schema";
import { createUkFoley } from "./uk-foley";
// Small original synthesized cues, generated from fixed functions for repeatable renders.
export function createFoley(episode: Episode, output: string) {
  if (episode.ukEdit) {
    createUkFoley(episode, output);
    return;
  }
  const rate = 24000;
  const samples = new Float32Array(Math.ceil(episode.duration * rate));
  const cue = (
    at: number,
    length: number,
    kind: "ding" | "swoosh" | "tick" | "impact",
  ) => {
    for (let i = 0; i < length * rate; i++) {
      const t = i / rate;
      const n = Math.round(at * rate) + i;
      if (n < 0 || n >= samples.length) continue;
      const envelope =
        Math.sin((Math.PI * t) / length) *
        Math.exp(-t * (kind === "ding" ? 6 : 2));
      const signal =
        kind === "ding"
          ? Math.sin(2 * Math.PI * 880 * t) +
            0.3 * Math.sin(2 * Math.PI * 1320 * t)
          : kind === "impact"
            ? Math.sin(2 * Math.PI * (78 - 24 * t) * t) * Math.exp(-t * 5) +
              0.18 * Math.sin(i * 13.7) * Math.exp(-t * 18)
            : kind === "tick"
              ? Math.sin(2 * Math.PI * (1300 - t * 700) * t)
              : Math.sin(i * 197.31) * Math.sin(i * 31.79) +
                0.3 * Math.sin(2 * Math.PI * (100 + 600 * t) * t);
      samples[n] += signal * envelope * (kind === "swoosh" ? 0.12 : 0.2);
    }
  };
  if (episode.hook === "pixel-transfer") {
    cue(0, 0.45, "impact");
    cue(0.04, 0.68, "swoosh");
    cue(episode.duration - 0.6, 0.35, "swoosh");
  }
  if (episode.hook === "tudor-awakening") {
    cue(0, 0.35, "impact");
    cue(0.07, 0.38, "swoosh");
    cue(episode.duration - 0.5, 0.3, "swoosh");
  }
  if (episode.reviewEdit) {
    for (const shot of episode.reviewEdit.shots.slice(1))
      cue(
        shot.start,
        shot.angle === "quiet" ? 0.1 : shot.cutStyle === "wipe" ? 0.22 : 0.15,
        shot.activity === "brace"
          ? "impact"
          : shot.cutStyle === "snap"
            ? "tick"
            : "swoosh",
      );
  }
  for (const scene of episode.scenes) {
    if (scene.action === "strike") {
      for (const offset of [0.15, 1.25, 2.35])
        if ((scene.actionCue ?? 1) + offset < scene.duration)
          cue(scene.start + (scene.actionCue ?? 1) + offset, 0.15, "tick");
    }
    if (scene.action === "warn")
      cue(scene.start + (scene.actionCue ?? 1.5) + 0.23, 0.3, "impact");
    if (scene.action === "treat") cue(scene.start + 1, 0.16, "tick");
    if (scene.action === "scan") cue(scene.start + 1.6, 0.5, "swoosh");
    if (scene.action === "specimen") cue(scene.start + 1.3, 0.18, "tick");
    if (scene.action === "duplicate" && scene.id === "identity")
      cue(scene.start + 1.3, 0.6, "ding");
    if (scene.action === "wave")
      cue(
        scene.start +
          (scene.actionCue ?? 1.8) -
          episode.shadowLeadSeconds +
          0.1,
        0.6,
        "ding",
      );
    if (scene.action === "catch")
      cue(
        scene.start +
          (scene.actionCue ?? Math.max(0.6, scene.duration * 0.37)) +
          0.1,
        0.4,
        "ding",
      );
    if (scene.action === "dodge")
      cue(
        scene.start + Math.max(0.6, scene.duration * 0.37) + 0.3,
        0.7,
        "swoosh",
      );
    if (scene.action === "bicycle") {
      cue(scene.start + 0.25, 1.4, "swoosh");
      cue(scene.start + 0.3, 0.32, "ding");
    }
    if (scene.action === "turn") cue(scene.start + 0.65, 0.3, "tick");
    if (scene.action === "meet") cue(scene.start + 1.1, 1.2, "ding");
  }
  const data = Buffer.alloc(44 + samples.length * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(data.length - 8, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++)
    data.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767),
      44 + i * 2,
    );
  writeFileSync(output, data);
}
