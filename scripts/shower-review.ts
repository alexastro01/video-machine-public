import path from "node:path";
import { mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { edit, events } from "../src/shower/motion";

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({
  serveUrl,
  id: "ShowerSinging",
  browserExecutable,
});
const out = path.resolve("renders/shower-singing/review");
mkdirSync(out, { recursive: true });
const times = {
  first: 0,
  wet: events.wetStart + 0.7,
  dry: events.dryStart + 0.7,
  reaction: events.reaction + 0.5,
  proof: events.proof + 0.8,
  reflection: events.reflect + 0.07,
  reverb: events.reverb + 0.1,
  fullness: events.fullness + 1,
  swap: events.swap + 0.7,
  absorb: events.absorbHit + 0.2,
  comparison: events.same + 0.75,
  joke: events.joke + 1,
  wipe: events.loop + 0.5,
  last: edit.duration - 1 / edit.fps,
};
for (const [id, time] of Object.entries(times)) {
  await renderStill({
    serveUrl,
    composition,
    frame: Math.min(edit.duration * edit.fps - 1, Math.round(time * edit.fps)),
    output: `${out}/${id}.png`,
    imageFormat: "png",
    browserExecutable,
    inputProps: {
      episodeId: "shower-singing",
      portrait: true,
      showCaptions: true,
      audioEnabled: false,
    },
  });
  console.log(`Reviewed frame ${id}`);
}
