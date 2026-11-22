import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { edit, e } from "../src/swap3/motion";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable });
try {
  const composition = await selectComposition({
    serveUrl,
    id: "BillionaireSwap3",
    puppeteerInstance: browser,
  });
  const output = path.resolve("renders/billionaire-body-swap-3/review-v1");
  mkdirSync(output, { recursive: true });
  const times = {
    first: 0,
    contractImpact: e.contractHit + 0.04,
    exam: e.paperHit + 0.08,
    teacher: e.working + 0.35,
    accountant: e.accountant + 0.4,
    pencil: e.pencilHit + 0.06,
    deal: e.deal + 0.4,
    figure: e.figure + 0.4,
    question: e.pencil2 + 0.4,
    lawyer: e.lawyer + 0.65,
    caller: e.helpCompany + 0.7,
    examSent: e.helpExam + 0.8,
    teacherPhone: e.answers + 0.65,
    technically: e.me + 0.5,
    wave: e.reveal + 0.7,
    waveEnd: e.reveal + 1.55,
    reaction: e.reaction + 0.4,
    final: edit.duration - 1 / edit.fps,
  };
  for (const [name, t] of Object.entries(times)) {
    if (process.argv[2] && !process.argv[2].split(",").includes(name)) continue;
    await renderStill({
      serveUrl,
      composition,
      puppeteerInstance: browser,
      inputProps: {
        episodeId: "billionaire-body-swap-3",
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
