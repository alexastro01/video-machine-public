import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { episodeSchema } from "../src/engine/schema";
import { alignEpisode, findAnchor } from "../src/engine/align";
import type { Caption } from "@remotion/captions";

const variant = process.argv.find(a => a.startsWith("--variant="))?.slice(10);
if (variant && !/^[a-z0-9-]+$/.test(variant)) throw new Error("Invalid variant slug");
const dir = `episodes/restless-friend${variant ? `/variants/${variant}` : ""}`;
const pub = `public/episodes/restless-friend${variant ? `/variants/${variant}` : ""}`;
const settings: { narrationPlaybackRate: number; duration: number; sourceTake: number; voice?: string } = variant
  ? JSON.parse(readFileSync(`${dir}/variant.json`, "utf8"))
  : { narrationPlaybackRate: 1.2, duration: 31, sourceTake: 2, voice: "Amara" };
const source = JSON.parse(readFileSync(`${dir}/transcript-source.json`, "utf8"));
const recipe = JSON.parse(readFileSync(`${dir}/shot-recipe.json`, "utf8"));
const speed = settings.narrationPlaybackRate;
const duration = settings.duration;
const episode = episodeSchema.parse({
  version: 1, id: "restless-friend", number: 8,
  title: "Why That Friend Eats Everything and Stays Lean",
  renderer: "hyperframes", world: "neat", pixelArt: "rpg", hook: "none",
  closingFade: false, shadowLeadSeconds: 0, fiction: true,
  premise: "A fictional pair of friends introduces the 1999 NEAT experiment. Exact study extrema, not a leg-tapping calorie promise.",
  aspectRatio: "9:16", fps: 30, duration, cast: ["miko", "kai", "ada"],
  audio: { narration: `${pub.slice(7)}/narration.wav`, music: `${pub.slice(7)}/music.wav`, effects: `${pub.slice(7)}/effects.wav`, narrationOffset: 0, narrationTail: .25, narrationTrimStart: 0, pauses: [] },
  scenes: recipe.shots.map((s: Record<string, unknown>, i: number) => ({ ...s,
    start: i * duration / recipe.shots.length, duration: duration / recipe.shots.length,
    timeOfDay: "evening", focus: [], label: s.id,
  })),
});
const aligned = alignEpisode(episode, source.words, 1 / speed);
const rawCaptions = aligned.captions;
const rules: [string[], string][] = [
  [["nineteen", "ninety-nine"], "1999"], [["a", "thousand"], "1,000"],
  [["sixteen"], "16"], [["eight"], "8"],
  [["point", "three", "six"], "0.36"], [["four", "point", "two", "three"], "4.23"],
  [["six", "hundred", "ninety-two"], "692"],
];
const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
const captions: Caption[] = [];
const numberMap: object[] = [];
for (let i = 0; i < rawCaptions.length;) {
  const match = rules.find(([tokens]) => tokens.every((t, n) => normalize(rawCaptions[i + n]?.text ?? "") === t));
  if (!match) { captions.push(rawCaptions[i++]); continue; }
  const [tokens, display] = match;
  const group = rawCaptions.slice(i, i + tokens.length);
  const last = group.at(-1)!;
  const punctuation = last.text.match(/[.,!?…]+$/)?.[0] ?? "";
  captions.push({ ...group[0], text: `${i ? " " : ""}${display}${punctuation}`, endMs: last.endMs });
  numberMap.push({ sourceWords: group.map(w => w.text.trim()), display, startMs: group[0].startMs, endMs: last.endMs });
  i += tokens.length;
}
const cue = (anchor: string) => findAnchor(source.words, anchor) / speed;
const events = Object.fromEntries(Object.entries(recipe.events).map(([name, anchor]) => [name, cue(String(anchor))]));
const timeline = { ...aligned.episode, sourceTake: settings.sourceTake, voice: settings.voice, narrationPlaybackRate: speed, deliveryPlaybackRate: 1, events, shots: aligned.episode.scenes };
for (const [name, value] of Object.entries({ episode: aligned.episode, captions, "caption-words-source": rawCaptions, "caption-number-map": numberMap, timeline, "studio-props": { episode: aligned.episode, captions } }))
  writeFileSync(`${dir}/${name}.json`, JSON.stringify(value, null, 2) + "\n");
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${pub}/source-edited.wav`, "-af",
  `atempo=${speed},loudnorm=I=-16:TP=-2:LRA=9,aresample=48000,apad=whole_len=${Math.round(duration * 48000)},atrim=end_sample=${Math.round(duration * 48000)}`,
  "-ar", "48000", "-ac", "1", `${pub}/narration.wav`]);
mkdirSync("blender/restless-friend", { recursive: true });
writeFileSync(variant ? `${dir}/blender-config.json` : "blender/restless-friend/config-v1.json", JSON.stringify({
  duration, fps: 30, worldWidth: 1080, worldHeight: 1920, samples: recipe.worldSamples ?? 24,
  shots: aligned.episode.scenes, events, recipe,
}, null, 2) + "\n");
console.log(JSON.stringify({ duration, speed, sourceWords: rawCaptions.length, displayTokens: captions.length,
  shots: aligned.episode.scenes.map(s => ({ id: s.id, start: s.start, duration: s.duration })), events }, null, 2));
