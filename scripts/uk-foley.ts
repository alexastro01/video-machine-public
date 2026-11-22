import { writeFileSync } from "node:fs";
import type { Episode } from "../src/engine/schema";
import { createUkStoryFoley } from "./uk-story-foley";
export function createUkFoley(episode: Episode, output: string) {
  if (episode.ukEdit?.soundDesign === "story-v7") {
    createUkStoryFoley(episode, output);
    return;
  }
  const rate = 24000,
    samples = new Float32Array(Math.ceil(episode.duration * rate));
  let seed = 91731;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
  type Kind =
    | "alarm"
    | "crumble"
    | "brake"
    | "splash"
    | "metal"
    | "whoosh"
    | "dust";
  function cue(at: number, len: number, kind: Kind, gain = 0.12) {
    let low = 0;
    for (let n = 0; n < len * rate; n++) {
      const t = n / rate,
        p = t / len,
        j = Math.round(at * rate) + n;
      if (j < 0 || j >= samples.length) continue;
      const noise = random();
      low = low * 0.94 + noise * 0.06;
      const env = Math.sin(Math.PI * Math.min(1, p * 4)) * Math.exp(-p * 2);
      let v = low * 2;
      if (kind === "alarm")
        v =
          Math.sin(t * Math.PI * 2 * (Math.floor(t * 5) % 2 ? 680 : 880)) *
          (Math.sin(t * 22) > 0.1 ? 0.35 : 0);
      if (kind === "crumble")
        v =
          low * 3 +
          noise * 0.25 +
          Math.sin(2 * Math.PI * (70 - t * 20) * t) * Math.exp(-t * 9) * 0.7;
      if (kind === "brake")
        v = noise * 0.3 + Math.sin(2 * Math.PI * (1600 - t * 280) * t) * 0.35;
      if (kind === "splash") v = low * 4 + noise * 0.15;
      if (kind === "metal")
        v =
          Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 12) +
          Math.sin(2 * Math.PI * 1323 * t) * Math.exp(-t * 10) * 0.3 +
          noise * 0.15;
      if (kind === "whoosh") v = low * 3 + noise * 0.12;
      if (kind === "dust") v = low * 1.3;
      samples[j] += v * env * gain;
    }
  }
  const edit = episode.ukEdit!;
  for (const s of edit.shots)
    if (s.cut !== "quiet")
      cue(s.start, 0.2, s.cut === "snap" ? "metal" : "whoosh", 0.07);
  const get = (id: string) => episode.scenes.find((s) => s.id === id)!;
  cue(0, 1.7, "alarm", 0.19);
  cue(1.1, 1.5, "crumble", 0.22);
  cue(3.1, 1.6, "crumble", 0.2);
  cue(get("ireland").start + 0.3, 1.8, "crumble", 0.17);
  if (edit.style === "story-v6") {
    const e = edit.events!;
    cue(e.runway, 1.1, "crumble", 0.18);
    cue(e.fishGone, 0.45, "dust", 0.13);
    cue(e.friedFish, 0.18, "metal", 0.08);
    cue(get("pints").start + 0.45, 0.2, "metal", 0.12);
    cue(e.stopSip, 0.28, "brake", 0.1);
    for (let i = 0; i < 6; i++)
      cue(e.overnight + i * 0.15, 0.14, "metal", 0.055);
    cue(e.cancelled, 0.65, "dust", 0.13);
    cue(e.forever, 0.3, "metal", 0.1);
    cue(e.dublin, 0.6, "whoosh", 0.1);
    cue(e.busy, 1.3, "crumble", 0.07);
  } else {
    cue(get("calais").start + 0.1, 1.3, "splash", 0.09);
    cue(get("tunnel").start + get("tunnel").actionCue!, 1.4, "brake", 0.18);
    cue(get("tunnel").start + 4.3, 1.4, "splash", 0.13);
    cue(get("pound").start + 2.1, 0.7, "metal", 0.12);
    cue(get("pound").start + 3.7, 0.8, "crumble", 0.15);
    cue(get("realms").start + 1.3, 1.1, "dust", 0.08);
  }
  let wind = 0;
  for (let n = 0; n < samples.length; n++) {
    wind = wind * 0.987 + random() * 0.013;
    const t = n / rate;
    const quiet =
      t >= edit.quietStart && t < edit.quietStart + edit.quietDuration;
    samples[n] += wind * (quiet ? 0.65 : 0.06);
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
      Math.round(Math.max(-0.95, Math.min(0.95, samples[i])) * 32767),
      44 + i * 2,
    );
  writeFileSync(output, data);
}
