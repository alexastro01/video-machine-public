import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { e, edit } from "../src/start-task/v3-motion";

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable });
try {
  const composition = await selectComposition({
    serveUrl,
    id: "StartTheTask",
    puppeteerInstance: browser,
  });
  const output = path.resolve("renders/start-the-task/review-v3");
  mkdirSync(output, { recursive: true });
  const times = {
    first: 0,
    impact: e.cupImpact + 0.04,
    zero: e.zero + 0.1,
    goal: e.goalWord + 0.3,
    contact: e.contact + 0.1,
    open: e.file + 0.45,
    typed: e.sentenceDone + 0.03,
    research: e.means + 0.4,
    concrete: e.concrete + 0.22,
    viewer: e.viewerFocus + 0.5,
    returned: e.returnEnd + 0.15,
    coffee: e.coffeeWord + 0.6,
    final: edit.duration - 1 / edit.fps,
  };
  for (const [name, t] of Object.entries(times)) {
    await renderStill({
      serveUrl,
      composition,
      puppeteerInstance: browser,
      inputProps: {
        episodeId: "start-the-task",
        portrait: true,
        showCaptions: true,
        audioEnabled: false,
      },
      frame: Math.min(
        composition.durationInFrames - 1,
        Math.round(t * edit.fps),
      ),
      output: `${output}/${name}.png`,
      imageFormat: "png",
    });
    console.log(name);
  }
  writeFileSync(`${output}/frames.json`, JSON.stringify(times, null, 2) + "\n");
} finally {
  await browser.close({ silent: true });
}
