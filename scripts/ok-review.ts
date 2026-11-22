import path from "node:path";
import { mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { browserExecutable } from "./browser";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({
  serveUrl,
  id: "OKMessageSample",
  browserExecutable,
});
const out = path.resolve("renders/ok-message/review");
mkdirSync(out, { recursive: true });
for (const frame of [0, 42, 117, 130, 165, 198, 247, 290, 375, 480]) {
  await renderStill({
    serveUrl,
    composition,
    frame,
    output: `${out}/frame-${frame}.png`,
    imageFormat: "png",
    browserExecutable,
    inputProps: {
      episodeId: "ok-message",
      portrait: true,
      showCaptions: true,
      audioEnabled: false,
    },
  });
  console.log(`Reviewed frame ${frame}`);
}
