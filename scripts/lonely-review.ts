import path from "node:path";
import { mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { e, edit } from "../src/lonely/motion";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({
  serveUrl,
  id: "LonelyAroundPeople",
  browserExecutable,
});
const out = path.resolve("renders/lonely-around-people/review-v4");
mkdirSync(out, { recursive: true });
const times = {
  first: 0,
  do: edit.lines.hook.words[1].start + 0.03,
  feel: edit.lines.hook.words[3].start + 0.05,
  alone: e.alone + 0.06,
  crowd: e.alone + 0.7,
  morph: e.included + 0.22,
  included: e.included + 0.65,
  gap: e.gapWord + 0.4,
  more: e.more + 0.8,
  fine: e.fine + 0.6,
  trust: e.trust + 0.5,
  honest: e.honest + 1.1,
  send: e.send + 0.06,
  sent: e.sent + 0.08,
  reply: e.snacks + 1.2,
  bite: e.bite + 0.25,
  payoff: e.payoff + 0.7,
  last: edit.duration - 1 / 60,
};
const selected = process.argv.includes("--diagram")
  ? {
      diagram: e.gapWord + 0.4,
      shine: e.feelConnection + 0.4,
      feel: e.feelConnectionEnd - 0.05,
      more: e.more + 0.8,
    }
  : process.argv.includes("--fixes")
  ? {
      included: e.included + 0.65,
      gap: e.gapWord + 0.4,
      fine: e.invisibleWord + 0.12,
      send: e.send + 0.1,
      sent: e.sent + 0.08,
    }
  : times;
for (const [id, time] of Object.entries(selected)) {
  await renderStill({
    serveUrl,
    composition,
    browserExecutable,
    inputProps: {
      episodeId: "lonely-around-people",
      portrait: true,
      showCaptions: true,
      audioEnabled: false,
    },
    frame: Math.min(Math.round(edit.duration * 60) - 1, Math.round(time * 60)),
    output: `${out}/${id}.png`,
    imageFormat: "png",
  });
  console.log(`Frame ${id}`);
}
