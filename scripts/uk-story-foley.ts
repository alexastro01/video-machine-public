import { renameSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import type { Episode } from "../src/engine/schema";

type Kind =
  | "warning"
  | "relay"
  | "crumble"
  | "whoosh"
  | "impact"
  | "glass"
  | "electric"
  | "whistle"
  | "ball"
  | "water"
  | "engine"
  | "cloth"
  | "hiss"
  | "brake";
export function ukStorySoundPlan(episode: Episode) {
  const edit = episode.ukEdit!,
    e = edit.events!;
  const cues: {
    at: number;
    duration: number;
    kind: Kind;
    gain: number;
    label: string;
  }[] = [];
  const add = (
    at: number,
    duration: number,
    kind: Kind,
    gain: number,
    label: string,
  ) => cues.push({ at, duration, kind, gain, label });
  for (const shot of edit.shots.slice(1))
    add(
      shot.start,
      shot.cut === "blocks" ? 0.42 : 0.2,
      shot.cut === "blocks" ? "crumble" : "whoosh",
      0.075,
      `cut:${shot.view}`,
    );
  add(0, 0.4, "impact", 0.23, "opening hit");
  add(0.015, 0.32, "whoosh", 0.12, "opening pullback");
  add(0.06, 1.1, "warning", 0.1, "cockpit caution");
  add(0.38, 0.28, "cloth", 0.07, "yoke correction");
  for (const [i, at] of [0.48, 0.78, 1.08, 1.65, 2.62, 2.78, 3.05].entries())
    add(at, 0.09, "relay", 0.09 + (i % 2) * 0.025, "runway light relay");
  add(1.35, 0.75, "warning", 0.08, "second caution");
  add(2.2, 0.65, "whoosh", 0.13, "runway push in");
  add(e.runway, 1.7, "crumble", 0.25, "runway slabs fracture");
  add(e.runwayGone, 0.55, "impact", 0.28, "runway drops");
  add(e.runwayGone + 0.08, 1, "water", 0.13, "sea fills runway gap");
  const start = (id: string) => episode.scenes.find((s) => s.id === id)!.start;
  add(start("ireland") + 0.25, 1.8, "crumble", 0.15, "UK collapse");
  add(e.coast - 0.3, 1.3, "water", 0.09, "new coastline surf");
  add(start("question") + 0.25, 2.4, "engine", 0.045, "plane over empty sea");
  add(start("fish") + 0.12, 0.28, "ball", 0.11, "plate on counter");
  add(start("fish") + 0.2, 0.8, "hiss", 0.035, "fryer");
  add(e.fishGone, 0.32, "whoosh", 0.14, "chips vanish");
  add(e.friedFish, 0.16, "relay", 0.1, "fish lift");
  add(start("pints") + 0.52, 0.55, "glass", 0.17, "pint toast");
  add(start("pints") + 1.15, 0.18, "cloth", 0.065, "raise pint");
  add(e.stopSip, 0.27, "brake", 0.14, "mid sip stop");
  add(e.midSip, 0.12, "relay", 0.075, "frozen hand beat");
  for (let i = 0; i < 7; i++)
    add(
      e.overnight + i * 0.16,
      0.12,
      "electric",
      0.095,
      "trading lines go dark",
    );
  add(e.dark, 0.55, "impact", 0.16, "market power down");
  add(start("league") + 0.05, 0.6, "whistle", 0.07, "stadium whistle");
  add(start("league") + 0.22, 0.2, "ball", 0.13, "football tap");
  add(e.cancelled, 0.45, "electric", 0.16, "stadium lights off");
  add(e.forever, 0.48, "cloth", 0.09, "empty stadium air");
  add(e.dublin, 0.8, "whoosh", 0.11, "turn toward Dublin");
  add(e.busy, 1.3, "engine", 0.07, "passing airport traffic");
  return cues;
}

export function createUkStoryFoley(episode: Episode, output: string) {
  const rate = 48000,
    samples = new Float32Array(Math.ceil(episode.duration * rate));
  let seed = 91731;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
  const cues = ukStorySoundPlan(episode);
  for (const cue of cues) {
    let low = 0,
      bass = 0;
    for (let n = 0; n < cue.duration * rate; n++) {
      const t = n / rate,
        p = t / cue.duration,
        j = Math.round(cue.at * rate) + n;
      if (j < 0 || j >= samples.length) continue;
      const noise = random();
      low = low * 0.91 + noise * 0.09;
      bass = bass * 0.994 + noise * 0.006;
      // Attack and release span the complete cue; the v6 sine became zero at 25%.
      const env =
        Math.min(1, t / 0.008) *
        Math.min(1, (1 - p) / 0.12) *
        Math.exp(-p * 1.4);
      const tone = (hz: number) => Math.sin(2 * Math.PI * hz * t);
      let signal = low;
      switch (cue.kind) {
        case "warning":
          signal =
            (tone(Math.floor(t / 0.24) % 2 ? 740 : 540) * 0.28 +
              tone(270) * 0.08) *
            (t % 0.24 < 0.12 ? 1 : 0);
          break;
        case "relay":
          signal = (noise * 0.48 + tone(950) * 0.25) * Math.exp(-t * 58);
          break;
        case "impact":
          signal =
            Math.sin(2 * Math.PI * (72 * t - 22 * t * t)) *
              Math.exp(-t * 7) *
              0.9 +
            low * Math.exp(-t * 18);
          break;
        case "crumble":
          signal =
            bass * 10 +
            low * 1.8 +
            noise * 0.09 * (Math.sin(t * 83) > 0.65 ? 1 : 0.2);
          break;
        case "whoosh":
          signal = (low * 1.9 + noise * 0.08) * Math.sin(Math.PI * p);
          break;
        case "glass":
          signal =
            (tone(1650) * Math.exp(-t * 10) +
              tone(2449) * 0.5 * Math.exp(-t * 15) +
              tone(3401) * 0.3 * Math.exp(-t * 21)) *
            0.55;
          break;
        case "electric":
          signal = (tone(480 - p * 310) * 0.28 + low * 0.8) * Math.exp(-t * 11);
          break;
        case "whistle":
          signal =
            (tone(2020 + Math.sin(t * 42) * 45) * 0.3 + tone(2540) * 0.08) *
            Math.sin(Math.PI * p);
          break;
        case "ball":
          signal =
            tone(128) * Math.exp(-t * 24) * 0.8 + low * 0.6 * Math.exp(-t * 35);
          break;
        case "water":
          signal = low * 1.9 + noise * 0.12;
          break;
        case "engine":
          signal = bass * 3 + tone(97 + p * 14) * 0.1 + tone(162) * 0.07;
          break;
        case "cloth":
          signal = low * 1.2 * Math.sin(Math.PI * p);
          break;
        case "hiss":
          signal = noise * 0.32 + low * 0.2;
          break;
        case "brake":
          signal =
            Math.sin(2 * Math.PI * (1200 * t - 1800 * t * t)) * 0.25 +
            low * 0.8;
          break;
      }
      samples[j] += signal * env * cue.gain;
    }
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

  const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", output];
  const layers = episode.ukEdit!.soundLayers ?? [];
  for (const layer of layers) args.push("-i", `public/${layer.file}`);
  args.push("-i", `public/${episode.audio.narration}`);
  const filters = [
    "[0:a]aformat=sample_rates=48000:channel_layouts=mono[core]",
  ];
  layers.forEach((layer, i) =>
    filters.push(
      `[${i + 1}:a]atrim=start=${layer.sourceOffset}:duration=${layer.duration},asetpts=PTS-STARTPTS,highpass=f=45,lowpass=f=4500,volume=${layer.gain},afade=t=in:d=0.025,afade=t=out:st=${Math.max(0, layer.duration - 0.25)}:d=0.25,adelay=${Math.round(layer.start * 1000)}:all=1,aformat=sample_rates=48000:channel_layouts=mono[layer${i}]`,
    ),
  );
  filters.push(
    `[core]${layers.map((_, i) => `[layer${i}]`).join("")}amix=inputs=${layers.length + 1}:normalize=0,volume='if(lt(t,5),2.8,1.5)':eval=frame[mix]`,
  );
  filters.push(
    `[${layers.length + 1}:a]apad=whole_dur=${episode.duration}[voice]`,
  );
  filters.push(
    `[mix][voice]sidechaincompress=threshold=0.045:ratio=3:attack=8:release=110,alimiter=limit=0.3548:level=false,apad=whole_dur=${episode.duration},atrim=duration=${episode.duration}[out]`,
  );
  const mixed = output.replace(/\.wav$/, ".mixed.wav");
  args.push(
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[out]",
    "-t",
    String(episode.duration),
    "-ar",
    "48000",
    "-ac",
    "1",
    mixed,
  );
  const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (result.status !== 0) throw Error(result.stderr);
  unlinkSync(output);
  renameSync(mixed, output);
}
