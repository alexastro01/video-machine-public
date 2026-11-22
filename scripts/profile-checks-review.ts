import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { edit, e } from "../src/profile-checks/motion";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({
  serveUrl,
  id: "ProfileChecks",
  browserExecutable,
});
const out = path.resolve("renders/profile-checks/review-v1");
mkdirSync(out, { recursive: true });
const times = {
  first: 0,
  counter: e.counterTap + 0.16,
  disclosure: e.disclose + 0.35,
  close: e.closePress + 0.18,
  compressed: e.closePress + 0.51,
  receipt: e.notice + 0.45,
  draft: e.draft1 + 0.67,
  erase: e.delete1 + 0.11,
  research: e.draft2 + 0.45,
  typing: e.typing + 0.63,
  plane: e.plane + 0.3,
  incoming: e.incoming + 0.21,
  screenshot: e.number - 0.2,
  reveal: e.number + 0.45,
  pair: e.mutual + 0.7,
  last: edit.duration - 1 / edit.fps,
};
for (const [id, t] of Object.entries(times)) {
  await renderStill({
    serveUrl,
    composition,
    browserExecutable,
    inputProps: {
      episodeId: "profile-checks",
      portrait: true,
      showCaptions: true,
      audioEnabled: false,
    },
    frame: Math.round(t * edit.fps),
    output: `${out}/${id}.png`,
    imageFormat: "png",
  });
  console.log(`Frame ${id}`);
}
writeFileSync(`${out}/frames.json`, JSON.stringify(times, null, 2) + "\n");
