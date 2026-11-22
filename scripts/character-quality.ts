import path from "node:path";
import { mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { browserExecutable } from "./browser";
const output = path.resolve("renders/character-quality/four-vs-eight.png");
mkdirSync(path.dirname(output), { recursive: true });
const serveUrl = await bundle({
  entryPoint: path.resolve("experiments/character-quality/index.tsx"),
  publicDir: path.resolve("public"),
});
const composition = await selectComposition({
  serveUrl,
  id: "CharacterQuality",
  browserExecutable,
});
await renderStill({
  serveUrl,
  composition,
  output,
  imageFormat: "png",
  browserExecutable,
});
console.log(output);
