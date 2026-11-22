import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { command, writeJson } from "./common";

const file = process.argv[2];
if (!file || !existsSync(file))
  throw new Error("Usage: npm run analyze -- /path/to/video.mp4 [--dense]");
const name = (
  process.argv.find((a) => a.startsWith("--name="))?.slice(7) ??
  path.basename(file, path.extname(file))
).replace(/[^a-zA-Z0-9_-]/g, "-");
const output = path.resolve("renders/analysis", name);
mkdirSync(output, { recursive: true });
const info = JSON.parse(
  command("ffprobe", [
    "-v",
    "error",
    "-show_streams",
    "-show_format",
    "-of",
    "json",
    file,
  ]),
);
const video = info.streams.find(
  (s: { codec_type: string }) => s.codec_type === "video",
);
if (!video) throw new Error("No video stream found");
const [numerator, denominator] = video.avg_frame_rate.split("/").map(Number);
const fps = numerator / denominator;
const r = spawnSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-nostats",
    "-i",
    file,
    "-vf",
    "scale=320:-2,signalstats,metadata=mode=print",
    "-an",
    "-f",
    "null",
    "-",
  ],
  { encoding: "utf8", maxBuffer: 100_000_000 },
);
if (r.status !== 0) throw new Error(r.stderr.slice(-3000));
type Frame = {
  frame: number;
  time: number;
  YAVG?: number;
  YLOW?: number;
  YHIGH?: number;
  SATAVG?: number;
  YDIF?: number;
};
const frames: Frame[] = [];
let current: Frame | undefined;
for (const line of r.stderr.split("\n")) {
  const position = line.match(
    /frame:(\d+)\s+pts:\s*-?\d+\s+pts_time:([\d.e+-]+)/,
  );
  if (position) {
    current = { frame: Number(position[1]), time: Number(position[2]) };
    frames.push(current);
  }
  const value = line.match(
    /lavfi\.signalstats\.(YAVG|YLOW|YHIGH|SATAVG|YDIF)=([\d.e+-]+)/,
  );
  if (value && current)
    current[value[1] as "YAVG" | "YLOW" | "YHIGH" | "SATAVG" | "YDIF"] = Number(
      value[2],
    );
}
if (
  !frames.length ||
  frames.some(
    (f) =>
      f.YAVG === undefined || f.SATAVG === undefined || f.YDIF === undefined,
  )
)
  throw new Error("FFmpeg did not return complete per-frame measurements");
const average = (key: "YAVG" | "SATAVG" | "YDIF") =>
  frames.reduce((sum, f) => sum + f[key]!, 0) / frames.length;
const report = {
  source: path.resolve(file),
  duration: Number(info.format.duration),
  fps,
  analyzedFrames: frames.length,
  analysisWidth: 320,
  units:
    "FFmpeg signalstats values after resizing to 320px wide; 8-bit YUV samples, not perceptual quality scores.",
  summary: {
    meanLuma: average("YAVG"),
    meanSaturation: average("SATAVG"),
    meanFrameDifference: average("YDIF"),
    meanHighMinusLowLuma:
      frames.reduce((sum, f) => sum + (f.YHIGH! - f.YLOW!), 0) / frames.length,
  },
  largestFrameDifferences: [...frames]
    .sort((a, b) => b.YDIF! - a.YDIF!)
    .slice(0, 20)
    .map((f) => ({ frame: f.frame, time: f.time, difference: f.YDIF })),
  limitations: [
    "Frame difference combines camera motion, character motion, lighting and edits. It is not a camera-motion estimator.",
    "Largest differences are inspection candidates, not confirmed cuts.",
    "Small pixel differences do not establish a still camera. Slow pushes and zooms need visual inspection or a separately validated estimator.",
  ],
  frames,
};
writeJson(`${output}/metrics.json`, report);
command("ffmpeg", [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-i",
  file,
  "-vf",
  "fps=1/5,scale=480:-2,tile=3x4:padding=6:margin=6:color=0xFAF0DC",
  "-frames:v",
  "1",
  `${output}/overview.jpg`,
]);
if (process.argv.includes("--dense")) {
  const perSheet = Math.max(1, Math.round(fps * 2));
  let columns = Math.min(10, perSheet);
  while (perSheet % columns !== 0) columns--;
  const rows = perSheet / columns;
  mkdirSync(`${output}/dense`, { recursive: true });
  command("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    file,
    "-vf",
    `scale=192:-2,tile=${columns}x${rows}:padding=2:margin=2:color=0xFAF0DC`,
    "-fps_mode",
    "passthrough",
    `${output}/dense/sheet-%04d.jpg`,
  ]);
  writeJson(`${output}/dense/index.json`, {
    fps,
    framesPerSheet: perSheet,
    secondsPerFullSheet: perSheet / fps,
    columns,
    rows,
    firstSheetStartsAtFrame: 0,
    note: "Frames remain in source order. The last sheet may be incomplete. For variable-frame-rate input, use per-frame timestamps in metrics.json.",
  });
}
console.log(
  JSON.stringify(
    {
      output,
      analyzedFrames: frames.length,
      ...report.summary,
      limitations: report.limitations,
    },
    null,
    2,
  ),
);
