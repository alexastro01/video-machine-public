import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { edit, e } from "../src/ai-typo/motion";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable });
const version = process.env.VIDEO_REVIEW_VERSION ?? "v1";
if (!/^[a-z0-9-]+$/.test(version)) throw new Error("Invalid review version");
const out = path.resolve(`renders/ai-typo/review-${version}`);
mkdirSync(out, { recursive: true });
const times = {
  first: 0,
  earlyOpus: e.opusArrival + 0.5,
  send: e.send + 0.12,
  girl: e.working + 0.65,
  twelve: e.files + 0.35,
  components: e.componentMove + 0.65,
  framework: e.frameworkMove + 0.6,
  opusClose: e.architecture + 0.8,
  us: e.us + 0.5,
  auth: e.authMove + 0.8,
  letters: e.letters + 0.8,
  swap: e.letterMove + 0.25,
  complete: e.complete + 0.9,
  verify: e.verify + 0.4,
  preview: e.preview + 0.6,
  reveal: e.typoReveal + 0.55,
  final: edit.duration - 1 / 60,
};
const captured = [];
try {
  const composition = await selectComposition({
    serveUrl,
    id: "AITypo",
    puppeteerInstance: browser,
  });
  for (const [name, t] of Object.entries(times)) {
    if (process.argv[2] && !process.argv[2].split(",").includes(name)) continue;
    const frame = Math.min(
      composition.durationInFrames - 1,
      Math.round(t * 60),
    );
    await renderStill({
      serveUrl,
      composition,
      puppeteerInstance: browser,
      inputProps: {
        episodeId: "ai-typo",
        portrait: true,
        showCaptions: true,
        audioEnabled: false,
      },
      frame,
      output: `${out}/${name}.png`,
      imageFormat: "png",
    });
    captured.push({
      name,
      frame,
      time: frame / 60,
      file: `renders/ai-typo/review-${version}/${name}.png`,
    });
    console.log(name);
  }
  writeFileSync(`${out}/frames.json`, JSON.stringify(captured, null, 2) + "\n");
} finally {
  await browser.close({ silent: true });
}
