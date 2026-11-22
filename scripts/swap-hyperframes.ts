import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { json, writeJson } from "./common";
import type { Asset, Animation, Plan } from "../src/paid/types";

const B = "episodes/billionaire-body-swap",
  P = `${B}/hyperframes`;
const plan = json<Plan>(`${B}/timeline.json`);
for (const dir of [
  "assets/art",
  "assets/fonts",
  "assets/vendor",
  "compositions",
])
  mkdirSync(`${P}/${dir}`, { recursive: true });
copyFileSync(
  "episodes/girlfriend-spy-test/hyperframes/assets/vendor/gsap.min.js",
  `${P}/assets/vendor/gsap.min.js`,
);
for (const name of ["narration", "music", "effects"])
  copyFileSync(
    `public/episodes/billionaire-body-swap/${name}.wav`,
    `${P}/assets/${name}.wav`,
  );
copyFileSync("public/fonts/dmsans.ttf", `${P}/assets/fonts/dmsans.ttf`);
copyFileSync(
  "public/fonts/dmsans-OFL.txt",
  `${P}/assets/fonts/DM-Sans-OFL.txt`,
);
copyFileSync(
  "public/episodes/billionaire-body-swap/swap-stage-v1.glb",
  `${P}/assets/swap-stage-v1.glb`,
);
const poses = json<
  Record<
    string,
    {
      file: string;
      width: number;
      height: number;
      pivotX: number;
      footY: number;
      worldHeight: number;
      hand?: [number, number];
    }
  >
>(`${B}/assets/poses.json`);
const assets: Asset[] = [];
for (const [id, a] of Object.entries(poses)) {
  const file = path.basename(a.file);
  copyFileSync(`public/${a.file}`, `${P}/assets/art/${file}`);
  assets.push({ ...a, id, url: `assets/art/${file}` });
}
const animations = json<
  Record<string, { file: string; metadata: Animation; worldHeight: number }>
>(`${B}/assets/animations.json`);
for (const [id, a] of Object.entries(animations)) {
  const file = path.basename(a.file),
    m = a.metadata,
    c = m.crop;
  copyFileSync(`public/${a.file}`, `${P}/assets/art/${file}`);
  assets.push({
    id: `${id}-gif`,
    url: `assets/art/${file}`,
    width: c.width,
    height: c.height,
    pivotX: m.cellWidth / 2 - c.x,
    footY: c.height - 4,
    worldHeight: a.worldHeight,
    animation: m,
  });
}
const complete = { ...plan, assets, model: "assets/swap-stage-v1.glb" };
writeJson(`${P}/assets/story.json`, complete);
await build({
  entryPoints: ["src/swap/world.ts"],
  outfile: `${P}/assets/swap-world.js`,
  bundle: true,
  format: "iife",
  globalName: "SwapWorld",
  platform: "browser",
  target: "es2020",
  sourcemap: true,
});
const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const D = plan.duration;
const style = `@font-face{font-family:'DM Sans';src:url('assets/fonts/dmsans.ttf');font-weight:100 1000}*{box-sizing:border-box}.clip{position:absolute;inset:0}.caption{position:absolute;left:108px;top:1240px;width:864px;text-align:center;font:900 86px/1.08 'DM Sans';letter-spacing:-1.8px;color:#fff;-webkit-text-stroke:10px #15252e;paint-order:stroke fill;text-shadow:0 4px 0 #15252e}.caption-inner{display:inline-block}`;
function doc(id: string, body: string, script: string) {
  return `<template><style>#root{position:absolute;inset:0;background:transparent}${style}</style><div id="root" data-composition-id="${id}" data-width="1080" data-height="1920">${body}</div><script>const tl=gsap.timeline({paused:true});${script}window.__timelines['${id}']=tl;</script></template>`;
}
const worldScript = `window.__hf=window.__hf||{};window.__hf.buildReady=window.__hf.buildReady||{};window.__hf.buildReady.swap=(async()=>{await document.fonts.load('900 86px "DM Sans"');await document.fonts.ready;const engine=await SwapWorld.boot(document.getElementById('paid-canvas'),${JSON.stringify(complete)});window.__swapEngine=engine;const tl=gsap.timeline({paused:true});tl.to({t:0},{t:${D},duration:${D},ease:'none'});window.__timelines.world=tl;})();`;
writeFileSync(
  `${P}/compositions/world.html`,
  `<template><style>#root{position:absolute;inset:0;background:transparent}canvas{display:block;width:1080px;height:1920px}</style><div id="root" data-composition-id="world" data-width="1080" data-height="1920"><canvas id="paid-canvas" width="1080" height="1920" data-layout-ignore></canvas></div><script>${worldScript}</script></template>`,
);
const hosts = [
  `<div id="world" class="clip" data-composition-id="world" data-composition-src="compositions/world.html" data-start="0" data-duration="${D}" data-track-index="0" data-track-kind="graphics" data-width="1080" data-height="1920" data-layout-ignore style="z-index:1"></div>`,
];
for (const shot of plan.shots) {
  writeFileSync(
    `${P}/compositions/${shot.id}.html`,
    doc(
      shot.id,
      "",
      `tl.to({p:0},{p:1,duration:${shot.duration},ease:'none'},0);`,
    ),
  );
  hosts.push(
    `<div id="shot-${shot.id}" class="clip" data-composition-id="${shot.id}" data-composition-src="compositions/${shot.id}.html" data-start="${shot.start}" data-duration="${shot.duration}" data-beat="${esc(shot.description)}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920" data-layout-ignore style="z-index:2"></div>`,
  );
}
type Caption = { text: string; startMs: number; endMs: number };
const words = json<Caption[]>(`${B}/captions.json`);
const pages: Caption[][] = [];
let group: Caption[] = [];
for (const w of words) {
  if (
    group.length &&
    (group.length === 2 || w.startMs - group[group.length - 1].endMs > 260)
  ) {
    pages.push(group);
    group = [];
  }
  group.push(w);
  if (/[.!?]$/.test(w.text)) {
    pages.push(group);
    group = [];
  }
}
if (group.length) pages.push(group);
let content = "",
  script = `tl.to({p:0},{p:1,duration:${D},ease:'none'},0);`;
const phrases: { start: number; end: number; text: string }[] = [];
for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
  const page = pages[pageIndex];
  const phrase = page.map((w) => w.text).join(" ");
  const reward = ["His cars.", "His jet.", "His money.", "All yours."].includes(
    phrase,
  );
  const shotEnd = reward
    ? plan.shots.find(
        (s) =>
          page[0].startMs / 1000 >= s.start &&
          page[0].startMs / 1000 < s.start + s.duration,
      )!
    : undefined;
  const end = Math.min(
    D,
    shotEnd
      ? shotEnd.start + shotEnd.duration
      : Math.max(
          page[page.length - 1].endMs / 1000 + 0.12,
          page[page.length - 1].startMs / 1000 + 0.28,
        ),
    (pages[pageIndex + 1]?.[0].startMs ?? D * 1000) / 1000,
  );
  phrases.push({
    start: page[0].startMs / 1000,
    end,
    text: page.map((w) => w.text).join(" "),
  });
  for (let i = 0; i < page.length; i++) {
    if (reward && i > 0) continue;
    const start = page[i].startMs / 1000,
      finish =
        !reward && i + 1 < page.length ? page[i + 1].startMs / 1000 : end;
    if (Math.ceil(start * 30 - 1e-8) >= Math.ceil(finish * 30 - 1e-8)) continue;
    const id = `cap-${pageIndex}-${i}`;
    const text = page
      .slice(0, reward ? page.length : i + 1)
      .map((w) => {
        const norm = w.text.toLowerCase().replace(/[^a-z0-9]/g, "");
        const color = ["no", "off", "waiting", "break"].includes(norm)
          ? "#e8a08c"
          : [
                "money",
                "billionaire",
                "cars",
                "jet",
                "14",
                "yours",
                "pancakes",
              ].includes(norm)
            ? "#d5d49a"
            : "#ffffff";
        return `<span style="color:${color}">${esc(w.text.toUpperCase())}</span>`;
      })
      .join(" ");
    content += `<div id="${id}" class="clip" data-start="${start}" data-duration="${finish - start}" data-layout-allow-caption-zone><div class="caption"><span id="${id}-inner" class="caption-inner">${text}</span></div></div>`;
    if (i === 0)
      script += `tl.fromTo('#${id}-inner',{scale:1.035},{scale:1,duration:.07,ease:'power2.out'},${start});`;
  }
}
writeJson(`${B}/caption-phrases.json`, phrases);
writeFileSync(
  `${P}/compositions/captions.html`,
  doc("captions", content, script),
);
hosts.push(
  `<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${D}" data-track-index="2" data-track-kind="captions" data-width="1080" data-height="1920" style="z-index:5"></div>`,
);
for (const [i, name] of ["narration", "music", "effects"].entries())
  hosts.push(
    `<audio id="${name}" class="clip" data-start="0" data-duration="${D}" data-track-index="${i + 3}" src="assets/${name}.wav" data-volume="1"></audio>`,
  );
writeFileSync(
  `${P}/index.html`,
  `<!doctype html><html><head><meta charset="utf-8"><title>${esc(plan.title)}</title><script src="assets/vendor/gsap.min.js"></script><script src="assets/swap-world.js"></script><style>html,body{margin:0;background:#142b36;overflow:hidden}#root{position:relative;width:1080px;height:1920px;overflow:hidden}.clip{position:absolute;inset:0}</style></head><body><div id="root" data-composition-id="main" data-width="1080" data-height="1920" data-duration="${D}">${hosts.join("\n")}</div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});tl.to({p:0},{p:1,duration:${D},ease:'none'});window.__timelines.main=tl;</script></body></html>`,
);
const pkg = JSON.parse(readFileSync(`${P}/package.json`, "utf8"));
pkg.name = "billionaire-body-swap-video";
writeJson(`${P}/package.json`, pkg);
const metaFile = `${P}/meta.json`;
if (existsSync(metaFile)) {
  const m = json<Record<string, unknown>>(metaFile);
  m.name = plan.title;
  writeJson(metaFile, m);
}
writeFileSync(
  `${P}/SPEC.md`,
  `# Billionaire Swap

OUTPUT: 1080×1920, 30fps, ${D}s, ${Math.round(D * 30)} frames.
GOAL: A handshake delivers an instant luxury upgrade, then the viewer discovers their old home is occupied by the former billionaire.
LOOK: Crisp pixel cast and original Blender-authored lit 3D vehicles, props and environments. Warm luxury, cool office, warm kitchen. Main palette muted teal #41696a and gold #c3a96c; red scarf reserved for the viewer after the visible physical transfer.
MOTION: Three luxury rewards and All yours complete by ${(plan as Plan & { luxuryMontageComplete: number }).luxuryMontageComplete}s. Pair handshake and scarf handoff are finite native GIF actions. Dialogue mouths follow selected-take word boundaries. End on the withheld handshake, occupied hands and one pancake bite.
CAPTIONS: DM Sans 900, 86px, 10px dark outline, 1–2 words below the middle at 1240px. No duplicate heading.
SOUND: Saved selected voices, episode-selected music and local assets from the local SFX library. Music placement, level and provenance are in audio-sources.json in the parent episode. No new sound-effect generation.
BANNED: Title cards, top banners, floating labels identifying the two minds, full-frame white flashes, stretched actors, cut-off hair, repetitive body bounce, a second ending after the pancake line.
QA: Read the handshake; verify the scarf changes owners only once; car and jet must read as actual vehicles; phone balance readable; door reveals Mum; she points before the original body is revealed; offered hand stays empty; plate and fork prevent the return handshake; all faces and necessary props clear of captions.

## Shots

${plan.shots.map((s) => `- Frames ${Math.round(s.start * 30)}–${Math.round((s.start + s.duration) * 30) - 1}: ${s.description}`).join("\n")}
`,
);
writeFileSync(
  `${P}/STORYBOARD.md`,
  plan.shots.map((s) => `${s.start.toFixed(2)}s: ${s.description}`).join("\n") +
    "\n",
);
console.log(
  JSON.stringify({
    project: P,
    seconds: D,
    shots: plan.shots.length,
    captionPhrases: phrases.length,
    assets: assets.length,
  }),
);
