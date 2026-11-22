import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { episodeSchema } from "../src/engine/schema";
import { alignEpisode } from "../src/engine/align";
const dir = "episodes/guitar-pickup",
  pub = "public/episodes/guitar-pickup";
const source = JSON.parse(
  readFileSync(dir + "/transcript-source.json", "utf8"),
);
const expected = readFileSync(dir + "/narration.txt", "utf8")
  .trim()
  .split(/\s+/);
if (source.words.length !== expected.length)
  throw Error("Review the exact-take transcript word count before preparing.");
source.corrections = source.words.flatMap((w: { text: string }, i: number) =>
  w.text.toLowerCase().replace(/[^a-z0-9]/g, "") ===
  expected[i].toLowerCase().replace(/[^a-z0-9]/g, "")
    ? []
    : [{ from: w.text, to: expected[i], word: i }],
);
source.words = source.words.map(
  (w: { start: number; end: number }, i: number) => ({
    text: expected[i],
    start: w.start,
    end: w.end,
  }),
);
writeFileSync(
  dir + "/transcript-source.json",
  JSON.stringify(source, null, 2) + "\n",
);
const duration = Number(
  execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      pub + "/source-take-1.mp3",
    ],
    { encoding: "utf8" },
  ),
);
const voiceDuration = duration / 1.2;
if (voiceDuration > 29.6)
  throw Error("Narration does not fit 30 seconds at 1.2x. Tighten the script.");
const recipe = [
  ["hook", "guitar-studio", "strum", "Unplug"],
  ["dive", "guitar-body", "shrink", "Where's the roar"],
  ["string", "guitar-body", "pluck", "This steel string"],
  ["pickup", "guitar-pickup", "reveal", "Below"],
  ["magnet", "guitar-pickup", "induce", "The magnets"],
  ["flux", "guitar-pickup", "induce", "Its movement"],
  ["nylon", "guitar-pickup", "choose", "Nylon"],
  ["cable", "guitar-cable", "step", "The cable"],
  ["amp", "guitar-amp", "amplify", "The amp"],
  ["speaker", "guitar-speaker", "wave", "The speaker"],
  ["closer", "guitar-studio", "strum", "Plug in"],
];
const e = episodeSchema.parse({
  version: 1,
  id: "guitar-pickup",
  title: "Where an Electric Guitar Gets Its Roar",
  number: 5,
  renderer: "hyperframes",
  world: "guitar",
  pixelArt: "rpg",
  hook: "none",
  closingFade: false,
  shadowLeadSeconds: 0,
  premise:
    "Follow a vibrating steel string through a magnetic pickup, cable, amplifier and speaker. Miko and the signal ride are explanatory fiction.",
  fiction: true,
  duration: 30,
  aspectRatio: "9:16",
  fps: 30,
  cast: ["miko", "nova"],
  audio: {
    narration: "episodes/guitar-pickup/narration.wav",
    music: "episodes/guitar-pickup/music.wav",
    effects: "episodes/guitar-pickup/effects.wav",
    narrationOffset: 0,
    narrationTail: 30 - voiceDuration,
    narrationTrimStart: 0,
    pauses: [],
  },
  scenes: recipe.map(([id, set, action, anchor], i) => ({
    id,
    set,
    action,
    anchor,
    start: (i * 30) / recipe.length,
    duration: 30 / recipe.length,
    label: id,
    focus: [],
    timeOfDay: "evening",
  })),
});
const aligned = alignEpisode(e, source.words, 1 / 1.2);
episodeSchema.parse(aligned.episode);
for (const [name, value] of [
  ["episode", aligned.episode],
  ["captions", aligned.captions],
  ["studio-props", aligned],
])
  writeFileSync(
    dir + "/" + name + ".json",
    JSON.stringify(value, null, 2) + "\n",
  );
execFileSync("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  pub + "/source-take-1.mp3",
  "-af",
  "atempo=1.2,loudnorm=I=-16:TP=-1.5:LRA=11,apad",
  "-t",
  String(voiceDuration),
  "-ar",
  "48000",
  "-ac",
  "1",
  pub + "/narration.wav",
]);
writeFileSync(
  dir + "/production.json",
  JSON.stringify(
    {
      prepared: {
        sourceTake: 1,
        originalVoiceSeconds: duration,
        narrationSeconds: voiceDuration,
        speedRatio: 1.2,
        captionWords: aligned.captions.length,
      },
      renderer: "HyperFrames 0.9.23 + Blender Eevee",
      approval: "not_recorded",
    },
    null,
    2,
  ) + "\n",
);
const timed = {
  duration: 30,
  fps: 30,
  worldWidth: 540,
  worldHeight: 960,
  samples: 24,
  shots: aligned.episode.scenes,
  voiceDuration,
  events: Object.fromEntries(
    aligned.captions.map((c) => [
      c.text
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ""),
      c.startMs / 1000,
    ]),
  ),
};
writeFileSync(
  "blender/guitar-pickup/config-v1.json",
  JSON.stringify(timed, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      voiceDuration,
      rate: 1.2,
      scenes: aligned.episode.scenes.map((s) => ({
        id: s.id,
        start: s.start,
        duration: s.duration,
      })),
    },
    null,
    2,
  ),
);
