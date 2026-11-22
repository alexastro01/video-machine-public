import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { edit, e } from "../src/review-loop/motion";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable });
const folder = path.resolve("renders/ai-review-loop/review-v4");
mkdirSync(folder, { recursive: true });
const times = {
  hook: 0.3,
  opus: e.opusEdit + 0.35,
  gemini: e.geminiEdit + 0.4,
  astra: e.astraEdit + 0.35,
  glance: e.glance + 0.27,
  merge: e.hoverOver + 0.35,
  wide: e.loopStart + 0.2,
  carousel: e.loopStart + 0.65,
  comparison: e.compare + 0.4,
  zero: e.diffReveal + 0.4,
  hours: e.hours + 0.8,
  cleaner: e.cleaner + 0.6,
  final: edit.duration - 1 / 60,
};
const frames = [];
try {
  const composition = await selectComposition({
    serveUrl,
    id: "AIReviewLoop",
    puppeteerInstance: browser,
  });
  for (const [name, time] of Object.entries(times)) {
    const frame = Math.min(
      composition.durationInFrames - 1,
      Math.round(time * 60),
    );
    await renderStill({
      serveUrl,
      composition,
      puppeteerInstance: browser,
      inputProps: {
        episodeId: "ai-review-loop",
        portrait: true,
        showCaptions: true,
        audioEnabled: false,
      },
      frame,
      output: `${folder}/${name}.png`,
      imageFormat: "png",
    });
    frames.push({ name, frame, time: frame / 60 });
    console.log(name);
  }
  writeFileSync(
    `${folder}/frames.json`,
    JSON.stringify(frames, null, 2) + "\n",
  );
} finally {
  await browser.close({ silent: true });
}
