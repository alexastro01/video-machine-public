// Render an existing packed Blender scene and sample its resource use locally.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import console from "node:console";
import { spawn, execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const config = JSON.parse(
  fs.readFileSync("blender/survive-1500/cottage-test-v1.json", "utf8"),
);
const directory = path.resolve("renders/survive-1500/blender-test-v1");
fs.mkdirSync(directory, { recursive: true });
const log = fs.createWriteStream(`${directory}/blender-render.log`);
const samples = [];
function gpuSample() {
  const line = execFileSync(
    "ioreg",
    ["-r", "-c", "AGXAccelerator", "-d", "1"],
    { encoding: "utf8" },
  )
    .split("\n")
    .find((value) => value.includes('"PerformanceStatistics"'));
  if (!line) return null;
  const stats = Object.fromEntries(
    [...line.matchAll(/"([^"]+)"=(-?\d+)/g)].map((m) => [m[1], Number(m[2])]),
  );
  return {
    devicePercent: stats["Device Utilization %"],
    rendererPercent: stats["Renderer Utilization %"],
    inUseBytes: stats["In use system memory"],
  };
}
const baseline = gpuSample();
const started = performance.now();
const child = spawn(
  "blender",
  [
    "--background",
    path.resolve(config.sceneFile),
    "--render-output",
    path.resolve(config.framesFolder) + "/",
    "--render-format",
    "PNG",
    "--frame-start",
    "1",
    "--frame-end",
    String(config.frames),
    "--render-anim",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let pending = "";
child.stdout.on("data", (chunk) => {
  log.write(chunk);
  pending += chunk.toString();
  const lines = pending.split("\n");
  pending = lines.pop() ?? "";
  for (const line of lines) {
    const match = line.match(/Saved:.*\/(\d{4})\.png/);
    if (match && (Number(match[1]) % 30 === 0 || Number(match[1]) === 1))
      console.log(
        `Blender ${match[1]}/${config.frames}; ${((performance.now() - started) / 1000).toFixed(1)} seconds`,
      );
  }
});
child.stderr.on("data", (chunk) => log.write(chunk));
function sample() {
  try {
    const [rssKiB, cpuPercent] = execFileSync(
      "ps",
      ["-o", "rss=,%cpu=", "-p", String(child.pid)],
      { encoding: "utf8" },
    )
      .trim()
      .split(/\s+/)
      .map(Number);
    samples.push({
      elapsedSeconds: (performance.now() - started) / 1000,
      rssBytes: rssKiB * 1024,
      cpuPercentOneCore: cpuPercent,
      gpu: gpuSample(),
    });
  } catch {
    // The process may exit between the sampling timer and ps.
  }
}
const timer = setInterval(sample, 2000);
const code = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", resolve);
});
clearInterval(timer);
log.end();
const elapsedSeconds = (performance.now() - started) / 1000;
const frameCount = fs
  .readdirSync(config.framesFolder)
  .filter((file) => /^\d{4}\.png$/.test(file)).length;
const mean = (values) =>
  values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
const gpu = samples.map((s) => s.gpu).filter(Boolean);
const report = {
  completedAt: new Date().toISOString(),
  exitCode: code,
  renderWallSeconds: elapsedSeconds,
  frames: frameCount,
  secondsPerFrameIncludingStartup: elapsedSeconds / frameCount,
  resolution: [config.render.width, config.render.height],
  samplesPerPixel: config.render.samples,
  peakProcessResidentGiB:
    Math.max(0, ...samples.map((s) => s.rssBytes)) / 1024 ** 3,
  meanCpuPercentOneCore: mean(samples.map((s) => s.cpuPercentOneCore)),
  peakCpuPercentOneCore: Math.max(
    0,
    ...samples.map((s) => s.cpuPercentOneCore),
  ),
  logicalCpuCores: os.cpus().length,
  gpuSystemWide: {
    baseline,
    meanDevicePercent: mean(gpu.map((s) => s.devicePercent)),
    peakDevicePercent: Math.max(0, ...gpu.map((s) => s.devicePercent)),
    peakInUseGiB: Math.max(0, ...gpu.map((s) => s.inUseBytes)) / 1024 ** 3,
  },
  sampleIntervalSeconds: 2,
  measurements: samples.length,
  limitations:
    "GPU counters cover the whole Mac, not just Blender. Process RSS is not total unified graphics memory; do not add these measures together. Earlier stills warmed the shader cache; desktop apps remained open.",
};
fs.writeFileSync(
  `${directory}/resource-measurements.json`,
  JSON.stringify(report, null, 2) + "\n",
);
fs.writeFileSync(
  `${directory}/resource-samples.json`,
  JSON.stringify(samples, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
if (code !== 0 || frameCount !== config.frames) process.exitCode = 1;
