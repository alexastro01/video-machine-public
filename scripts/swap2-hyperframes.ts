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

const B = "episodes/billionaire-body-swap-2",
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
    `public/episodes/billionaire-body-swap-2/${name}.wav`,
    `${P}/assets/${name}.wav`,
  );
copyFileSync("public/fonts/dmsans.ttf", `${P}/assets/fonts/dmsans.ttf`);
copyFileSync(
  "public/fonts/dmsans-OFL.txt",
  `${P}/assets/fonts/DM-Sans-OFL.txt`,
);
copyFileSync(
  "public/episodes/billionaire-body-swap-2/swap-stage-sequel.glb",
  `${P}/assets/swap-stage-sequel.glb`,
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
const complete = { ...plan, assets, model: "assets/swap-stage-sequel.glb" };
writeJson(`${P}/assets/story.json`, complete);
await build({
  entryPoints: ["src/swap2/world.ts"],
  outfile: `${P}/assets/swap2-world.js`,
  bundle: true,
  format: "iife",
  globalName: "Swap2World",
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
const worldScript = `window.__hf=window.__hf||{};window.__hf.buildReady=window.__hf.buildReady||{};window.__hf.buildReady.swap2=(async()=>{await document.fonts.load('900 86px "DM Sans"');await document.fonts.ready;const engine=await Swap2World.boot(document.getElementById('paid-canvas'),${JSON.stringify(complete)});window.__swap2Engine=engine;const tl=gsap.timeline({paused:true});tl.to({t:0},{t:${D},duration:${D},ease:'none'});window.__timelines.world=tl;})();`;
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
  for (let i = 0; i < page.length; i++) {
    if (reward && i > 0) continue;
    const firstFrame = (seconds: number) =>
      Math.ceil(seconds * plan.fps - 1e-5) / plan.fps;
    const start = firstFrame(page[i].startMs / 1000),
      finish = firstFrame(
        !reward && i + 1 < page.length ? page[i + 1].startMs / 1000 : end,
      );
    if (Math.ceil(start * 30 - 1e-8) >= Math.ceil(finish * 30 - 1e-8)) continue;
    const id = `cap-${pageIndex}-${i}`;
    const prefix = page.slice(0, reward ? page.length : i + 1);
    const display =
      prefix.length === 2 &&
      prefix[0].text.toLowerCase() === "five" &&
      prefix[1].text.toLowerCase() === "thousand"
        ? [{ ...prefix[0], text: "5000" }]
        : prefix.map((w) => ({
            ...w,
            text:
              ({ five: "5", four: "4" } as Record<string, string>)[
                w.text.toLowerCase()
              ] ?? w.text,
          }));
    const text = display
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
                "homework",
                "dishes",
                "bins",
                "maths",
                "tomorrow",
                "4",
                "5",
                "5000",
              ].includes(norm)
            ? "#d5d49a"
            : "#ffffff";
        return `<span style="color:${color}">${esc(w.text.toUpperCase())}</span>`;
      })
      .join(" ");
    phrases.push({
      start,
      end: finish,
      text: display.map((w) => w.text).join(" "),
    });
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
  `<!doctype html><html><head><meta charset="utf-8"><title>${esc(plan.title)}</title><script src="assets/vendor/gsap.min.js"></script><script src="assets/swap2-world.js"></script><style>html,body{margin:0;background:#142b36;overflow:hidden}#root{position:relative;width:1080px;height:1920px;overflow:hidden}.clip{position:absolute;inset:0}</style></head><body><div id="root" data-composition-id="main" data-width="1080" data-height="1920" data-duration="${D}">${hosts.join("\n")}</div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});tl.to({p:0},{p:1,duration:${D},ease:'none'});window.__timelines.main=tl;</script></body></html>`,
);
const pkg = JSON.parse(readFileSync(`${P}/package.json`, "utf8"));
pkg.name = "billionaire-body-swap-2-video";
writeJson(`${P}/package.json`, pkg);
const metaFile = `${P}/meta.json`;
if (existsSync(metaFile)) {
  const m = json<Record<string, unknown>>(metaFile);
  m.name = plan.title;
  writeJson(metaFile, m);
}
writeFileSync(
  P + "/SPEC.md",
  "# The Billionaire Wants His Body Back\n\n" +
    "OUTPUT: 1080x1920, 30fps, " +
    D +
    " seconds.\n" +
    "STYLE: The first billionaire film's Blender-authored 3D kitchen and porch, with crisp pixel characters. Warm gold key, cool blue rim, muted sage, cream, teal and wood. The suited body wears the red scarf throughout; the original young body has none.\n" +
    "STORY: The billionaire keeps the viewer's old life for Mum's pancakes, then discovers its chores. His new hand offer is refused. The maths paper and defeated reaction pay off the reversal.\n" +
    "CAMERA: Gentle eye-level views for sprites. Separate overhead book and counter views show physical props. No tilted or steep views of pixel characters. No camera drift during the final reaction.\n" +
    "TEXT: Progressive 1-2 word captions at 1240px. The physical worksheet says MATHS and TOMORROW. No banners, Part 2 label, production text, branding or end card.\n" +
    "SOUND: Exact selected cast recordings and word timing; preserved quiet word edges. Mosquito series bed at one constant gain, local-library sound on each impact and cut.\n" +
    "BANNED: A second swap, clothing magically changing bodies, a scarf on the young body, a mutual handshake, bright flash transitions, repeated character bounce, a rushed final reset, a second joke after the maths line.\n\n" +
    plan.shots
      .map(
        (s) =>
          "- Frames " +
          Math.round(s.start * 30) +
          "-" +
          (Math.round((s.start + s.duration) * 30) - 1) +
          ": " +
          s.description,
      )
      .join("\n") +
    "\n",
);
writeFileSync(
  P + "/STORYBOARD.md",
  plan.shots.map((s) => s.start.toFixed(2) + "s: " + s.description).join("\n") +
    "\n",
);
writeJson(P + "/compositions/world.motion.json", {
  duration: D,
  assertions: [
    { kind: "appearsBy", selector: "#paid-canvas", bySec: 0.1 },
    { kind: "staysInFrame", selector: "#paid-canvas" },
  ],
});
console.log(
  JSON.stringify({
    project: P,
    seconds: D,
    shots: plan.shots.length,
    captionStates: phrases.length,
    assets: assets.length,
  }),
);
