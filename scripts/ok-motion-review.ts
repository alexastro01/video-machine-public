import path from "node:path";
import { mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { browserExecutable } from "./browser";
import edit from "../episodes/ok-message-motion/edit.json";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({
  serveUrl,
  id: "OKMessageMotion",
  browserExecutable,
});
const out = path.resolve("renders/ok-message-motion/review");
mkdirSync(out, { recursive: true });
const e = edit.events;
const reviewTimes = process.argv.includes("--boundaries")
  ? { studyStart: e.study, senderStart: e.sender, payoffStart: e.payoff }
  : {
      intro: 0.8,
      push: e.introPush + 0.5,
      reading: e.reading + 0.7,
      imagined: e.imagined + 0.3,
      cues: e.cues + 0.35,
      voice: e.voice + 0.3,
      face: e.face + 0.3,
      argument: e.argument + 0.7,
      study: e.study + 0.5,
      transfer: e.studyTransfer + 0.85,
      draft: e.reconsider + 0.8,
      erase: e.reveal + 0.35,
      sender: e.sender + 0.5,
      bite: e.bite + 0.3,
      finger: e.finger + 0.55,
      payoff: e.payoff + 0.5,
      napkins: e.napkins + 0.4,
      last: edit.duration - 0.1,
    };
for (const [id, time] of Object.entries(reviewTimes)) {
  await renderStill({
    serveUrl,
    composition,
    frame: Math.floor(time * edit.fps),
    output: `${out}/${id}.png`,
    imageFormat: "png",
    browserExecutable,
    inputProps: {
      episodeId: "ok-message-motion",
      portrait: true,
      showCaptions: true,
      audioEnabled: false,
    },
  });
  console.log(`Frame ${id}`);
}
