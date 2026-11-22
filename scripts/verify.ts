import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  checkpoint,
  command,
  episodeId,
  loadEpisode,
  writeJson,
  exportStem,
  json,
} from "./common";
import { episodeSchema } from "../src/engine/schema";
const id = episodeId(process.argv[2]);
const variant = process.argv.find((a) => a.startsWith("--variant="))?.slice(10);
if (variant && !/^[a-z0-9-]+$/.test(variant)) throw new Error("Invalid variant slug");
const episode = variant
  ? episodeSchema.parse(json(`episodes/${id}/variants/${variant}/episode.json`))
  : loadEpisode(id);
const name = process.argv.find((a) => a.startsWith("--name="))?.slice(7);
const playbackSpeed = Number(
  process.argv.find((a) => a.startsWith("--speed="))?.slice(8) ?? "1",
);
if (!Number.isFinite(playbackSpeed) || playbackSpeed <= 0)
  throw new Error("--speed must be a positive number");
const expectedDuration = episode.duration / playbackSpeed;
if (name) exportStem(name, "portrait");
const output: Record<string, unknown> = {};
for (const [format, width, height] of [
  ["landscape", 1920, 1080],
  ["portrait", 1080, 1920],
] as const) {
  if (
    name &&
    format !== (episode.aspectRatio === "9:16" ? "portrait" : "landscape")
  )
    continue;
  const file = `renders/${id}/${name ?? format}.mp4`;
  if (!existsSync(file)) continue;
  const metadata = JSON.parse(
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
  const video = metadata.streams.find(
    (s: { codec_type: string }) => s.codec_type === "video",
  );
  const audio = metadata.streams.find(
    (s: { codec_type: string }) => s.codec_type === "audio",
  );
  if (!video || !audio)
    throw new Error(`${format}: missing video or audio stream`);
  if (video.width !== width || video.height !== height)
    throw new Error(`${format}: wrong dimensions`);
  if (Number(video.nb_frames) !== Math.round(expectedDuration * episode.fps))
    throw new Error(`${format}: wrong frame count`);
  if (Math.abs(Number(metadata.format.duration) - expectedDuration) > 0.05)
    throw new Error(`${format}: wrong duration`);
  if (video.pix_fmt !== "yuv420p")
    throw new Error(`${format}: expected widely supported yuv420p`);
  command("ffmpeg", ["-v", "error", "-i", file, "-f", "null", "-"]);
  const measured = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-i",
      file,
      "-af",
      "ebur128=peak=true",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8", maxBuffer: 8_000_000 },
  );
  if (measured.status !== 0) throw new Error("Audio analysis failed");
  const integrated = [
    ...measured.stderr.matchAll(/\bI:\s*(-?[\d.]+)\s*LUFS/g),
  ].at(-1);
  const peak = [...measured.stderr.matchAll(/Peak:\s*(-?[\d.]+)\s*dBFS/g)].at(
    -1,
  );
  if (!integrated || !peak) throw new Error("Audio metrics were not returned");
  if (Number(peak[1]) >= 0)
    throw new Error(`${format}: audio true peak reaches clipping`);
  output[format] = {
    playbackSpeed,
    sourceDuration: episode.duration,
    duration: Number(metadata.format.duration),
    frames: Number(video.nb_frames),
    width,
    height,
    videoCodec: video.codec_name,
    audioCodec: audio.codec_name,
    audioSampleRate: audio.sample_rate,
    pixelFormat: video.pix_fmt,
    colorSpace: video.color_space,
    colorRange: video.color_range,
    decodedWithoutErrors: true,
    integratedLufs: Number(integrated[1]),
    truePeakDbfs: Number(peak[1]),
  };
  mkdirSync(`renders/${id}/checks`, { recursive: true });
  command("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    file,
    "-vf",
    format === "landscape"
      ? "fps=1/5,scale=480:270,tile=3x4:padding=8:margin=8:color=0xFAF0DC"
      : "fps=1/10,scale=270:480,tile=3x2:padding=8:margin=8:color=0xFAF0DC",
    "-frames:v",
    "1",
    `renders/${id}/checks/${name ?? format}-contact.jpg`,
  ]);
}
if (!Object.keys(output).length) throw new Error("No final exports found");
writeJson(`renders/${id}/verification${name ? `-${name}` : ""}.json`, output);
checkpoint(id, variant ? `variantVerified-${variant}` : "exportVerified", output);
console.log(JSON.stringify(output, null, 2));
