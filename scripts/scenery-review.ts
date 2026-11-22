import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import type { Caption } from "@remotion/captions";
import { json, loadEpisode } from "./common";
import { browserExecutable } from "./browser";
import { sceneryReviewDefaults } from "../src/pixel/UkSceneryReview";

const out = path.resolve("renders/uk-disappears/scenery-v3");
mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const props = {
  episode: loadEpisode("uk-disappears"),
  captions: json<Caption[]>("episodes/uk-disappears/captions.json"),
  portrait: true,
  showCaptions: true,
  audioEnabled: false,
};
const film = await selectComposition({
  serveUrl,
  id: "Portrait",
  inputProps: props,
  browserExecutable,
});
for (const frame of process.argv.includes("--diagnostics-only")
  ? []
  : [0, 90, 130, 168, 185, 215, 265, 1020, 1229]) {
  await renderStill({
    serveUrl,
    composition: film,
    inputProps: props,
    frame,
    output: `${out}/film-${frame}.png`,
    imageFormat: "png",
    browserExecutable,
  });
  console.log(`Film frame ${frame}`);
}
const review = await selectComposition({
  serveUrl,
  id: "SceneryReview",
  browserExecutable,
});
const metrics: Record<string, unknown[]> = {};
for (const [name, changes] of Object.entries({
  "map-intact": { view: "ireland", progress: 0.05 },
  "map-new-coast": { view: "ireland", progress: 0.95 },
  "map-wireframe": { view: "ireland", progress: 0.05, debug: "wireframe" },
  "map-regions": {
    view: "ireland",
    progress: 0.05,
    debug: "regions",
    zoom: 0.88,
  },
  "map-near": { view: "ireland", progress: 0.45, zoom: 1.12 },
  "runway-intact": { view: "runway", progress: 0.03 },
  "runway-field": { view: "runway", progress: 0.35, debug: "collapse" },
  "runway-stress": { view: "runway", progress: 0.5, seed: 71, zoom: 0.88 },
})) {
  await renderStill({
    serveUrl,
    composition: { ...review, props: { ...sceneryReviewDefaults, ...changes } },
    inputProps: { ...sceneryReviewDefaults, ...changes },
    frame: 0,
    output: `${out}/${name}.png`,
    imageFormat: "png",
    browserExecutable,
    onBrowserLog: (log) => {
      if (log.text.startsWith("SCENERY_METRICS:")) {
        (metrics[name] ??= []).push(
          JSON.parse(log.text.slice("SCENERY_METRICS:".length)),
        );
      }
    },
  });
  console.log(name);
}
writeFileSync(
  `${out}/renderer-metrics.json`,
  JSON.stringify(metrics, null, 2) + "\n",
);
console.log(out);
