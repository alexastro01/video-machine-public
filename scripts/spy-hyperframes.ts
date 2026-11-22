import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { json, writeJson } from "./common";
import type { SpyAsset, SpyAnimation, SpyPlan } from "../src/spy/types";
const B = "episodes/girlfriend-spy-test",
  P = `${B}/hyperframes`;
const t = json<SpyPlan>(`${B}/timeline.json`);
type Caption = { text: string; startMs: number; endMs: number };
const words = json<Caption[]>(`${B}/captions.json`);
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
for (const name of ["narration", "music", "effects"])
  copyFileSync(
    `public/episodes/girlfriend-spy-test/${name}.wav`,
    `${P}/assets/${name}.wav`,
  );
copyFileSync("public/fonts/dmsans.ttf", `${P}/assets/fonts/dmsans.ttf`);
copyFileSync(
  "public/fonts/dmsans-OFL.txt",
  `${P}/assets/fonts/DM-Sans-OFL.txt`,
);
const assets: SpyAsset[] = [];
const poses = json<
  Record<
    string,
    {
      file: string;
      width: number;
      height: number;
      pivotX: number;
      footY: number;
    }
  >
>(`${B}/assets/poses-v1.json`);
for (const [id, pose] of Object.entries(poses)) {
  const name = path.basename(pose.file);
  copyFileSync(`public/${pose.file}`, `${P}/assets/art/${name}`);
  const h = id.startsWith("miko")
    ? 2.48
    : id.startsWith("girlfriend")
      ? 2.38
      : 2.27;
  assets.push({
    id,
    url: `assets/art/${name}`,
    width: pose.width,
    height: pose.height,
    worldHeight: h,
    pivotX: pose.pivotX,
    footY: pose.footY,
  });
}
const animations = json<Record<string, { atlas: string; metadata: string }>>(
  `${B}/assets/animations-v1.json`,
);
for (const [name, info] of Object.entries(animations)) {
  const meta = json<SpyAnimation>(`public/${info.metadata}`),
    c = meta.crop,
    filename = path.basename(info.atlas);
  copyFileSync(`public/${info.atlas}`, `${P}/assets/art/${filename}`);
  assets.push({
    id: `${name}-gif`,
    url: `assets/art/${filename}`,
    width: c.width,
    height: c.height,
    worldHeight: name.startsWith("miko")
      ? 2.48
      : name.startsWith("girlfriend")
        ? 2.38
        : 2.27,
    pivotX: meta.cellWidth / 2 - c.x,
    footY: c.height - 4,
    animation: meta,
  });
}
const plan = { ...t, assets };
writeJson(`${P}/assets/story.json`, plan);
await build({
  entryPoints: ["src/spy/world.ts"],
  outfile: `${P}/assets/spy-world.js`,
  bundle: true,
  format: "iife",
  globalName: "SpyWorld",
  platform: "browser",
  target: "es2020",
  sourcemap: true,
});
const css = `@font-face{font-family:'DM Sans';src:url('assets/fonts/dmsans.ttf');font-weight:100 1000}*{box-sizing:border-box}.clip{position:absolute;inset:0}.caption{position:absolute;left:108px;top:1450px;width:864px;text-align:center;font:900 84px/1.12 'DM Sans';letter-spacing:-2px;color:#fff;-webkit-text-stroke:10px #14232d;paint-order:stroke fill;text-shadow:0 4px 0 #14232d}.caption-inner{display:inline-block}.check{position:absolute;left:430px;top:1190px;width:220px;height:220px}.check svg{width:100%;height:100%;overflow:visible}.wipe{position:absolute;left:-600px;top:780px;width:2300px;height:240px;background:#9b7d59;border:18px solid #3a3e38;transform-origin:50% 50%}.wipe-paper{position:absolute;inset:15px;background:#b7ac8a;border:5px solid #727263}`;
function escape(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
}
function doc(id: string, body: string, script: string) {
  return `<template><style>#root{position:absolute;inset:0;background:transparent}${css}</style><div id="root" data-composition-id="${id}" data-width="1080" data-height="1920">${body}</div><script>const tl=gsap.timeline({paused:true});${script}window.__timelines['${id}']=tl;</script></template>`;
}
const hosts: string[] = [];
const worldScript = `window.__hf=window.__hf||{};window.__hf.buildReady=window.__hf.buildReady||{};window.__hf.buildReady.spy=(async()=>{await document.fonts.load('900 84px "DM Sans"');await document.fonts.ready;const engine=await SpyWorld.boot(document.getElementById('spy-canvas'),${JSON.stringify(plan)});window.__spyEngine=engine;const tl=gsap.timeline({paused:true});tl.to({t:0},{t:${t.duration},duration:${t.duration},ease:'none'});window.__timelines.world=tl;})();`;
writeFileSync(
  `${P}/compositions/world.html`,
  `<template><style>#root{position:absolute;inset:0;background:transparent}canvas{display:block;width:1080px;height:1920px}</style><div id="root" data-composition-id="world" data-width="1080" data-height="1920"><canvas id="spy-canvas" width="1080" height="1920" data-layout-ignore></canvas></div><script>${worldScript}</script></template>`,
);
hosts.push(
  `<div id="world" class="clip" data-composition-id="world" data-composition-src="compositions/world.html" data-start="0" data-duration="${t.duration}" data-track-index="0" data-track-kind="graphics" data-width="1080" data-height="1920" data-layout-ignore style="z-index:1"></div>`,
);
for (const shot of t.shots) {
  let body = "",
    script = `tl.to({p:0},{p:1,duration:${shot.duration},ease:'none'},0);`;
  const checkFor =
    shot.id === "league"
      ? "leagueCheck"
      : shot.id === "servers"
        ? "aiCheck"
        : shot.id === "ignored"
          ? "gpuCheck"
          : shot.id === "alarm"
            ? "taipeiCheck"
            : undefined;
  if (checkFor) {
    const start = Math.max(0, t.events[checkFor] - shot.start),
      duration = Math.max(0.05, shot.duration - start);
    body = `<div id="tick-${shot.id}" class="clip" data-start="${start}" data-duration="${duration}" data-layout-allow-caption-zone><div id="check-${shot.id}" class="check"><svg viewBox="0 0 160 160" aria-label="check"><path id="tick-outline-${shot.id}" d="M34 82 L64 111 L130 42" fill="none" stroke="#182c35" stroke-width="25" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/><path id="tick-line-${shot.id}" d="M34 82 L64 111 L130 42" fill="none" stroke="#a7bf92" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg></div></div>`;
    script += `tl.fromTo('#tick-outline-${shot.id},#tick-line-${shot.id}',{strokeDasharray:1,strokeDashoffset:1},{strokeDashoffset:0,duration:.12,ease:'power2.out'},${start});tl.fromTo('#check-${shot.id}',{scale:.83},{scale:1,duration:.14,ease:'back.out(1.2)'},${start});`;
  }
  writeFileSync(
    `${P}/compositions/${shot.id}.html`,
    doc(shot.id, body, script),
  );
  hosts.push(
    `<div id="${shot.id}" class="clip" data-composition-id="${shot.id}" data-composition-src="compositions/${shot.id}.html" data-start="${shot.start}" data-duration="${shot.duration}" data-beat="${escape(shot.description)}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920" style="z-index:2"></div>`,
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
const covered = new Set(
  cues.flatMap((c) => c.words.map((w) => `${w.startMs}:${w.text}`)),
);
if (words.some((w) => !covered.has(`${w.startMs}:${w.text}`)))
  throw new Error("A caption token has no delivery frame");
let captionBody = "",
  captionScript = "";
const tone = (text: string) =>
  /gpu|10|ai|graphics|test/i.test(text)
    ? "#dcc08d"
    : /spy|asset|never/i.test(text)
      ? "#e2a18c"
      : "#fff";
cues.forEach((cue, i) => {
  captionBody += `<div id="caption-${i}" class="clip" data-start="${cue.start}" data-duration="${cue.end - cue.start}"><div class="caption"><span id="caption-inner-${i}" class="caption-inner">${cue.words.map((w) => `<span style="color:${tone(w.text)}">${escape(w.text.toUpperCase())}</span>`).join(" ")}</span></div></div>`;
  captionScript += `tl.fromTo('#caption-inner-${i}',{scale:.97},{scale:1,duration:.065,ease:'power2.out'},${cue.start});`;
});
writeJson(`${B}/caption-cues.json`, cues);
writeJson(`${B}/caption-frame-coverage.json`, {
  tokens: words.length,
  everyTokenVisible: true,
  visibleStates: cues.length,
});
writeFileSync(
  `${P}/compositions/captions.html`,
  doc("captions", captionBody, captionScript),
);
hosts.push(
  `<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${t.duration}" data-track-index="3" data-track-kind="captions" data-width="1080" data-height="1920" data-layout-allow-overlap style="z-index:10"></div>`,
);
const wipeStart = t.duration - 0.19,
  wipeDuration = 0.13;
writeFileSync(
  `${P}/compositions/replay.html`,
  doc(
    "replay",
    `<div id="replay-wipe" class="clip" data-start="0" data-duration="${wipeDuration}" data-layout-ignore><div id="clipboard-wipe" class="wipe"><div class="wipe-paper"></div></div></div>`,
    `tl.fromTo('#clipboard-wipe',{x:-1900,rotation:-15},{x:1900,rotation:15,duration:${wipeDuration},ease:'none'},0);`,
  ),
);
hosts.push(
  `<div id="replay" class="clip" data-composition-id="replay" data-composition-src="compositions/replay.html" data-start="${wipeStart}" data-duration="${wipeDuration}" data-track-index="2" data-track-kind="graphics" data-width="1080" data-height="1920" data-layout-ignore style="z-index:12"></div>`,
);
const audio = ["narration", "music", "effects"]
  .map(
    (name, i) =>
      `<audio id="${name}" class="clip" src="assets/${name}.wav" data-start="0" data-duration="${t.duration}" data-track-index="${4 + i}" data-volume="1"></audio>`,
  )
  .join("");
writeFileSync(
  `${P}/index.html`,
  `<!doctype html><html lang="en" data-resolution="portrait"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920"><script src="assets/vendor/gsap.min.js"></script><script src="assets/spy-world.js"></script><style>${css}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#152b3c}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="${t.duration}" data-width="1080" data-height="1920" data-fps="30">${hosts.join("")}${audio}</div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});tl.to({t:0},{t:${t.duration},duration:${t.duration},ease:'none'});window.__timelines.main=tl;</script></body></html>`,
);
writeJson(`${P}/meta.json`, {
  id: `girlfriend-spy-test-v${t.revision}`,
  name: t.title,
});
for (const file of ["package.json", "hyperframes.json"])
  if (!existsSync(`${P}/${file}`))
    copyFileSync(
      `episodes/happens-for-a-reason/hyperframes/${file}`,
      `${P}/${file}`,
    );
copyFileSync(`${B}/SPEC.md`, `${P}/SPEC.md`);
copyFileSync(`${B}/STORYBOARD.md`, `${P}/STORYBOARD.md`);
console.log(
  `Built ${t.shots.length} spy shots, ${assets.length} local cast assets and ${words.length} exact-take caption tokens.`,
);
