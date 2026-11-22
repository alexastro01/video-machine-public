import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { command } from "./common";

const out = path.resolve("renders/survive-1500/blender-test-v1");
mkdirSync(out, { recursive: true });
const frameArg = process.argv.find((arg) => arg.startsWith("--frame="));
const inputProps = { audioEnabled: false };
const frame = frameArg ? Number(frameArg.slice(8)) : null;
const required =
  frame === null ? Array.from({ length: 300 }, (_, i) => i + 1) : [frame + 1];
for (const index of required) {
  if (
    !existsSync(
      `public/episodes/survive-1500/blender-cottage-test-v1/frames/${String(index).padStart(4, "0")}.png`,
    )
  )
    throw new Error(
      `Blender frame ${index} is missing; finish the world render first.`,
    );
}
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({
  serveUrl,
  id: "BlenderCottageTest",
  inputProps,
  browserExecutable,
});
if (frame !== null) {
  await renderStill({
    serveUrl,
    composition,
    inputProps,
    browserExecutable,
    frame,
    imageFormat: "png",
    output: `${out}/composite-${frame}.png`,
  });
  console.log(`${out}/composite-${frame}.png`);
} else {
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    browserExecutable,
    outputLocation: `${out}/picture-only.mp4`,
    codec: "h264",
    crf: 16,
    pixelFormat: "yuv420p",
    colorSpace: "bt709",
    imageFormat: "png",
    concurrency: 2,
    onProgress: ({ progress }) => {
      const percent = Math.floor(progress * 10) * 10;
      if (percent > last) {
        last = percent;
        console.log(`Compositing ${percent}%`);
      }
    },
  });
  const output = path.resolve(
    "renders/survive-1500/survive-1500-blender-test-v1.mp4",
  );
  command("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    `${out}/picture-only.mp4`,
    "-i",
    "renders/survive-1500/survive-1500-v4.mp4",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-t",
    "10",
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    output,
  ]);
  console.log(output);
}
