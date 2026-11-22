import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { edit, e } from "../src/swap5/motion";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable });
const version =
  process.argv.find((arg) => arg.startsWith("--version="))?.slice(10) ?? "v2";
if (!/^[a-z0-9-]+$/.test(version)) throw new Error("Invalid review version");
const selected = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
try {
  const composition = await selectComposition({
    serveUrl,
    id: "BillionaireSwap5",
    puppeteerInstance: browser,
  });
  const output = path.resolve(
    `renders/billionaire-body-swap-5/review-${version}`,
  );
  mkdirSync(output, { recursive: true });
  const times = {
    first: 0,
    faceAccepted: e.faceUnlock + 0.15,
    callerIntro: e.callerReveal + 0.2,
    question: e.bankQuestion + 0.35,
    caller: e.questionCaller + 0.2,
    assistant: e.assistant + 0.65,
    correction: e.six + 0.5,
    typing: e.firstType + 0.6,
    tapEnd: e.firstType + 1.55,
    wrong: e.wrong + 0.35,
    capitals: e.reject2 + 0.12,
    business: e.business + 0.5,
    office: e.office + 0.35,
    boxClosed: e.cage + 0.05,
    lidPeak: e.lidOpen + 0.3,
    box: e.shoebox + 0.35,
    wheel: e.wheel + 0.55,
    wheelSettled: e.wheel + 1.5,
    hostage: e.hostage + 0.5,
    remembering: e.nibbles + 0.2,
    name: e.name + 0.45,
    accepted: e.success + 0.4,
    vaultOpening: e.vaultOpen + 0.35,
    vault: e.payoff + 0.35,
    salute: e.guard + 0.6,
    settled: e.guard + 1.55,
    final: edit.duration - 1 / edit.fps,
  };
  for (const [name, t] of Object.entries(times)) {
    if (selected && !selected.split(",").includes(name)) continue;
    await renderStill({
      serveUrl,
      composition,
      puppeteerInstance: browser,
      inputProps: {
        episodeId: "billionaire-body-swap-5",
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
