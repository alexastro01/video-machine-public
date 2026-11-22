import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { json, writeJson } from "./common";
import type { FateAsset, FatePlan } from "../src/fate/types";

const B = "episodes/happens-for-a-reason",
  P = `${B}/hyperframes`;
const t = json<
  FatePlan & { lines: { id: string; start: number; end: number }[] }
>(`${B}/timeline.json`);
type Caption = { text: string; startMs: number; endMs: number };
const words = json<Caption[]>(`${B}/captions.json`);
const req = createRequire(import.meta.url);
const { PNG } = req("pngjs") as {
  PNG: { sync: { read: (data: Buffer) => { width: number; height: number } } };
};
mkdirSync(`${P}/assets/art`, { recursive: true });
mkdirSync(`${P}/assets/fonts`, { recursive: true });
mkdirSync(`${P}/assets/vendor`, { recursive: true });
mkdirSync(`${P}/compositions`, { recursive: true });
copyFileSync(
  "episodes/restless-friend/hyperframes/assets/vendor/gsap.min.js",
  `${P}/assets/vendor/gsap.min.js`,
);
for (const name of ["narration", "music", "effects"])
  copyFileSync(
    `public/episodes/happens-for-a-reason/${name}.wav`,
    `${P}/assets/${name}.wav`,
  );
copyFileSync("public/fonts/dmsans.ttf", `${P}/assets/fonts/dmsans.ttf`);
const inter = "public/episodes/inventions-since-2000/fonts/InterVariable.woff2";
copyFileSync(inter, `${P}/assets/fonts/inter.woff2`);
for (const [source, target] of [
  [
    "public/episodes/inventions-since-2000/fonts/Inter-OFL.txt",
    "Inter-OFL.txt",
  ],
  ["public/fonts/dmsans-OFL.txt", "DM-Sans-OFL.txt"],
])
  if (existsSync(source)) copyFileSync(source, `${P}/assets/fonts/${target}`);

const assets: FateAsset[] = [];
function add(
  id: string,
  file: string,
  worldHeight: number,
  pivot?: number,
  foot?: number,
) {
  const image = PNG.sync.read(readFileSync(`public/${file}`));
  const name = path.basename(file);
  copyFileSync(`public/${file}`, `${P}/assets/art/${name}`);
  assets.push({
    id,
    url: `assets/art/${name}`,
    width: image.width,
    height: image.height,
    worldHeight,
    pivotX: pivot ?? image.width / 2,
    footY: foot ?? image.height - 4,
  });
}
const miko = json<{
  individualPoses: Record<
    string,
    {
      file: string;
      width: number;
      height: number;
      pivotX: number;
      footY: number;
    }
  >;
}>("public/episodes/happens-for-a-reason/art/miko-four-v1.json");
const mikoHeight = miko.individualPoses.wet.height;
for (const [name, pose] of Object.entries(miko.individualPoses))
  add(
    `miko-${name}`,
    pose.file,
    (2.25 * pose.height) / mikoHeight,
    pose.pivotX,
    pose.footY,
  );
for (const [character, nominal] of [
  ["witch", 2.4],
  ["bus-girl", 2.25],
] as const) {
  const meta = json<{
    individualPoses: {
      id: string;
      file: string;
      size: [number, number];
      pivot: [number, number];
    }[];
  }>(`public/pixel/cast/${character}-four-v1.json`);
  const height = meta.individualPoses[0].size[1];
  for (const pose of meta.individualPoses) {
    const id = character === "witch" ? `witch-${pose.id}` : `girl-${pose.id}`;
    add(
      id,
      pose.file,
      (nominal * pose.size[1]) / height,
      pose.pivot[0],
      pose.pivot[1],
    );
  }
}
const anim = json<Record<string, { atlas: string; metadata: string }>>(
  `${B}/assets/animations-v1.json`,
);
for (const [name, info] of Object.entries(anim)) {
  const metadata = json<NonNullable<FateAsset["animation"]>>(
    `public/${info.metadata}`,
  );
  const c = metadata.crop,
    id = `${name}-gif`,
    filename = path.basename(info.atlas);
  copyFileSync(`public/${info.atlas}`, `${P}/assets/art/${filename}`);
  assets.push({
    id,
    url: `assets/art/${filename}`,
    width: c.width,
    height: c.height,
    worldHeight: name.startsWith("witch-")
      ? 2.4
      : name === "girl-smile"
        ? 1.88
        : 2.25,
    pivotX: metadata.cellWidth / 2 - c.x,
    footY: c.height - 4,
    animation: metadata,
  });
}
const scenery: Record<string, string> = {};
for (const [key, name] of [
  ["street", "rain-street-background-v1.png"],
  ["sky", "cloud-sky-background-v1.png"],
]) {
  const source = `output/imagegen/happens-for-a-reason-v1/scenery/${name}`;
  if (existsSync(source)) {
    copyFileSync(source, `${P}/assets/art/${name}`);
    scenery[key] = `assets/art/${name}`;
  }
}
mkdirSync(`${P}/assets/models`, { recursive: true });
const models = Object.fromEntries(
  ["book", "brain", "cloud"].map((id) => {
    copyFileSync(
      `public/episodes/happens-for-a-reason/models/${id}-v2.glb`,
      `${P}/assets/models/${id}-v2.glb`,
    );
    return [id, `assets/models/${id}-v2.glb`];
  }),
);
for (const name of ["CC-BY-3.0.txt", "CC0-1.0.txt"])
  copyFileSync(
    `public/episodes/happens-for-a-reason/models/${name}`,
    `${P}/assets/models/${name}`,
  );
copyFileSync(`${B}/CREDITS.md`, `${P}/assets/models/ATTRIBUTION.md`);
const plan = { ...t, assets, scenery, models };
writeJson(`${P}/assets/story.json`, plan);
await build({
  entryPoints: ["src/fate/world.ts"],
  outfile: `${P}/assets/fate-world.js`,
  bundle: true,
  format: "iife",
  globalName: "FateWorld",
  platform: "browser",
  target: "es2020",
  minify: false,
  sourcemap: true,
});

const css = `@font-face{font-family:'DM Sans';src:url('assets/fonts/dmsans.ttf');font-weight:100 1000}@font-face{font-family:Inter;src:url('assets/fonts/inter.woff2');font-weight:100 900}*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#182a3e}.clip{position:absolute;inset:0}.caption{position:absolute;left:108px;top:1450px;width:864px;text-align:center;font:900 84px/1.12 'DM Sans';letter-spacing:-2px;color:#fff;-webkit-text-stroke:10px #15232c;paint-order:stroke fill;text-shadow:0 4px 0 #15232c}.caption-inner{display:inline-block}.title-question{position:absolute;left:110px;top:198px;width:860px;text-align:center;font:900 68px/1.06 'DM Sans';letter-spacing:-1.3px;color:#f9eed9;-webkit-text-stroke:9px #15232c;paint-order:stroke fill}.zero{position:absolute;left:190px;top:1260px;width:700px;text-align:center;font:900 108px/1 Inter;letter-spacing:-4px;color:#d9bd7b;-webkit-text-stroke:10px #182a35;paint-order:stroke fill}`;
function escape(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
}
function doc(id: string, body: string, script: string) {
  const sharedCss = css.replace(/html,body\{[^}]*\}/, "");
  return `<template><style>#root{position:absolute;inset:0;background:transparent}${sharedCss}</style><div id="root" data-composition-id="${id}" data-width="1080" data-height="1920">${body}</div><script>const tl=gsap.timeline({paused:true});${script}window.__timelines['${id}']=tl;</script></template>`;
}
const hosts = [];
const worldScript = `window.__hf=window.__hf||{};window.__hf.buildReady=window.__hf.buildReady||{};window.__hf.buildReady.fate=(async()=>{await Promise.all([document.fonts.load('900 84px "DM Sans"'),document.fonts.load('800 100px Inter')]);await document.fonts.ready;const engine=await FateWorld.boot(document.getElementById('fate-canvas'),${JSON.stringify(plan)});window.__fateEngine=engine;const tl=gsap.timeline({paused:true});tl.to({t:0},{t:${t.duration},duration:${t.duration},ease:'none'});window.__timelines.world=tl;})();`;
writeFileSync(
  `${P}/compositions/world.html`,
  `<template><style>#root{position:absolute;inset:0;background:transparent}canvas{display:block;width:1080px;height:1920px}</style><div id="root" data-composition-id="world" data-width="1080" data-height="1920"><canvas id="fate-canvas" width="1080" height="1920" data-layout-ignore></canvas></div><script>${worldScript}</script></template>`,
);
hosts.push(
  `<div id="world" class="clip" data-composition-id="world" data-composition-src="compositions/world.html" data-start="0" data-duration="${t.duration}" data-track-index="0" data-track-kind="graphics" data-width="1080" data-height="1920" data-layout-ignore style="z-index:1"></div>`,
);
for (const shot of t.shots) {
  const body =
    shot.id === "missed-bus" && t.openingQuestion === true
      ? `<div id="opening-question" class="clip" data-start=".16" data-duration="${Math.max(0.3, Math.min(2.3, shot.duration - 0.16))}" data-layout-allow-caption-zone><div id="question-inner" class="title-question">DOES EVERYTHING<br>HAPPEN FOR A REASON?</div></div>`
      : shot.id === "empty-book"
        ? `<div id="empty-label" class="clip" data-start="${Math.max(0, t.events.empty - shot.start)}" data-duration="${Math.max(0.1, shot.start + shot.duration - t.events.empty)}" style="z-index:6;opacity:0"><div class="zero">0 REASONS</div></div>`
        : "";
  const js =
    shot.id === "missed-bus" && t.openingQuestion === true
      ? 'tl.fromTo("#question-inner",{opacity:0,scale:.96},{opacity:1,scale:1,duration:.14,ease:"power2.out"},.16);'
      : "";
  writeFileSync(
    `${P}/compositions/${shot.id}.html`,
    doc(
      shot.id,
      body,
      `${js}tl.to({p:0},{p:1,duration:${shot.duration},ease:"none"},0);`,
    ),
  );
  hosts.push(
    `<div id="${shot.id}" class="clip" data-composition-id="${shot.id}" data-composition-src="compositions/${shot.id}.html" data-start="${shot.start}" data-duration="${shot.duration}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920" style="z-index:2"></div>`,
  );
}
const pages: Caption[][] = [];
let group: Caption[] = [];
for (const word of words) {
  if (
    group.length &&
    (group.length === 2 || word.startMs - group[group.length - 1].endMs > 260)
  ) {
    pages.push(group);
    group = [];
  }
  group.push(word);
  if (/[.!?…]$/.test(word.text)) {
    pages.push(group);
    group = [];
  }
}
if (group.length) pages.push(group);
const cues: { start: number; end: number; words: Caption[] }[] = [];
for (const page of pages)
  page.forEach((word, i) => {
    const end =
      i + 1 < page.length ? page[i + 1].startMs : page[page.length - 1].endMs;
    if (
      Math.ceil((word.startMs / 1000) * 30 - 1e-8) <
      Math.ceil((end / 1000) * 30 - 1e-8)
    )
      cues.push({
        start: word.startMs / 1000,
        end: end / 1000,
        words: page.slice(0, i + 1),
      });
  });
const coverage = new Set(
  cues.flatMap((c) => c.words.map((w) => `${w.startMs}:${w.text}`)),
);
if (words.some((w) => !coverage.has(`${w.startMs}:${w.text}`)))
  throw new Error("A spoken caption word is never sampled on an output frame");
const tone = (text: string) =>
  /reason|brain|cloud|patterns|yourself/i.test(text)
    ? "#e2c58d"
    : /always|me|aren't/i.test(text)
      ? "#e3a08c"
      : "#fff";
let captionBody = "",
  captionJs = "";
cues.forEach((cue, i) => {
  captionBody += `<div id="caption-${i}" class="clip" data-start="${cue.start}" data-duration="${cue.end - cue.start}"><div class="caption"><span id="caption-inner-${i}" class="caption-inner">${cue.words.map((w) => `<span style="color:${tone(w.text)}">${escape(w.text.toUpperCase())}</span>`).join(" ")}</span></div></div>`;
  captionJs += `tl.fromTo('#caption-inner-${i}',{scale:.97},{scale:1,duration:.065,ease:'power2.out'},${cue.start});`;
});
writeJson(`${B}/caption-cues.json`, cues);
writeJson(`${B}/caption-frame-coverage.json`, {
  tokens: words.length,
  everyTokenVisible: true,
  visibleStates: cues.length,
});
writeFileSync(
  `${P}/compositions/captions.html`,
  doc("captions", captionBody, captionJs),
);
hosts.push(
  `<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${t.duration}" data-track-index="3" data-track-kind="captions" data-width="1080" data-height="1920" data-layout-allow-overlap style="z-index:10"></div>`,
);
const audio = ["narration", "music", "effects"]
  .map(
    (name, i) =>
      `<audio id="${name}" class="clip" src="assets/${name}.wav" data-start="0" data-duration="${t.duration}" data-track-index="${i + 4}" data-volume="1"></audio>`,
  )
  .join("");
writeFileSync(
  `${P}/index.html`,
  `<!doctype html><html lang="en" data-resolution="portrait"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920"><script src="assets/vendor/gsap.min.js"></script><script src="assets/fate-world.js"></script><style>${css}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="${t.duration}" data-width="1080" data-height="1920" data-fps="30">${hosts.join("")}${audio}</div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});tl.to({t:0},{t:${t.duration},duration:${t.duration},ease:'none'});window.__timelines.main=tl;</script></body></html>`,
);
writeJson(`${P}/meta.json`, {
  id: `happens-for-a-reason-v${t.revision ?? 3}`,
  name: t.title,
});
writeFileSync(
  `${P}/STORYBOARD.md`,
  `# Does Everything Really Happen for a Reason?\n\n${t.shots.map((s) => `- ${s.start.toFixed(3)}–${(s.start + s.duration).toFixed(3)}s, frames ${Math.round(s.start * 30)}–${Math.round((s.start + s.duration) * 30) - 1}: ${s.description}`).join("\n")}\n`,
);
writeFileSync(
  `${P}/SPEC.md`,
  `# Fate short specification\n\nOUTPUT: 1080×1920, 30 fps, ${t.duration}s, ${t.frames} frames.\nSTORY: Missed bus, confident witch, empty book, retrospective meaning, cloud-face example, bus meeting, eye-roll and return to the opening.\nLOOK: Miko pixel art, muted plum witch, sage-jacket adult passenger. Native Three.js geometry and licensed Blender-prepared prop models at delivery resolution. Cool navy rain and warm shelter light, purple/gold mind scenes, amber bus interior. Skin and scarf remain legible.\nCAMERA: Frontal gentle views for flat characters, close-ups only for reactions or the empty pages. Head silhouettes stay within frame. No repeating zoom pulses.\nANIMATION: Bus departure, wheel spray, falling rain, finite character reactions, one wand arc, separate hinged book halves and blank pages, lobed brain, a brief profile interpretation in a natural cloud, dots connecting and releasing. Native character GIFs play once and hold.\nCAPTIONS: Exact selected takes, 1.1× pitch-preserving speech, one or two progressively revealed words, local DM Sans 900 at 84px with 10px dark outline, top at 1450px. No opening heading; the bus, reaction and lower dialogue captions carry the hook. 0 REASONS is limited to the empty-page reveal.\nSOUND: ElevenLabs Charlie and Jessica dialogue; generated bus, rain and magic Foley; saved paper sound and channel music. Separate editable stems, speech-ducked.\nBANNED: Logos, title cards, decorative labels, persistent top banners, caption boxes, white transition flashes, generic whole-body bouncing, repeated GIF actions, empty silent holds, steep sprite angles, chopped hair, book/face intersections and enlarged low-resolution world footage.\nQA: First frame and first syllable; book identity and blank spread; full faces and hand direction; distinct dialogue timing; cloud-face readability; girl smile before Miko's inference; eye-roll and replay boundary; local media and audio levels.\n`,
);
console.log(
  JSON.stringify(
    {
      project: P,
      assets: assets.length,
      shots: t.shots.length,
      captionStates: cues.length,
      duration: t.duration,
    },
    null,
    2,
  ),
);
