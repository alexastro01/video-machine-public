import { existsSync, writeFileSync } from "node:fs";
import type { Caption } from "@remotion/captions";
import { checkpoint, duration, episodeId, json, loadEpisode } from "./common";
import { episodeSchema } from "../src/engine/schema";
import { reviewCaptionCues } from "../src/components/ReviewCaptions";
import { progressiveCaptionCues } from "../src/engine/progressive-captions";
const id = episodeId(process.argv[2]);
const variant = process.argv.find((arg) => arg.startsWith("--variant="))?.slice(10);
const folder = variant ? `episodes/${id}/variants/${episodeId(variant)}` : `episodes/${id}`;
const episode = variant ? episodeSchema.parse(json(`${folder}/episode.json`)) : loadEpisode(id);
const captions = json<Caption[]>(`${folder}/captions.json`);
if (!captions.length)
  throw new Error(
    "Captions are missing. Run media:prepare after generating narration.",
  );
for (const item of episode.storyItems ?? [])
  if (!existsSync(`public/${item.file}`))
    throw new Error(`Missing story item: public/${item.file}`);
for (const layer of episode.ukEdit?.soundLayers ?? []) {
  if (!existsSync(`public/${layer.file}`))
    throw new Error(`Missing sound layer: ${layer.file}`);
  if (layer.start + layer.duration > episode.duration + 1 / episode.fps)
    throw new Error(`Sound layer exceeds the episode: ${layer.file}`);
  if (
    layer.sourceOffset + layer.duration >
    duration(`public/${layer.file}`) + 0.05
  )
    throw new Error(`Sound layer exceeds its source: ${layer.file}`);
}
let previousEnd = -1;
for (const c of captions) {
  if (
    c.startMs < previousEnd - 30 ||
    c.endMs <= c.startMs ||
    c.endMs > episode.duration * 1000
  )
    throw new Error(`Invalid caption timing at "${c.text}"`);
  previousEnd = c.endMs;
}
for (const [name, asset] of Object.entries(episode.audio)) {
  if (typeof asset !== "string") continue;
  const file = `public/${asset}`;
  if (!existsSync(file)) throw new Error(`Missing ${name}: ${file}`);
  const seconds = duration(file);
  if (
    name === "narration" &&
    seconds + episode.audio.narrationOffset > episode.duration + 0.05
  )
    throw new Error("Narration is longer than the video");
  if (name !== "narration" && Math.abs(seconds - episode.duration) > 0.1)
    throw new Error(`${name} must cover the full episode`);
}
const srtTime = (ms: number) =>
  `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
const phraseFile = `${folder}/caption-phrases.json`;
const exportCaptions = episode.claudeEdit?.flat ? captions :
  episode.world === "coffee-motion" ||
  episode.world === "share-ledger" ||
  episode.world === "beer-motion" ||
  episode.world === "nvidia" ||
  episode.world === "astra-quick-test" ||
  episode.world === "inbox-png" ||
  episode.world === "human-in-the-loop" ||
  episode.world === "astra-born-yesterday" ||
  episode.world === "make-no-mistakes" ||
  episode.world === "make-no-mistakes-story" ||
  episode.world === "absolutely-right" ||
  episode.world === "rip" ||
  episode.world === "final-round" ||
  episode.world === "alex-presenter" ||
  episode.world === "claude-design" ||
  episode.world === "review-loop" ||
  episode.world === "subscriber" ||
  episode.world === "ai-typo" ||
  episode.world === "lonely-motion" ||
  episode.world === "profile-motion" ||
  episode.world === "swap3" ||
  episode.world === "swap4" ||
  episode.world === "swap5" ||
  episode.world === "start-task"
    ? progressiveCaptionCues(
        captions,
        json<{ words: { text: string; start: number; end: number }[] }>(
          `${folder}/transcript-source.json`,
        ).words,
      )
    : episode.renderer === "hyperframes" && existsSync(phraseFile)
      ? json<{ start: number; end: number; text: string }[]>(phraseFile).map(
          (c) => ({
            startMs: Math.round(c.start * 1000),
            endMs: Math.round(c.end * 1000),
            text: c.text,
          }),
        )
      : episode.reviewEdit ||
          episode.ukEdit ||
          episode.renderer === "hyperframes"
        ? reviewCaptionCues(
            captions,
            episode.ukEdit?.style === "story-v6" ||
              episode.renderer === "hyperframes",
          ).map((p) => ({
            startMs: p.start,
            endMs: Math.min(p.end, episode.duration * 1000),
            text: p.words.map((w) => w.text).join(" "),
          }))
        : captions;
writeFileSync(
  `${folder}/captions.srt`,
  exportCaptions
    .map(
      (c, i) =>
        `${i + 1}\n${srtTime(c.startMs)} --> ${srtTime(c.endMs)}\n${c.text.trim()}\n`,
    )
    .join("\n"),
);
checkpoint(id, variant ? `variantValidated-${variant}` : "validated", {
  durationSeconds: episode.duration,
  fps: episode.fps,
  frames: Math.round(episode.duration * episode.fps),
  scenes: episode.scenes.length,
  words: captions.reduce(
    (count, caption) =>
      count + caption.text.trim().split(/\s+/).filter(Boolean).length,
    0,
  ),
  captionChunks: captions.length,
});
console.log(
  `PASS ${id}: continuous ${episode.duration}s timeline, local audio, timed captions and SRT.`,
);
