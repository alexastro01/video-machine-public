import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { edit, e } from "../src/swap4/motion";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable });
try {
  const composition = await selectComposition({
    serveUrl,
    id: "BillionaireSwap4",
    puppeteerInstance: browser,
  });
  const output = path.resolve("renders/billionaire-body-swap-4/review-v3");
  mkdirSync(output, { recursive: true });
  const times = {
    first: 0,
    reportContact: e.reportHit + 0.04,
    premise: 1.8,
    school: e.school + 0.45,
    lawyer: e.lawyer + 0.5,
    mumStop: e.stay + 0.5,
    reportOpen: e.internship + 0.45,
    reportPeak: e.reportOpen + .30,
    talent: e.talent + 0.65,
    talentEnd: e.talent + 1.55,
    project: e.partner + 0.9,
    projectEnd: e.exposure - 0.08,
    exposure: e.exposure + 0.4,
    mum: e.familiar + 0.4,
    salary: e.salary + 0.65,
    complaint: e.fire + 0.45,
    performance: e.performance + 0.4,
    result: e.result + 0.6,
    exactly: e.exactly + 0.3,
    manager: e.manager + 0.4,
    phone: e.managerPhone + 0.5,
    procedure: e.procedure + 0.4,
    trip: e.trip + 0.35,
    expense: e.expense + 0.55,
    hopeful: e.worked + 0.5,
    hopefulEnd: e.worked + 1.55,
    reaction: e.reaction + 0.45,
    questionStart: e.cta + 0.2,
    questionHand: e.cta + 0.7,
    questionSettle: e.cta + 1.6,
    final: edit.duration - 1 / edit.fps,
  };
  for (const [name, t] of Object.entries(times)) {
    if (process.argv[2] && !process.argv[2].split(",").includes(name)) continue;
    await renderStill({
      serveUrl,
      composition,
      puppeteerInstance: browser,
      inputProps: {
        episodeId: "billionaire-body-swap-4",
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
