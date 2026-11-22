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
const dir = "episodes/microwave",
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
  "# Microwave storyboard",
  "",
  "A fast soup/ice contrast leads through the oven wall into dipole motion, restricted ice, door shielding and standing-wave hot spots. Miko uses four new pixel poses and a native bracing GIF. Every caption follows the selected edited take, played at exactly 1.2x.",
  "",
];
for (const s of e.scenes) {
  const file = `<template><style>${css}</style><div id="root" data-composition-id="${s.id}" data-width="1080" data-height="1920"><video id="${s.id}-world" class="clip" src="assets/${worldAsset}" data-start="0" data-duration="${s.duration}" data-media-start="${s.start}" data-track-index="0" muted playsinline></video></div><script>const tl=gsap.timeline({paused:true});tl.to({t:0},{t:${s.duration},duration:${s.duration},ease:'none'});window.__timelines['${s.id}']=tl;</script></template>`;
  writeFileSync(project + "/compositions/" + s.id + ".html", file);
  const verbs: Record<string, string> = {
    hook: "Steam rises from soup while the plate is already spinning. Miko wipes his brow outside the shut door.",
    ice: "Punch into an almost unchanged ice cube; a tiny melted bead rolls off its corner.",
    dive: "A fast scale reveal carries us through the closed-door cutaway into the giant chamber.",
    magnetron:
      "The side cover slides clear to expose the magnetron behind the cavity wall. Miko becomes visible after the panel clears him, standing on the upper cooling fin.",
    feed: "A bright wave packet follows the waveguide into the metal chamber.",
    water:
      "Magnify soup into bent three-atom water molecules; positive and negative ends separate in view.",
    field:
      "The electric-field arrows reverse and the dipoles turn with a visible lag. Motion greatly slowed.",
    follow:
      "Follow one water dipole turning toward the field; neighbouring molecules interrupt it.",
    heat: "Jostling spreads through neighbours, changing their warm colour from the impact outwards.",
    soup: "The soup warms before the ceramic bowl; the heat highlight spreads from food into the rim.",
    lattice:
      "The same dipoles sit in an ice lattice and only wiggle; most wave light passes through.",
    defrost:
      "Power pulses, a melt bead forms, then a warm conduction front spreads during the off period. A second angle shows the result.",
    door: "Miko presses his palms against a giant metal mesh; long wavefronts reflect back into the chamber.",
    light:
      "Macro view of a mesh opening: a tiny visible-light ripple passes through while the long wave is blocked.",
    hotspots:
      "Reflected waves cross above alternating warm and cool floor patches.",
    ride: "Miko rides the camera-facing outer plate rim through stationary hot/cold patches; the food's heat becomes more even.",
    closer:
      "A mechanical ding accompanies the return to the original microwave and ice.",
    loop: "Match the first camera, character pose, ice orientation and steam phase for replay.",
  };
  storyboard.push(
    `- Frames ${Math.round(s.start * 30)}–${Math.round((s.start + s.duration) * 30) - 1}, ${s.id}: ${verbs[s.id]}`,
  );
}
const tone = (word: string) =>
  /^(water|microwaves|magnetron|2.45|billion|heat|light)/i.test(word)
    ? "#f4cf84"
    : /^(ice|frozen|cold|locks)/i.test(word)
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
  `<!doctype html><html lang="en" data-resolution="portrait" data-composition-variables='[{"id":"episodeTitle","type":"string","label":"Editor episode title","default":"How Does a Microwave Actually Work?"}]'><head><meta charset="UTF-8"><meta name="viewport" content="width=1080,height=1920"><script src="assets/vendor/gsap.min.js"></script><style>${css}html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#426e75}#root{position:absolute;inset:0}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-duration="45" data-fps="30" data-width="1080" data-height="1920">${hosts}<div id="captions" class="clip" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="45" data-track-index="2" data-track-kind="captions" data-width="1080" data-height="1920" data-layout-allow-overlap style="position:absolute;inset:0;z-index:10"></div><audio id="narration" class="clip" src="assets/narration.wav" data-start="0" data-duration="${narrationMediaSeconds}" data-track-index="3" data-volume="1"></audio><audio id="music" class="clip" src="assets/music.wav" data-start="0" data-duration="45" data-track-index="4" data-volume="1"></audio><audio id="effects" class="clip" src="assets/effects.wav" data-start="0" data-duration="45" data-track-index="5" data-volume="0.8"></audio></div><script>window.__timelines=window.__timelines||{};const tl=gsap.timeline({paused:true});tl.to({t:0},{t:45,duration:45,ease:'none'});window.__timelines.main=tl;</script></body></html>`,
);
writeFileSync(project + "/STORYBOARD.md", storyboard.join("\n") + "\n");
writeFileSync(
  project + "/SPEC.md",
  `# Microwave mechanism short\n\nGOAL: Explain why liquid water heats faster than ice, then pay off the mesh and rotating plate.\nOUTPUT: HyperFrames 0.9.23, 1080×1920, 30 fps, 45 seconds / 1350 frames.\nLOOK: 540×960 Blender Eevee world enlarged exactly 2× nearest; 24 samples, warm key/cool rim. Muted teal steel, warm cream kitchen, luminous pale cyan waves, red scarf. 1–2 word progressive captions, DM Sans 900 at 86px, black 10px outline, baseline near 72%.\nMOTION: Frame / 30 drives all objects. Purposeful cause/effect, no repeated Miko bouncing. Water motion is explanatory slow motion with lag, not a literal GHz animation. Magnetron is behind the cavity wall. Closed-door cutaway only while operating.\nSOUND: ElevenLabs Amara take 2, silence-only trims followed by exact 1.2× playback. Soup steam, motor hum, switch clicks, wave sweeps, lattice ticks, mesh taps and final ding. Music below speech.\nSHOTS: STORYBOARD.md and ../episode.json. Each beat has its own readable object state.\nBANNED: Branding, title cards, static topic banners, caption boxes, extreme sprite angles, head/prop intersections, unsupported props, repeated bouncing, full-white transitions, silent empty footage.\nQA: Inspect the contrast hook, chamber dive, magnetron position/waveguide, bent water geometry and phase lag, locked ice, power-off conduction, mesh reflection, visible-light transmission, static hot spots under a rotating plate, replay boundary.\n`,
);
writeFileSync(
  project + "/meta.json",
  JSON.stringify(
    { id: `microwave-v${mix.revision ?? visuals.version}`, name: e.title },
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
