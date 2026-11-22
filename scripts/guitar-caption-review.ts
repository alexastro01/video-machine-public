import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import type { Caption } from "@remotion/captions";
import { episodeSchema } from "../src/engine/schema";
import { reviewCaptionAt } from "../src/components/ReviewCaptions";

const input = process.argv[2] ?? "renders/guitar-pickup/guitar-pickup-v1.mp4";
const report =
  process.argv[3] ?? "renders/guitar-pickup/v1-review/caption-audio-sync.json";
const episode = episodeSchema.parse(
  JSON.parse(readFileSync("episodes/guitar-pickup/episode.json", "utf8")),
);
const captions: Caption[] = JSON.parse(
  readFileSync("episodes/guitar-pickup/captions.json", "utf8"),
);
function pcm(file: string) {
  const r = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      file,
      "-vn",
      "-ar",
      "8000",
      "-ac",
      "1",
      "-f",
      "f32le",
      "pipe:1",
    ],
    { maxBuffer: 10_000_000 },
  );
  if (r.status !== 0) throw Error(r.stderr.toString());
  const result = new Float32Array(r.stdout.length / 4);
  for (let i = 0; i < result.length; i++)
    result[i] = r.stdout.readFloatLE(i * 4);
  return result;
}
const reference = pcm(`public/${episode.audio.narration}`),
  encoded = pcm(input);
const alignment = [0.2, 5.0, 9.0, 12.1, 15.7, 18.3, 21.7, 24.3, 26.4].map(
  (start) => {
    const offset = Math.round(start * 8000),
      length = 8000;
    let best = { lagMs: Infinity, correlation: -1 };
    for (let lag = -160; lag <= 160; lag += 4) {
      let dot = 0,
        a2 = 0,
        b2 = 0;
      for (let i = 0; i < length; i++) {
        const a = reference[offset + i],
          b = encoded[offset + i + lag];
        dot += a * b;
        a2 += a * a;
        b2 += b * b;
      }
      const correlation = dot / Math.sqrt(a2 * b2);
      if (correlation > best.correlation)
        best = { lagMs: lag / 8, correlation };
    }
    return {
      start,
      ...best,
      passed:
        Math.abs(best.lagMs) <= 1000 / episode.fps && best.correlation > 0.8,
    };
  },
);
const seen = new Set<number>();
let earlyWords = 0;
for (let frame = 0; frame < episode.duration * episode.fps; frame++) {
  const now = (frame / episode.fps) * 1000;
  for (const word of reviewCaptionAt(captions, now, true)?.words ?? []) {
    if (word.startMs > now) earlyWords++;
    seen.add(word.startMs);
  }
}
const passed =
  alignment.every((a) => a.passed) &&
  earlyWords === 0 &&
  seen.size === captions.length;
writeFileSync(
  report,
  JSON.stringify(
    {
      input,
      reference: episode.audio.narration,
      explanation:
        "Waveform correlation checks that the encoded voice stays at the caption reference's timeline position; word boundaries use the exact take's forced alignment and documented onset repairs, scaled by 1/1.2. Caption coverage checks the authored model, not OCR of the pixels.",
      alignment,
      captionWords: captions.length,
      displayedWords: seen.size,
      earlyWords,
      passed,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      alignment,
      captionWords: captions.length,
      displayedWords: seen.size,
      earlyWords,
      passed,
    },
    null,
    2,
  ),
);
if (!passed) process.exitCode = 1;
