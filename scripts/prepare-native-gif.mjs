// Decode generated motion and prepare compositor assets. This command never
// generates motion, interpolates frames, or calls a model.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import console from "node:console";
import { homedir } from "node:os";
import { PNG } from "pngjs";

const input = process.argv[2];
const keyColor = process.argv.find((arg) => arg.startsWith("--key-color="))?.slice(12);
// --protect-interior restores source RGB inside the eroded silhouette after
// despill (needed when costume colours sit close to the key, e.g. purple).
const protectInterior = process.argv.includes("--protect-interior");
if (keyColor && !/^[0-9a-f]{6}$/i.test(keyColor))
  throw new Error("--key-color needs six hexadecimal digits");
if (!input?.endsWith(".gif")) throw new Error("Pass a generated source .gif");
const dir = path.dirname(input),
  stem = path.basename(input, ".gif");
const run = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args]);
const probe = JSON.parse(
  execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-count_frames",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      input,
    ],
    { encoding: "utf8" },
  ),
);
const stream = probe.streams.find((s) => s.codec_type === "video");
if (!stream || stream.codec_name !== "gif")
  throw new Error("Input is not a GIF");
const frameCount = Number(stream.nb_read_frames),
  duration = Number(probe.format.duration);
if (frameCount < 2 || frameCount > 16)
  throw new Error("Expected 2–16 native animation frames");
const [num, den] = stream.r_frame_rate.split("/").map(Number);
const fps = num / den;
if (Math.abs(frameCount / fps - duration) > 0.015)
  throw new Error(
    "Variable frame durations need explicit timing support; no frames were retimed",
  );
const framesDir = path.join(dir, "frames");
mkdirSync(framesDir, { recursive: true });
if (keyColor) {
  const rawFrames = path.join(dir, "raw-frames");
  mkdirSync(rawFrames, { recursive: true });
  run(["-i", input, "-vf", "format=rgba", "-fps_mode", "passthrough",
    path.join(rawFrames, "frame-%02d.png")]);
  const helper = path.join(process.env.CODEX_HOME ?? path.join(homedir(), ".codex"),
    "skills/.system/imagegen/scripts/remove_chroma_key.py");
  for (let i = 1; i <= frameCount; i++) {
    const file = `frame-${String(i).padStart(2, "0")}.png`;
    execFileSync("uv", ["run", "--quiet", "--with", "pillow", "python", helper,
      "--input", path.join(rawFrames, file), "--out", path.join(framesDir, file),
      "--key-color", `#${keyColor}`, "--soft-matte", "--transparent-threshold", "36",
      "--opaque-threshold", "130", "--despill"], { stdio: "pipe" });
    if (protectInterior)
      execFileSync("uv", ["run", "--quiet", "--with", "pillow", "--with", "numpy", "python",
        "scripts/protect-interior.py", path.join(rawFrames, file), path.join(framesDir, file),
        keyColor], { stdio: "pipe" });
  }
} else {
  run(["-i", input, "-vf", "format=rgba,colorkey=0x00ff00:0.23:0,despill=type=green",
    "-fps_mode", "passthrough", path.join(framesDir, "frame-%02d.png")]);
}
run([
  "-framerate",
  String(fps),
  "-i",
  path.join(framesDir, "frame-%02d.png"),
  "-filter_complex",
  "[0:v]split[a][b];[a]palettegen=reserve_transparent=1:stats_mode=full[p];[b][p]paletteuse=dither=none:alpha_threshold=128",
  "-loop",
  "0",
  path.join(dir, `${stem}-transparent.gif`),
]);
run([
  "-f",
  "lavfi",
  "-i",
  `color=c=0xDDD2BA:s=${stream.width}x${stream.height}:r=${fps}:d=${duration},format=rgba`,
  "-framerate",
  String(fps),
  "-i",
  path.join(framesDir, "frame-%02d.png"),
  "-filter_complex",
  "[0:v][1:v]overlay=shortest=1:format=auto,split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=none[v]",
  "-map",
  "[v]",
  "-loop",
  "0",
  path.join(dir, `${stem}-preview.gif`),
]);
run([
  "-i",
  path.join(dir, `${stem}-preview.gif`),
  "-vf",
  `scale=200:200:flags=neighbor,tile=6x${Math.ceil(frameCount / 6)}:padding=6:margin=6:color=0x152a3e`,
  "-frames:v",
  "1",
  path.join(dir, "preview-contact-sheet.png"),
]);
const columns = 4,
  rows = Math.ceil(frameCount / columns),
  w = stream.width,
  h = stream.height;
const atlas = new PNG({ width: columns * w, height: rows * h });
const cells = [];
for (let f = 0; f < frameCount; f++) {
  const frame = PNG.sync.read(
    readFileSync(
      path.join(framesDir, `frame-${String(f + 1).padStart(2, "0")}.png`),
    ),
  );
  const originX = (f % columns) * w,
    originY = Math.floor(f / columns) * h;
  let left = w,
    right = 0,
    top = h,
    bottom = 0,
    pixels = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4,
        di = ((y + originY) * atlas.width + x + originX) * 4;
      for (let c = 0; c < 4; c++) atlas.data[di + c] = frame.data[si + c];
      if (frame.data[si + 3] >= 166) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        pixels++;
      }
    }
  if (!pixels) throw new Error(`Frame ${f} is empty after matte removal`);
  cells.push({
    frame: f,
    originX,
    originY,
    left,
    top,
    right,
    bottom,
    pixels,
    durationMs: 1000 / fps,
  });
}
const x = Math.max(0, Math.min(...cells.map((c) => c.left)) - 4),
  y = Math.max(0, Math.min(...cells.map((c) => c.top)) - 4);
const crop = {
  x,
  y,
  width: Math.min(w - x, Math.max(...cells.map((c) => c.right)) - x + 5),
  height: Math.min(h - y, Math.max(...cells.map((c) => c.bottom)) - y + 5),
};
writeFileSync(path.join(dir, `${stem}-atlas.png`), PNG.sync.write(atlas));
const inspection = {
  nativeModelMotion: true,
  processing:
    keyColor
      ? `Decoded native GIF; soft #${keyColor} matte and despill${protectInterior ? "; source RGB restored inside the 2px-eroded silhouette" : ""}; no interpolation or motion synthesis.`
      : "Decoded native GIF; removed green matte and spill; no interpolation or motion synthesis.",
  source: path.basename(input),
  width: atlas.width,
  height: atlas.height,
  columns,
  rows,
  cellWidth: w,
  cellHeight: h,
  frameCount,
  frameDurationMs: 1000 / fps,
  durationSeconds: duration,
  crop,
  cells,
  clipping: cells
    .filter(
      (c) => c.top <= 1 || c.left <= 1 || c.right >= w - 2 || c.bottom >= h - 2,
    )
    .map((c) => c.frame),
  minimumTopMargin: Math.min(...cells.map((c) => c.top)),
  minimumBottomMargin: h - 1 - Math.max(...cells.map((c) => c.bottom)),
};
writeFileSync(
  path.join(dir, `${stem}-atlas.json`),
  JSON.stringify(inspection, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    frameCount,
    duration,
    size: [w, h],
    clipping: inspection.clipping,
    minimumTopMargin: inspection.minimumTopMargin,
    minimumBottomMargin: inspection.minimumBottomMargin,
  }),
);
