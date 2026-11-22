import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { edit, e } from "../src/nvidia/motion";

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable });
const motion = process.argv.includes("--motion");
const folder = path.resolve(
  `renders/nvidia-four-trillion/staging-v3${motion ? "-motion" : ""}`,
);
mkdirSync(folder, { recursive: true });
const times: Record<string, number> = motion
  ? {
      "opening-0": 0,
      "opening-1": e.impact - 0.02,
      "opening-2": e.impact + 0.08,
      "opening-3": e.impact + 0.3,
      "flashback-0": e.diner - 0.02,
      "flashback-1": e.diner + 0.12,
      "flashback-2": e.diner + 0.32,
      "failure-before": e.fail - 0.1,
      "failure-after": e.fail + 0.15,
      "drawer-before": e.drawer,
      "drawer-moving": e.drawer + 0.3,
      "drawer-open": e.drawer + 0.65,
      "phone-before": e.sega,
      "phone-lift": e.sega + 0.32,
      "phone-held": e.sega + 0.55,
      "phone-concerned": e.request + 0.6,
      "phone-relief": e.confirm + 0.2,
      "build-start": e.redesign + 0.1,
      "build-prepare": e.redesign + 0.2,
      "build-contact": e.redesign + 0.35,
      "build-chips": e.redesign + 0.7,
      "build-ready": e.boardLock + 0.25,
      "shipping-start": e.shipping + 0.1,
      "shipping-finish": e.shipping + 0.9,
      "compute-transition": e.cuda + 0.14,
      "compute-start": e.cuda + 0.4,
      "parallel-before": e.parallel - 0.02,
      "parallel-after": e.parallel + 0.02,
      "parallel-flow": e.parallel + 0.6,
      "network-start": e.networkStart,
      "network-layer": e.networkStart + 0.3,
      "network-ready": e.networkStart + 0.8,
      "servers-transition": e.ai + 0.12,
      "servers-power": e.ai + 0.4,
      "servers-wide": e.ai + 1.8,
      "value-before": e.valueStart - 0.02,
      "value-arrives": e.valueStart + 0.2,
      "value-hold": e.valueStart + 1,
    }
  : {
      hook: 0.5,
      diner: e.diner + 1.7,
      coffee: e.coffee + 0.5,
      gaming: e.gaming + 1.0,
      failure: e.fail + 0.2,
      cash: 19,
      cashClosed: e.cash + 0.03,
      cashReturn: e.cash + 1.59,
      inspect: e.cuda + 1.1,
      cart: e.shipping + 0.83,
      date: e.milestone + 1.0,
      request: e.request + 1.0,
      agreement: e.agreement + 0.45,
      riva: e.riva + 1.5,
      redesign: e.redesign + 0.7,
      parallel: e.parallel + 1,
      learning: e.learning + 2,
      servers: e.platform + 1,
      value: e.valueStart + 1.5,
      final: edit.duration - 1 / 60,
    };
const chosen = process.argv
  .slice(2)
  .find((x) => !x.startsWith("--"))
  ?.split(",");
const entries = [];
try {
  const composition = await selectComposition({
    serveUrl,
    id: "NvidiaFourTrillion",
    puppeteerInstance: browser,
  });
  for (const [name, time] of Object.entries(times)) {
    if (chosen && !chosen.includes(name)) continue;
    const frame = Math.min(
      composition.durationInFrames - 1,
      Math.round(time * 60),
    );
    const output = `${folder}/${name}.png`;
    await renderStill({
      serveUrl,
      composition,
      puppeteerInstance: browser,
      frame,
      scale: 0.5,
      output,
      inputProps: {
        episodeId: "nvidia-four-trillion",
        portrait: true,
        showCaptions: true,
        audioEnabled: false,
      },
      imageFormat: "png",
    });
    entries.push({ name, time: frame / 60, frame, file: output });
    console.log(name);
  }
  writeFileSync(
    `${folder}/frames.json`,
    JSON.stringify(entries, null, 2) + "\n",
  );
} finally {
  await browser.close({ silent: true });
}
