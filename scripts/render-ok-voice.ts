import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { command } from "./common";
import current from "../episodes/ok-message-motion/speed-1p2x.json";
import teen from "../episodes/ok-message-motion-teen/speed-1p2x.json";
import teenEdit from "../episodes/ok-message-motion-teen/edit.json";
import currentEdit from "../episodes/ok-message-motion/edit.json";

const voice = process.argv[2] ?? "teen";
if (voice !== "current" && voice !== "teen")
  throw new Error("Choose current or teen");
const data = voice === "teen" ? teen : current,
  edit = voice === "teen" ? teenEdit : currentEdit;
command(process.execPath, [
  "--import",
  "tsx",
  "scripts/check.ts",
  data.sourceEpisode,
]);
const out = path.resolve("renders/ok-message-motion");
mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({
  serveUrl,
  id: data.composition,
  browserExecutable,
  inputProps: { voice, audioEnabled: true },
});
if (
  process.argv.includes("--stills") ||
  process.argv.includes("--motion-review")
) {
  const reviewTimes = process.argv.includes("--motion-review")
    ? {
        "tone-enter": edit.events.imagined + 0.08,
        "tone-settled": edit.events.imagined + 0.24,
        "tone-exit": edit.events.imaginedEnd + 0.06,
        "mail-moving": edit.events.studyTransfer + 0.36,
        "mail-arrived": edit.events.studyTransfer + 0.85,
        "tap-approach": edit.events.finger + 0.3,
        "tap-contact": edit.events.finger + 0.5,
        "tap-settled": edit.events.finger + 0.95,
      }
    : {
        hook: 0.8,
        imagined: edit.events.imagined + 0.3,
        cues: edit.events.face + 0.2,
        study: edit.events.studyTransfer + 0.9,
        sender: edit.events.finger + 0.4,
        payoff: edit.events.napkins + 0.4,
      };
  for (const [name, time] of Object.entries(reviewTimes)) {
    const output = path.join(out, `${voice}-1p2x-${name}.png`);
    await renderStill({
      serveUrl,
      composition,
      browserExecutable,
      inputProps: { voice, audioEnabled: false },
      frame: Math.floor((time / data.playbackRate) * data.fps),
      output,
      imageFormat: "png",
    });
    console.log(output);
  }
} else {
  const name =
    process.argv.find((x) => x.startsWith("--name="))?.slice(7) ??
    (voice === "teen"
      ? "ok-message-teen-boy-voice-1p2x-v1"
      : "ok-message-current-voice-1p2x-v1");
  if (!/^[a-zA-Z0-9_-]+$/.test(name))
    throw new Error("Use a simple output filename");
  const output = path.join(out, name + ".mp4");
  if (existsSync(output))
    throw new Error("Named export exists; use --name= with a new version");
  let prior = -1;
  await renderMedia({
    serveUrl,
    composition,
    browserExecutable,
    inputProps: { voice, audioEnabled: true },
    outputLocation: output,
    codec: "h264",
    crf: 16,
    imageFormat: "png",
    pixelFormat: "yuv420p",
    colorSpace: "bt709",
    concurrency: 4,
    onProgress: ({ progress }) => {
      const percent = Math.floor(progress * 10) * 10;
      if (percent > prior) {
        prior = percent;
        console.log(`Rendering ${voice} ${percent}%`);
      }
    },
  });
  console.log(output);
}
