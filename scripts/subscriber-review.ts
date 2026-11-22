import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { edit, e } from "../src/subscriber/motion";

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable });
const out = path.resolve("renders/full-stack-subscriber/review-v1");
mkdirSync(out, { recursive: true });
const times = {
  hook: 0.35,
  opus: e.limit_opus + 0.45,
  astra: e.limit_astra + 0.3,
  gemini: e.limit_gemini + 0.4,
  clock: e.clockMove + 0.5,
  clockReply: e.clock_reply + 0.4,
  trial: e.trialSubmit - 0.1,
  recognize: e.recognize + 0.55,
  billing: e.paid + 0.35,
  compare: e.compareMove + 0.65,
  limitAgain: e.limit_again + 0.8,
  inventory: e.dashboardCount + 0.6,
  broken: e.broken + 0.35,
  cvQuestion: e.cv_question + 1.0,
  developer: e.cvDeveloper + 0.3,
  morph: e.morph + 0.25,
  subscriber: e.morph + 0.7,
  nod: e.nodDown + 0.08,
  final: edit.duration - 1 / 60,
};
const frames: { name: string; frame: number; time: number; file: string }[] =
  [];
try {
  const composition = await selectComposition({
    serveUrl,
    id: "FullStackSubscriber",
    puppeteerInstance: browser,
  });
  for (const [name, time] of Object.entries(times)) {
    if (process.argv[2] && !process.argv[2].split(",").includes(name)) continue;
    const frame = Math.min(
      composition.durationInFrames - 1,
      Math.round(time * 60),
    );
    await renderStill({
      serveUrl,
      composition,
      puppeteerInstance: browser,
      inputProps: {
        episodeId: "full-stack-subscriber",
        portrait: true,
        showCaptions: true,
        audioEnabled: false,
      },
      frame,
      output: `${out}/${name}.png`,
      imageFormat: "png",
    });
    frames.push({
      name,
      frame,
      time: frame / 60,
      file: `renders/full-stack-subscriber/review-v1/${name}.png`,
    });
    console.log(name);
  }
  writeFileSync(`${out}/frames.json`, JSON.stringify(frames, null, 2) + "\n");
} finally {
  await browser.close({ silent: true });
}
