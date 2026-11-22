import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Caption } from "@remotion/captions";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { browserExecutable } from "./browser";
import { json, loadEpisode, writeJson } from "./common";

const episode = loadEpisode("uk-disappears");
const output = path.resolve("renders/uk-disappears/animation-v5/stills");
mkdirSync(output, { recursive: true });
const props = {
  episode,
  captions: json<Caption[]>("episodes/uk-disappears/captions.json"),
  portrait: true,
  showCaptions: true,
  audioEnabled: false,
};
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({
  serveUrl,
  id: "Portrait",
  inputProps: props,
  browserExecutable,
});
const captures = [];
for (const cue of episode.ukEdit!.mikoGifs ?? []) {
  const shot = episode.ukEdit!.shots.find((s) => s.view === cue.view)!;
  const frame = Math.round((shot.start + cue.at + 0.6) * episode.fps);
  const file = `${output}/${cue.view}-${frame}.png`;
  await renderStill({
    serveUrl,
    composition,
    inputProps: props,
    frame,
    output: file,
    imageFormat: "png",
    browserExecutable,
  });
  captures.push({ view: cue.view, frame, file });
  console.log(`${cue.view}: ${frame}`);
}
writeJson(`${output}/captures.json`, captures);
