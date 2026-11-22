import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { episodeSchema } from "../src/engine/schema";
import { alignEpisode } from "../src/engine/align";
const dir = "episodes/microwave",
  pub = "public/episodes/microwave";
const source = JSON.parse(
  readFileSync(dir + "/transcript-source.json", "utf8"),
);
const recipe = [
  ["hook", "kitchen", "reveal", "Your microwave"],
  ["ice", "kitchen", "choose", "But ice"],
  ["dive", "cavity", "shrink", "Let's go inside"],
  ["magnetron", "magnetron", "reveal", "Behind this wall"],
  ["feed", "magnetron", "wave", "Like Wi-Fi"],
  ["water", "water", "reveal", "Water molecules"],
  ["field", "water", "wave", "The electric field"],
  ["follow", "water", "turn", "They try"],
  ["heat", "water", "wave", "As they jostle"],
  ["soup", "cavity", "reveal", "The soup warms"],
  ["lattice", "ice", "stop", "But ice locks"],
  ["defrost", "ice", "wave", "Defrost often"],
  ["door", "door", "catch", "The door's metal"],
  ["light", "door", "wave", "Tiny light"],
  ["hotspots", "cavity", "reveal", "Inside reflected"],
  ["ride", "cavity", "turn", "The spinning plate"],
  ["closer", "kitchen", "reveal", "Ding"],
  ["loop", "kitchen", "reveal", "Now you know"],
];
const duration = 45,
  voiceDuration = 44.9;
const episode = episodeSchema.parse({
  version: 1,
  id: "microwave",
  title: "How Does a Microwave Actually Work?",
  number: 6,
  renderer: "hyperframes",
  world: "microwave",
  pixelArt: "rpg",
  hook: "none",
  closingFade: false,
  shadowLeadSeconds: 0,
  premise:
    "Explore dielectric heating, ice, door shielding and turntable hot spots. Miko's miniaturisation and visible slowed waves are explanatory fiction.",
  fiction: true,
  duration,
  aspectRatio: "9:16",
  fps: 30,
  cast: ["miko", "nova"],
  audio: {
    narration: "episodes/microwave/narration.wav",
    music: "episodes/microwave/music.wav",
    effects: "episodes/microwave/effects.wav",
    narrationOffset: 0,
    narrationTail: duration - voiceDuration,
    narrationTrimStart: 0,
    pauses: [],
  },
  scenes: recipe.map(([id, set, action, anchor], i) => ({
    id,
    set: "microwave-" + set,
    action,
    anchor,
    start: (i * duration) / recipe.length,
    duration: duration / recipe.length,
    label: id,
    focus: [],
    timeOfDay: "evening",
  })),
});
const aligned = alignEpisode(episode, source.words, 1 / 1.2);
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
  pub + "/source-edited.wav",
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
mkdirSync("blender/microwave", { recursive: true });
writeFileSync(
  "blender/microwave/config-v1.json",
  JSON.stringify(
    {
      duration,
      fps: 30,
      worldWidth: 540,
      worldHeight: 960,
      samples: 24,
      shots: aligned.episode.scenes,
      voiceDuration,
    },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  dir + "/visuals.json",
  JSON.stringify(
    {
      version: 1,
      worldFile: "world-v1.mp4",
      frameDir: "blender/microwave/frames-v1",
      blendFile: "blender/microwave/microwave-v1.blend",
      worldResolution: [540, 960],
      deliveryResolution: [1080, 1920],
      waveColour: "#9de6e2",
      captionPosition: 0.72,
      characterSheet: "public/pixel/microwave/miko-four-v1.png",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    aligned.episode.scenes.map((s) => ({
      id: s.id,
      start: s.start,
      duration: s.duration,
    })),
    null,
    2,
  ),
);
