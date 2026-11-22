import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { episodeSchema } from "../src/engine/schema";
const { PNG } = createRequire(import.meta.url)("pngjs") as {
  PNG: {
    sync: {
      read: (data: Buffer) => { width: number; height: number; data: Buffer };
    };
  };
};

const episode = episodeSchema.parse(
  JSON.parse(readFileSync("episodes/uk-disappears/episode.json", "utf8")),
);
const input = process.argv[2] ?? "renders/uk-disappears/uk-disappears-v6.mp4";
const offset = Number(
  process.argv.find((a) => a.startsWith("--start-frame="))?.split("=")[1] ?? 0,
);
const output =
  process.argv.find((a) => a.startsWith("--report="))?.slice(9) ??
  "renders/uk-disappears/v6-review/camera-visibility.json";
if (episode.ukEdit?.style !== "story-v6")
  throw Error("This visual contract belongs to the UK story revision.");
const shots = episode.ukEdit.shots;
const results = ["ireland", "question"].map((view) => {
  const shot = shots.find((s) => s.view === view)!;
  const sourceFrame = Math.round(
      (shot.start + shot.duration / 2) * episode.fps,
    ),
    frame = sourceFrame - offset;
  if (frame < 0)
    throw Error("Review interval does not contain the required shot.");
  const r = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      input,
      "-vf",
      `select=eq(n\\,${frame})`,
      "-frames:v",
      "1",
      "-f",
      "image2pipe",
      "-vcodec",
      "png",
      "pipe:1",
    ],
    { maxBuffer: 32_000_000 },
  );
  if (r.status !== 0) throw Error(r.stderr.toString());
  const p = PNG.sync.read(r.stdout),
    height = Math.floor(p.height * 0.68);
  let dark = 0,
    land = 0,
    bright = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < p.width; x++) {
      const i = (y * p.width + x) * 4,
        l =
          0.2126 * p.data[i] + 0.7152 * p.data[i + 1] + 0.0722 * p.data[i + 2];
      if (l < 50) dark++;
      if (l > 65) land++;
      if (l > 115) bright++;
    }
  const n = height * p.width,
    darkFraction = dark / n,
    landFraction = land / n,
    brightFraction = bright / n;
  const passed =
    view === "ireland"
      ? darkFraction > 0.1 && landFraction > 0.05
      : brightFraction > 0.002;
  return {
    view,
    sourceFrame,
    inputFrame: frame,
    darkFraction,
    landFraction,
    brightFraction,
    passed,
  };
});
mkdirSync("renders/uk-disappears/v6-review", { recursive: true });
writeFileSync(
  output,
  JSON.stringify(
    {
      input,
      offset,
      excludedLowerCaptionArea: true,
      results,
      passed: results.every((r) => r.passed),
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(results, null, 2));
if (results.some((r) => !r.passed)) process.exitCode = 1;
