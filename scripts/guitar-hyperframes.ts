import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { episodeSchema } from "../src/engine/schema";
import type { Caption } from "@remotion/captions";
import { reviewCaptionCues } from "../src/components/ReviewCaptions";
const dir = "episodes/guitar-pickup",
  project = dir + "/hyperframes";
const e = episodeSchema.parse(
  JSON.parse(readFileSync(dir + "/episode.json", "utf8")),
);
const captions: Caption[] = JSON.parse(
  readFileSync(dir + "/captions.json", "utf8"),
);
const cues = reviewCaptionCues(captions, true);
const visuals = JSON.parse(readFileSync(dir + "/visuals.json", "utf8"));
const worldAsset: string = visuals.worldFile;
const mix = existsSync(dir + "/audio-mix.json")
  ? JSON.parse(readFileSync(dir + "/audio-mix.json", "utf8"))
  : { musicGainDb: 0 };
const narrationMediaSeconds = Number(
  execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      "public/" + e.audio.narration,
    ],
    { encoding: "utf8" },
  ),
);
for (const p of ["assets", "assets/fonts", "assets/vendor", "compositions"])
  mkdirSync(project + "/" + p, { recursive: true });
for (const name of ["narration", "music", "effects"]) {
  const source = "public/" + e.audio[name as keyof typeof e.audio];
  const target = project + "/assets/" + name + ".wav";
  if (name === "music" && mix.musicGainDb)
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-y",
      "-i",
      source,
      "-af",
      `volume=${Number(mix.musicGainDb)}dB`,
      target,
    ]);
  else copyFileSync(source, target);
}
copyFileSync(
  "experiments/hyperframes/assets/vendor/gsap.min.js",
  project + "/assets/vendor/gsap.min.js",
);
copyFileSync(
  "experiments/hyperframes/assets/fonts/dmsans.ttf",
  project + "/assets/fonts/dmsans.ttf",
);
copyFileSync(
  "experiments/hyperframes/assets/fonts/dmsans-OFL.txt",
  project + "/assets/fonts/dmsans-OFL.txt",
);
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const css = `@font-face{font-family:'DM Sans';src:url('assets/fonts/dmsans.ttf');font-weight:100 1000}*{box-sizing:border-box}#root{position:absolute;inset:0;overflow:hidden}video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}`;
const storyboard = [
  "# Guitar short storyboard",
  "",
  "The 65-word narration sets every cut. The guitar, pickup, cable, amplifier and speaker are Blender geometry. Miko is a lit upright pixel plane; his strum is a native GIF atlas. Captions reproduce the voice, 1–2 words at a time.",
  "",
];
for (const s of e.scenes) {
  const file = `<template><style>${css}</style><div id="root" data-composition-id="${s.id}" data-width="1080" data-height="1920"><video id="${s.id}-world" class="clip" src="assets/${worldAsset}" data-start="0" data-duration="${s.duration}" data-media-start="${s.start}" data-track-index="0" muted playsinline></video></div><script>const tl=gsap.timeline({paused:true});tl.to({t:0},{t:${s.duration},duration:${s.duration},ease:'none'});window.__timelines['${s.id}']=tl;</script></template>`;
  writeFileSync(project + "/compositions/" + s.id + ".html", file);
  const verbs: Record<string, string> = {
    hook: "Pull the plug, strum twice, hear two quiet plinks, react.",
    dive: "Dive from guitar body toward the strings and reveal the shrunken explorer.",
    string:
      "Finger pulls and releases a steel string. Miko looks at the vibrating cable overhead.",
    pickup:
      "Miko steps toward the pickup. Lift the cover to reveal magnets and the winding.",
    magnet:
      "Object view: pole caps light in sequence. Cut to the lowered steel string at 12.617s; show one damped lateral pluck.",
    flux: "Reveal anchored field paths at 14.35s. Cut to the field at 14.7s, then the copper at 16.2s; draw one warm tracer through the winding.",
    nylon:
      "Replace the active steel strand with nylon over the same pole. It moves without producing the signal; the static magnetic field remains.",
    cable: "Miko rides the schematic signal down the curved cable.",
    amp: "The signal grows across a valve-amplifier cutaway.",
    speaker: "Cone pumps. Air fronts pass Miko and push the scarf back.",
    closer:
      "Insert the plug. Strum a louder chord, hold its sound, return to the opening pose.",
  };
  storyboard.push(
    `- Frames ${Math.round(s.start * 30)}–${Math.round((s.start + s.duration) * 30) - 1}, ${s.id}: ${verbs[s.id]}`,
  );
}
const tone = (word: string) =>
  /^(82|copper|magnets|magnetise|voltage)/i.test(word)
    ? "#f4cf84"
    : /^(no|nylon)/i.test(word)
      ? "#ed9c90"
      : "#ffffff";
const html = cues
  .map(
    (c, i) =>
      `<div id="caption-${i}" class="clip caption" data-start="${c.start / 1000}" data-duration="${(c.end - c.start) / 1000}" data-track-index="2" data-layout-allow-caption-zone><span id="caption-inner-${i}">${c.words.map((w) => `<span style="color:${tone(w.text)}">${esc(w.text.trim().toUpperCase())}</span>`).join(" ")}</span></div>`,
  )
  .join("\n");
writeFileSync(
  project + "/compositions/captions.html",
  `<template><style>${css}.caption{position:absolute;left:108px;top:1320px;width:864px;height:140px;display:flex;align-items:center;justify-content:center;text-align:center;font:900 86px/1.08 'DM Sans';letter-spacing:-2px;color:white;-webkit-text-stroke:10px #10151e;paint-order:stroke fill;text-shadow:0 5px 0 #10151e}.caption span{display:inline-block}</style><div id="root" data-composition-id="captions" data-width="1080" data-height="1920" data-layout-allow-overlap>${html}</div><script>const tl=gsap.timeline({paused:true});${cues.map((c, i) => `tl.fromTo('#caption-inner-${i}',{scale:.92},{scale:1,duration:.085,ease:'power2.out'},${c.start / 1000});`).join("\n")}window.__timelines.captions=tl;</script></template>`,
);
const hosts = e.scenes
  .map(
    (s) =>
      `<div id="${s.id}" class="clip" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${s.start}" data-duration="${s.duration}" data-track-index="0" data-track-kind="graphics" data-width="1080" data-height="1920" style="position:absolute;inset:0;z-index:1"></div>`,
  )
  .join("\n");
writeFileSync(
  project + "/index.html",
  `<!doctype html><html lang="en" data-resolution="portrait" data-composition-variables='[{"id":"episodeTitle","type":"string","label":"Editor episode title","default":"Where an Electric Guitar Gets Its Roar"}]'><head><meta charset="UTF-8"><meta name="viewport" content="width=1080,height=1920"><script src="assets/vendor/gsap.min.js"></script><style>${css}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#426e75}#root{position:absolute;inset:0}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="30" data-fps="30" data-width="1080" data-height="1920">${hosts}<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="30" data-track-index="2" data-track-kind="captions" data-width="1080" data-height="1920" data-layout-allow-overlap style="position:absolute;inset:0;z-index:10"></div><audio id="narration" class="clip" src="assets/narration.wav" data-start="0" data-duration="${narrationMediaSeconds}" data-track-index="3" data-volume="1"></audio><audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="30" data-track-index="4" data-volume="1"></audio><audio id="effects" class="clip" src="assets/effects.wav" data-start="0" data-duration="30" data-track-index="5" data-volume="0.8"></audio></div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});tl.to({t:0},{t:30,duration:30,ease:'none'});window.__timelines.main=tl;</script></body></html>`,
);
writeFileSync(project + "/STORYBOARD.md", storyboard.join("\n") + "\n");
writeFileSync(
  project + "/SPEC.md",
  `# Guitar mechanism short\n\nGOAL: Follow the steel string's motion through a magnetic pickup to a loudspeaker.\nOUTPUT: HyperFrames 0.9.23, 1080×1920, 30 fps, 30 seconds / 900 frames.\nLOOK: 540×960 Blender Eevee world, enlarged exactly 2× with nearest sampling; 24 samples, AgX Medium High Contrast. Honey body, muted teal room, cool steel, copper winding, red scarf. Warm area key and cool rim. DM Sans 900, 86px, black 10px stroke, white fill, lower captions at 72%.\nMOTION: Frame index / 30 drives every object and camera. Native 12-frame strumming GIF at 100ms/frame, played as two distinct attempts then held. Exploration and wind GIFs remain on the approved actions. The pickup explanation uses four object views without a character. Only the first string moves in damped lateral plucks. Fields stay anchored and draw once; a warm tracer follows the winding. No browser GIF clock.\nSOUND: OpenAI Coral temporary narrator at exact 1.2×, selected-take word timestamps. Quiet plinks first, louder recorded guitar chord after the final plug-in. Reused channel music below voice; effects tied to visible actions.\nSHOTS: See STORYBOARD.md. Use the timed magnet, steel, field and copper views in ../visuals.json. Strings sit 0.0474 world units above the pole tips; pickup height is compressed into the body housing.\nBANNED: Branding, title cards, static hook labels replacing spoken words, caption boxes, extreme sprite angles, field lines over faces, repetitive pumping or character bouncing, towering strings, white flash transitions, empty silent sea, floating hand props, empty black frames.\nQA: Opening strum and plug, dive, finger release, pickup cover, copper/field relation, nylon in the steel position/no signal, cable ride, amp gain, cone/air, final chord and picture loop. Inspect encoded footage, not just isolated stills.\n`,
);
writeFileSync(
  project + "/meta.json",
  JSON.stringify(
    { id: `guitar-pickup-v${mix.revision ?? visuals.version}`, name: e.title },
    null,
    2,
  ) + "\n",
);
console.log({
  project,
  scenes: e.scenes.length,
  captions: cues.length,
  worldReady: existsSync(project + "/assets/" + worldAsset),
});
