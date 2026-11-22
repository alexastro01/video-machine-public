import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import type { Asset, Animation, Plan } from "../src/immortal/types";

const B = "episodes/immortal",
  P = `${B}/hyperframes`;
const read = <T>(file: string) => JSON.parse(readFileSync(file, "utf8")) as T;
const timeline = read<Plan>(`${B}/timeline.json`);
for (const dir of [
  "assets/art",
  "assets/fonts",
  "assets/vendor",
  "compositions",
])
  mkdirSync(`${P}/${dir}`, { recursive: true });
copyFileSync(
  "episodes/happens-for-a-reason/hyperframes/assets/vendor/gsap.min.js",
  `${P}/assets/vendor/gsap.min.js`,
);
copyFileSync("public/fonts/dmsans.ttf", `${P}/assets/fonts/dmsans.ttf`);
copyFileSync(
  "public/fonts/dmsans-OFL.txt",
  `${P}/assets/fonts/DM-Sans-OFL.txt`,
);
for (const name of ["narration", "music", "effects"])
  copyFileSync(
    `public/episodes/immortal/${name}.wav`,
    `${P}/assets/${name}.wav`,
  );
const poses = read<
  Record<
    string,
    {
      file: string;
      width: number;
      height: number;
      pivotX: number;
      footY: number;
      worldHeight: number;
    }
  >
>(`${B}/assets/poses-v1.json`);
if (existsSync(`${B}/assets/poses-v2.json`))
  Object.assign(poses, read<typeof poses>(`${B}/assets/poses-v2.json`));
const assets: Asset[] = [];
for (const [id, a] of Object.entries(poses)) {
  const filename = path.basename(a.file);
  copyFileSync(`public/${a.file}`, `${P}/assets/art/${filename}`);
  assets.push({
    id,
    url: `assets/art/${filename}`,
    width: a.width,
    height: a.height,
    pivotX: a.pivotX,
    footY: a.footY,
    worldHeight: a.worldHeight,
  });
}
const animations = read<
  Record<string, { file: string; metadata: string; worldHeight: number }>
>(`${B}/assets/animations-v1.json`);
if (existsSync(`${B}/assets/animations-v2.json`))
  Object.assign(
    animations,
    read<typeof animations>(`${B}/assets/animations-v2.json`),
  );
for (const [id, a] of Object.entries(animations)) {
  const meta = read<Animation>(`public/${a.metadata}`),
    c = meta.crop,
    filename = path.basename(a.file);
  copyFileSync(`public/${a.file}`, `${P}/assets/art/${filename}`);
  const prior = assets.findIndex((x) => x.id === id);
  if (prior >= 0) assets.splice(prior, 1);
  assets.push({
    id,
    url: `assets/art/${filename}`,
    width: c.width,
    height: c.height,
    pivotX: meta.cellWidth / 2 - c.x,
    footY: c.height - 4,
    worldHeight: a.worldHeight,
    animation: meta,
  });
}
const bgSources: Record<string, string> = {
  airport: "airport-security-empty-v2",
  airportReverse: "airport-security-reverse",
  farm: "ravenna-field-wide-476",
  farmSide: "ravenna-field-side-empty-v2",
  forest: "witch-hut-exterior",
  hut: "witch-hut-empty-v2",
  healing: "healing-hand-closeup-v1",
  signing: "signing-scene-contact-v1",
};
const backgrounds: Record<string, string> = {};
copyFileSync(
  "output/imagegen/immortal-v3/family-tree-pixel.png",
  `${P}/assets/art/family-tree-pixel.png`,
);
backgrounds.familyTreeGraphic = "assets/art/family-tree-pixel.png";
for (const [id, name] of Object.entries(bgSources)) {
  copyFileSync(
    `output/imagegen/immortal-sample-v1/${name}.png`,
    `${P}/assets/art/${name}.png`,
  );
  backgrounds[id] = `assets/art/${name}.png`;
}
const fullBackgrounds: Record<string, string> = {
  farmhouse: "farmhouse-interior",
  farmhouseReverse: "farmhouse-reverse",
  winter: "ravenna-winter",
  plague: "plague-lane-1348",
  parish: "parish-office-1538",
  market: "amsterdam-market-1650",
  portraitStudio: "portrait-studio-1650",
  photoStudio: "photo-studio-1839",
  border: "border-office-1920",
  bench: "airport-bench-2026",
  bedside: "marcus-bedside-531",
  twoCups: "second-cup-531",
  annaMarket: "anna-market-pair",
  annaQuestion: "anna-ten-years",
  packing: "norbert-packing-1650",
  photoSneeze: "photo-sneeze-1839",
  benchGame: "airport-bench-game",
  benchInvitation: "bench-invitation",
  benchConfession: "bench-confession",
};
for (const [id, name] of Object.entries(fullBackgrounds)) {
  copyFileSync(
    `output/imagegen/immortal-film-v2/${name}.png`,
    `${P}/assets/art/${name}.png`,
  );
  backgrounds[id] = `assets/art/${name}.png`;
}
copyFileSync(
  "public/episodes/immortal/models/camera1839.glb",
  `${P}/assets/art/camera1839.glb`,
);
copyFileSync(
  "public/episodes/happens-for-a-reason/models/book-v2.glb",
  `${P}/assets/art/register-book.glb`,
);
const portrait = existsSync(
  "output/imagegen/immortal-viewer-v2/portrait-viewer-no-rock.png",
)
  ? "output/imagegen/immortal-viewer-v2/portrait-viewer-no-rock.png"
  : existsSync("output/imagegen/immortal-sample-v1/portrait-1650-v2.png")
    ? "output/imagegen/immortal-sample-v1/portrait-1650-v2.png"
    : "output/imagegen/immortal-sample-v1/portrait-1650.png";
copyFileSync(
  portrait,
  `${P}/assets/art/portrait-1650.png`,
);
const required = new Set([
  "norbert-modern-neutral",
  "norbert-talk",
  "officer-talk",
  "norbert-harvest",
  "marcus-basket",
  "norbert-476-neutral",
  "marcus-question",
  "support-messenger",
  "support-messenger-run",
  "support-farmer",
  "support-farmer-adjust",
  "norbert-run",
  "norbert-476-run",
  "wolf-run-a",
  "wolf-run-b",
  "wolf-sniff",
  "witch-alert-talk",
  "witch-alert-neutral",
  "witch-alert-contract",
  "witch-alert-scroll",
  "signing-scene",
  "healing-closeup",
  "norbert-industrial-photo",
  "norbert-industrial-passport",
  "officer-neutral",
  "gate-kid-neutral",
  "traveler-jacket",
  "traveler-coat",
  ...timeline.shots.flatMap((s) => s.stage?.actors.map((a) => a.id) ?? []),
  ...timeline.shots.flatMap(
    (s) =>
      s.stage?.actors.flatMap((a) => (a.reaction ? [a.reaction.id] : [])) ?? [],
  ),
  ...timeline.shots.flatMap((s) => (s.stage?.plate ? [s.stage.plate] : [])),
]);
const activeAssets = assets.filter((a) => required.has(a.id));
for (const id of required)
  if (!activeAssets.some((a) => a.id === id))
    throw new Error(`Missing authored film asset: ${id}`);
const plan: Plan = {
  ...timeline,
  assets: activeAssets,
  backgrounds,
  portrait: "assets/art/portrait-1650.png",
};
writeFileSync(`${P}/assets/story.json`, JSON.stringify(plan, null, 2) + "\n");
await build({
  entryPoints: ["src/immortal/world.ts"],
  outfile: `${P}/assets/immortal-world.js`,
  bundle: true,
  format: "iife",
  globalName: "ImmortalWorld",
  platform: "browser",
  target: "es2020",
  sourcemap: true,
});

const css = `@font-face{font-family:'DM Sans';src:url('assets/fonts/dmsans.ttf');font-weight:100 1000}*{box-sizing:border-box}.clip{position:absolute;inset:0}.caption{position:absolute;left:180px;top:850px;width:1560px;text-align:center;font:800 58px/1.12 'DM Sans';letter-spacing:-.6px;color:#fff;-webkit-text-stroke:7px #16242d;paint-order:stroke fill;text-shadow:0 3px 0 #16242d;white-space:nowrap}.caption-inner{display:inline-block}`;
const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
function composition(id: string, body: string, script: string) {
  return `<template><style>#root{position:absolute;inset:0;background:transparent}${css}</style><div id="root" data-composition-id="${id}" data-width="1920" data-height="1080">${body}</div><script>const tl=gsap.timeline({paused:true});${script}window.__timelines['${id}']=tl;</script></template>`;
}
const worldScript = `window.__hf=window.__hf||{};window.__hf.buildReady=window.__hf.buildReady||{};window.__hf.buildReady.immortal=(async()=>{await document.fonts.load('800 58px "DM Sans"');await document.fonts.ready;const engine=await ImmortalWorld.boot(document.getElementById('immortal-canvas'),${JSON.stringify(plan)});window.__immortalEngine=engine;const tl=gsap.timeline({paused:true});tl.to({t:0},{t:${plan.duration},duration:${plan.duration},ease:'none'});window.__timelines.world=tl;})();`;
writeFileSync(
  `${P}/compositions/world.html`,
  `<template><style>#root{position:absolute;inset:0;background:transparent}canvas{display:block;width:1920px;height:1080px}</style><div id="root" data-composition-id="world" data-width="1920" data-height="1080"><canvas id="immortal-canvas" width="1920" height="1080" data-layout-ignore></canvas></div><script>${worldScript}</script></template>`,
);
const hosts = [
  `<div id="world" class="clip" data-composition-id="world" data-composition-src="compositions/world.html" data-start="0" data-duration="${plan.duration}" data-track-index="0" data-track-kind="graphics" data-layout-ignore data-width="1920" data-height="1080" style="z-index:1"></div>`,
];
for (const s of plan.shots) {
  writeFileSync(
    `${P}/compositions/${s.id}.html`,
    composition(
      s.id,
      "",
      `tl.to({p:0},{p:1,duration:${s.duration},ease:'none'},0);`,
    ),
  );
  hosts.push(
    `<div id="${s.id}" class="clip" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${s.start}" data-duration="${s.duration}" data-beat="${escape(s.description)}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080" data-layout-ignore style="z-index:2"></div>`,
  );
}
const yearBody = plan.shots
  .filter((s) => s.stage?.year)
  .map(
    (s) =>
      `<div id="date-${s.id}" class="clip" data-start="${s.start}" data-duration="${Math.min(2.8, s.duration)}" data-layout-ignore><span style="position:absolute;left:100px;top:80px;font:700 44px 'DM Sans';color:#eee6d5;-webkit-text-stroke:3px #142630;paint-order:stroke fill">${escape(s.stage!.year!)}</span></div>`,
  )
  .join("");
writeFileSync(
  `${P}/compositions/dates.html`,
  composition(
    "dates",
    yearBody,
    `tl.to({p:0},{p:1,duration:${plan.duration},ease:'none'},0);`,
  ),
);
hosts.push(
  `<div id="dates" class="clip" data-composition-id="dates" data-composition-src="compositions/dates.html" data-start="0" data-duration="${plan.duration}" data-track-index="2" data-track-kind="graphics" data-width="1920" data-height="1080" style="z-index:4" data-layout-ignore></div>`,
);
type Word = { text: string; start: number; end: number };
const cues: {
  id: string;
  start: number;
  end: number;
  text: string;
  words: Word[];
}[] = [];
for (const line of plan.lines) {
  let at = 0;
  while (at < line.words.length) {
    const remaining = line.words.length - at;
    let count = Math.min(6, remaining);
    if (remaining === 7 || remaining === 8) count = 4;
    for (let n = 3; n <= count; n++)
      if (
        /[.!?]$/.test(line.words[at + n - 1].text) &&
        !line.words[at + n - 1].text.endsWith("...")
      ) {
        count = n;
        break;
      }
    const ws = line.words.slice(at, at + count);
    const start = ws[0].start,
      end = Math.min(
        line.end + 0.03,
        ws[ws.length - 1].end + 0.06,
        at + count < line.words.length
          ? line.words[at + count].start
          : Infinity,
      );
    cues.push({
      id: `caption-${cues.length}`,
      start,
      end,
      text: ws.map((w) => w.text).join(" "),
      words: ws,
    });
    at += count;
  }
}
let captionBody = "",
  captionScript = `tl.to({p:0},{p:1,duration:${plan.duration},ease:'none'},0);`;
for (const c of cues) {
  captionBody += `<div id="${c.id}" class="clip" data-start="${c.start}" data-duration="${c.end - c.start}" data-layout-allow-caption-zone><div class="caption"><span id="${c.id}-inner" class="caption-inner">${escape(c.text)}</span></div></div>`;
  captionScript += `tl.fromTo('#${c.id}-inner',{scale:.985},{scale:1,duration:.09,ease:'power2.out'},${c.start});`;
}
writeFileSync(
  `${P}/compositions/captions.html`,
  composition("captions", captionBody, captionScript),
);
writeFileSync(
  `${B}/caption-phrases.json`,
  JSON.stringify(cues, null, 2) + "\n",
);
hosts.push(
  `<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${plan.duration}" data-track-index="2" data-track-kind="captions" data-width="1920" data-height="1080" style="z-index:5"></div>`,
);
const audio = ["narration", "music", "effects"]
  .map(
    (name, i) =>
      `<audio id="${name}" src="assets/${name}.wav" data-start="0" data-duration="${plan.duration}" data-track-index="${3 + i}" data-track-kind="audio" data-volume="1"></audio>`,
  )
  .join("\n");
writeFileSync(
  `${P}/index.html`,
  `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1920,height=1080"><title>What If You Were Immortal?</title><script src="assets/vendor/gsap.min.js"></script><script src="assets/immortal-world.js"></script><style>html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#18232b}.clip{position:absolute;inset:0}</style></head><body><div id="main" data-composition-id="main" data-width="1920" data-height="1080" data-fps="30" data-duration="${plan.duration}">${hosts.join("\n")}${audio}</div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});tl.to({p:0},{p:1,duration:${plan.duration},ease:'none'});window.__timelines.main=tl;</script></body></html>`,
);
console.log(
  JSON.stringify({
    duration: plan.duration,
    frames: plan.frames,
    assets: activeAssets.length,
    shots: plan.shots.length,
    captions: cues.length,
    width: 1920,
    height: 1080,
  }),
);
