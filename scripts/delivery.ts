import { renameSync, rmSync } from "node:fs";
import { command } from "./common";

/** Mux a frame-locked edit's PCM master, preserving the video and its exact ending. */
export function muxTimedMaster(
  file: string,
  master: string,
  seconds: number,
  destination = file,
  channels: 1 | 2 = 2,
) {
  const temporary = destination + ".master-" + process.pid + ".mp4";
  try {
    command("ffmpeg", [
      "-v", "error", "-y", "-i", file, "-i", master,
      "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
      "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", String(channels),
      "-t", String(seconds), "-movflags", "+faststart", temporary,
    ]);
    renameSync(temporary, destination);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function normalizeDelivery(file: string) {
  const probe = JSON.parse(
    command("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=pix_fmt,color_range,color_space",
      "-of",
      "json",
      file,
    ]),
  );
  const video = probe.streams[0];
  if (
    video.pix_fmt === "yuv420p" &&
    video.color_range === "tv" &&
    video.color_space === "bt709"
  )
    return;
  const output = file.replace(/\.mp4$/, ".delivery.mp4");
  if (output === file) throw new Error("Delivery normalization expects an MP4");
  command("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    file,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-vf",
    "scale=in_range=auto:out_range=tv:out_color_matrix=bt709,format=yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    "-color_range",
    "tv",
    "-colorspace",
    "bt709",
    "-color_trc",
    "bt709",
    "-color_primaries",
    "bt709",
    "-c:a",
    "copy",
    "-movflags",
    "+faststart",
    output,
  ]);
  renameSync(output, file);
}
