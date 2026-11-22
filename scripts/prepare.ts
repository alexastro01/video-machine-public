import { existsSync } from "node:fs";
import { alignEpisode, cleanWords, findAnchor } from "../src/engine/align";
import { makeReviewEdit } from "../src/engine/review-plan";
import { makeUkEdit } from "../src/engine/uk-plan";
import { episodeSchema, type Word } from "../src/engine/schema";
import {
  checkpoint,
  command,
  duration,
  episodeId,
  json,
  loadEpisode,
  writeJson,
} from "./common";
import { createFoley } from "./foley";
const id = episodeId(process.argv[2]);
if (id === "alex-astro-remote-job") {
  command("uv", ["run", "--quiet", "--python", "3.11", "--with", "numpy", "python", `episodes/${id}/prepare.py`]);
  checkpoint(id, "prepared", { fps: 60, timing: "Aligned to Alex’s selected hackathon take" });
  process.exit(0);
}
const episode = loadEpisode(id);
if (episode.world === "share-ledger") {
  command("uv", ["run", "--quiet", "--with", "numpy", "python", `episodes/${id}/prepare.py`]);
  checkpoint(id, "prepared", { fps: episode.fps, timing: "Kai’s recorded opening, aligned after the silence trims" });
  process.exit(0);
}
if (episode.world === "lecture-hall-rpg") {
  const recipe = episode.lectureFull ? "full/prepare.py" : "prepare.py";
  command("uv", ["run", "--quiet", "--python", "3.11", "--with", "numpy", "python", `episodes/${id}/${recipe}`]);
  checkpoint(id, "prepared", { fps: episode.fps, timing: "Word alignment for the conformed narration and both reflected words" });
  process.exit(0);
}
if (episode.world === "job-market-rpg") {
  const recipe = episode.jobMarketFull ? "full/prepare.py" : "prepare.py";
  command("uv", ["run", "--quiet", "--python", "3.11", "--with", "numpy", "python", `episodes/${id}/${recipe}`]);
  checkpoint(id, "prepared", { fps: episode.fps, timing: "Recorded word boundaries from the conformed Alex and Opus takes" });
  process.exit(0);
}
if (episode.world === "instagram-rpg") {
  const recipe = `episodes/${id}/${episode.rpgCut === "quest" ? "full/prepare.py" : "prepare-opening.py"}`;
  const python = process.env.VIDEO_MACHINE_PYTHON;
  if (python) command(python, [recipe]);
  else command("uv", ["run", "--quiet", "--with", "numpy", "python", recipe]);
  checkpoint(id, "prepared", { fps: episode.fps, timing: episode.rpgCut === "quest" ? "Recorded Alex and Jessica dialogue, aligned after the full edit" : "Alex and Opus onsets from the conformed opening" });
  process.exit(0);
}
if (episode.world === "claude-design") {
  const recipe = episode.claudeEdit?.flat ? "prepare-v2.py" : "prepare.py";
  command("python3", [`episodes/${id}/${recipe}`]);
  checkpoint(id, "prepared", { fps: episode.fps, timing: "selected Alex take aligned after timecode conform" });
  console.log(`Prepared ${id} from the recorded script and cue sheet.`);
  process.exit(0);
}
if (episode.world === "alex-presenter") {
  const variant = process.argv.find((arg) => arg.startsWith("--variant="))?.slice(10);
  if (variant) episodeId(variant);
  const recipe = variant ? "scripts/alex-presenter-comment.py" : "scripts/alex-presenter-media.py";
  const recipeArgs = variant ? [recipe, id, variant] : [recipe, id];
  const python = process.env.VIDEO_MACHINE_PYTHON;
  if (python) command(python, recipeArgs);
  else command("uv", ["run", "--quiet", "--with", "numpy", "--with", "pillow", "python", ...recipeArgs]);
  checkpoint(id, variant ? `variantPrepared-${variant}` : "prepared", { timing: "selected narration, aligned after pacing edit", fps: episode.fps });
  process.exit(0);
}
if (["inbox-png", "human-in-the-loop", "astra-born-yesterday", "make-no-mistakes", "make-no-mistakes-story", "absolutely-right", "rip", "final-round"].includes(episode.world)) {
  const python = process.env.VIDEO_MACHINE_PYTHON;
  const recipe = `scripts/${episode.world}-media.py`;
  if (python) command(python, [recipe]);
  else command("uv", ["run", "--quiet", "--with", "numpy", "python", recipe]);
  checkpoint(id, "prepared", { timing: "selected source takes", fps: episode.fps });
  process.exit(0);
}
if (episode.world === "astra-quick-test") {
  command("uv", [
    "run", "--quiet", "--with", "numpy", "python",
    "scripts/astra-quick-test-media.py",
  ]);
  process.exit(0);
}
if (id === "is-coffee-actually-a-drug") {
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "python",
    "scripts/coffee-media.py",
  ]);
  process.exit(0);
}
if (id === "beer-feels-good") {
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "python",
    "scripts/beer-media.py",
  ]);
  console.log(
    "Prepared the selected Kai take, flat Miko actions, beer diagrams and local sound.",
  );
  process.exit(0);
}
if (episode.world === "nvidia") {
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "python",
    "scripts/nvidia-media.py",
  ]);
  console.log(
    "Prepared Nvidia exact-take narration, progressive captions, Blender timeline and local audio master.",
  );
  process.exit(0);
}
if (id === "ai-review-loop") {
  const python = process.env.VIDEO_MACHINE_PYTHON;
  if (python) command(python, ["scripts/review-loop-media.py"]);
  else
    command("uv", [
      "run",
      "--quiet",
      "--with",
      "numpy",
      "python",
      "scripts/review-loop-media.py",
    ]);
  console.log(
    "Prepared review-loop dialogue, code handoffs and local audio master.",
  );
  process.exit(0);
}
if (episode.world === "subscriber") {
  const python = process.env.VIDEO_MACHINE_PYTHON;
  if (python) command(python, ["scripts/subscriber-media.py"]);
  else
    command("uv", [
      "run",
      "--quiet",
      "--with",
      "numpy",
      "python",
      "scripts/subscriber-media.py",
    ]);
  console.log(
    "Prepared subscriber voices, captions, interface actions and clean local mix.",
  );
  process.exit(0);
}
if (episode.world === "ai-typo") {
  const python = process.env.VIDEO_MACHINE_PYTHON;
  if (python) command(python, ["scripts/ai-typo-media.py"]);
  else
    command("uv", [
      "run",
      "--quiet",
      "--with",
      "numpy",
      "python",
      "scripts/ai-typo-media.py",
    ]);
  console.log(
    "Prepared Alex/Opus dialogue, exact captions, interface motion and local sound.",
  );
  process.exit(0);
}
if (id === "billionaire-body-swap-5") {
  const python = process.env.VIDEO_MACHINE_PYTHON;
  if (python) command(python, ["scripts/swap5-media.py"]);
  else
    command("uv", [
      "run",
      "--quiet",
      "--with",
      "numpy",
      "python",
      "scripts/swap5-media.py",
    ]);
  console.log(
    "Prepared Part 5 exact voices, phone, shoebox, vault and local sound.",
  );
  process.exit(0);
}
if (id === "billionaire-body-swap-4") {
  const python = process.env.VIDEO_MACHINE_PYTHON;
  if (python) command(python, ["scripts/swap4-media.py"]);
  else
    command("uv", [
      "run",
      "--quiet",
      "--with",
      "numpy",
      "python",
      "scripts/swap4-media.py",
    ]);
  console.log(
    "Prepared Part 4 dialogue, parents’ evening actions and local sound.",
  );
  process.exit(0);
}
if (id === "billionaire-body-swap-3") {
  const python = process.env.VIDEO_MACHINE_PYTHON;
  if (python) command(python, ["scripts/swap3-media.py"]);
  else
    command("uv", [
      "run",
      "--quiet",
      "--with",
      "numpy",
      "python",
      "scripts/swap3-media.py",
    ]);
  console.log(
    "Prepared the saved Part 3 dialogue, physical actions and local sound.",
  );
  process.exit(0);
}
if (episode.world === "start-task") {
  const taskPlan = json<{ revision?: number }>(`episodes/${id}/plan.json`);
  const taskScript =
    taskPlan.revision === 3
      ? "scripts/start-task-v3-media.py"
      : "scripts/start-task-media.py";
  const python = process.env.VIDEO_MACHINE_PYTHON;
  if (python) command(python, [taskScript]);
  else
    command("uv", ["run", "--quiet", "--with", "numpy", "python", taskScript]);
  console.log(
    "Prepared the exact Kai take, Blender study, native pixel animation and local action sounds.",
  );
  process.exit(0);
}
if (id === "billionaire-body-swap-2") {
  const python = process.env.VIDEO_MACHINE_PYTHON;
  if (python) command(python, ["scripts/swap2-media.py"]);
  else
    command("uv", [
      "run",
      "--quiet",
      "--with",
      "numpy",
      "python",
      "scripts/swap2-media.py",
    ]);
  command(process.execPath, [
    "--import",
    "tsx",
    "scripts/swap2-hyperframes.ts",
  ]);
  console.log(
    "Prepared the billionaire sequel from exact cast takes, saved Blender assets and local sound.",
  );
  process.exit(0);
}
if (episode.world === "profile-motion") {
  const python = process.env.VIDEO_MACHINE_PYTHON;
  if (python) command(python, ["scripts/profile-checks-media.py"]);
  else
    command("uv", [
      "run",
      "--quiet",
      "--with",
      "numpy",
      "python",
      "scripts/profile-checks-media.py",
    ]);
  console.log(
    "Prepared profile checks from the selected Kai take and local action sounds.",
  );
  process.exit(0);
}
if (episode.world === "lonely-motion") {
  const python = process.env.VIDEO_MACHINE_PYTHON;
  if (python) command(python, ["scripts/lonely-media.py"]);
  else
    command("uv", [
      "run",
      "--quiet",
      "--with",
      "numpy",
      "--with",
      "scipy",
      "python",
      "scripts/lonely-media.py",
    ]);
  console.log(
    "Prepared the selected loneliness dialogue, captions and sound cues.",
  );
  process.exit(0);
}
if (episode.world === "shower-motion") {
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "--with",
    "scipy",
    "python",
    "scripts/shower-media.py",
  ]);
  console.log(
    "Prepared shower acoustics from the exact narrator take and one shared vocal source.",
  );
  process.exit(0);
}
if (episode.world === "ok-motion") {
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "python",
    "scripts/ok-motion-media.py",
    id,
  ]);
  console.log(
    "Prepared the full motion-graphics and pixel-character edit from the selected speech takes.",
  );
  process.exit(0);
}
if (episode.world === "ok-message") {
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "python",
    "scripts/ok-media.py",
  ]);
  console.log(
    "Prepared the nine-second Remotion chat-to-room sample from the selected takes and local sound library.",
  );
  process.exit(0);
}
if (episode.world === "body-swap" && episode.renderer === "hyperframes") {
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "python",
    "scripts/swap-media.py",
  ]);
  command(process.execPath, ["--import", "tsx", "scripts/swap-hyperframes.ts"]);
  console.log(
    "Prepared billionaire swap: exact dialogue, first-seven-second rewards, local-library sound and hybrid scene assets.",
  );
  process.exit(0);
}
if (episode.world === "lying-money" && episode.renderer === "hyperframes") {
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "python",
    "scripts/paid-media.py",
  ]);
  command(process.execPath, ["--import", "tsx", "scripts/paid-hyperframes.ts"]);
  console.log(
    "Prepared paid-for-lying: exact dialogue, first-seven-second payouts, fixed countdown and local hybrid scene assets.",
  );
  process.exit(0);
}
if (id === "where-did-my-year-go" && episode.renderer === "hyperframes") {
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "--with",
    "scipy",
    "python",
    "scripts/illustrated-short-media.py",
    id,
  ]);
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "pillow",
    "python",
    "scripts/year-assets-prepare.py",
  ]);
  command("python3", ["scripts/illustrated-short-project.py", id]);
  console.log(
    "Prepared the exact two-voice story, finite actions, memory shelf, local sound and editable HyperFrames project.",
  );
  process.exit(0);
}
if (episode.world === "memory" && episode.renderer === "hyperframes") {
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "python",
    "scripts/time-prepare.py",
  ]);
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "pillow",
    "python",
    "scripts/time-assets-prepare.py",
  ]);
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "--with",
    "scipy",
    "python",
    "scripts/time-sound.py",
  ]);
  command("python3", ["scripts/time-hyperframes.py"]);
  console.log(
    "Prepared time-speeds-up: exact-take phrase edit, native finite actions, memory jars and local lo-fi stems.",
  );
  process.exit(0);
}
if (episode.world === "immortal" && episode.renderer === "hyperframes") {
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "python",
    "scripts/immortal-film-media.py",
  ]);
  command(process.execPath, [
    "--import",
    "tsx",
    "scripts/immortal-hyperframes.ts",
  ]);
  console.log(
    "Prepared the complete immortal film from exact dialogue timings, finite performances, local scenery and chapter-aware sound.",
  );
  process.exit(0);
}
if (episode.world === "spy-test" && episode.renderer === "hyperframes") {
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "python",
    "scripts/spy-media.py",
  ]);
  command(process.execPath, ["--import", "tsx", "scripts/spy-hyperframes.ts"]);
  console.log(
    "Prepared spy comedy dialogue, exact-take captions, finite native GIFs and Three.js sets.",
  );
  process.exit(0);
}
if (episode.world === "fate" && episode.renderer === "hyperframes") {
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "python",
    "scripts/fate-media.py",
  ]);
  command(process.execPath, ["--import", "tsx", "scripts/fate-hyperframes.ts"]);
  console.log(
    "Prepared fate dialogue, exact-take captions, local sound and native Three.js HyperFrames scenes.",
  );
  process.exit(0);
}
if (episode.world === "deja-vu" && episode.renderer === "hyperframes") {
  command("python3", ["scripts/deja-vu-voice.py", "1.2"]);
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "stable-ts",
    "python",
    "scripts/deja-vu-align.py",
  ]);
  command("python3", ["scripts/deja-vu-prepare.py"]);
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "--with",
    "scipy",
    "python",
    "scripts/deja-vu-sound.py",
  ]);
  command("python3", ["scripts/deja-vu-hyperframes.py"]);
  console.log(
    "Prepared deja-vu: two-voice line edit at 1.2x, aligned captions, seamless-loop sound and HyperFrames project.",
  );
  process.exit(0);
}
if (episode.world === "neat" && episode.renderer === "hyperframes") {
  command(process.execPath, ["--import", "tsx", "scripts/restless-prepare.ts"]);
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "python",
    "scripts/restless-sound.py",
  ]);
  command("python3", ["scripts/restless-hyperframes.py"]);
  console.log(
    "Prepared restless-friend: selected-take captions, local sound and editable HyperFrames shots.",
  );
  process.exit(0);
}
if (episode.world === "inventions" && episode.renderer === "hyperframes") {
  command("python3", ["scripts/inventions-prepare.py"]);
  command("uv", [
    "run",
    "--quiet",
    "--with",
    "numpy",
    "--with",
    "scipy",
    "python",
    "scripts/inventions-sound.py",
  ]);
  command("python3", ["scripts/inventions-hyperframes.py"]);
  console.log(
    "Prepared landscape inventions: selected-take captions, local chapter audio and editable HyperFrames shots.",
  );
  process.exit(0);
}
if (id === "microwave") {
  command(process.execPath, [
    "--import",
    "tsx",
    "scripts/microwave-prepare.ts",
  ]);
  command("python3", ["scripts/microwave-sound.py"]);
  command(process.execPath, [
    "--import",
    "tsx",
    "scripts/microwave-hyperframes.ts",
  ]);
  console.log(
    "Prepared microwave: exact 1.2x speech, edited-take captions and local HyperFrames media.",
  );
  process.exit(0);
}
if (episode.renderer === "hyperframes" && episode.world === "guitar") {
  command(process.execPath, ["--import", "tsx", "scripts/guitar-prepare.ts"]);
  command("python3", ["scripts/guitar-sound.py"]);
  command(process.execPath, [
    "--import",
    "tsx",
    "scripts/guitar-hyperframes.ts",
  ]);
  console.log(
    "Prepared guitar-pickup: exact 1.2x voice, selected-take captions, local sound and HyperFrames scenes.",
  );
  process.exit(0);
}
const source = json<{ words: Word[]; sourceTake: number }>(
  `episodes/${id}/transcript-source.json`,
);
const voiceFile = `public/episodes/${id}/source-take-${source.sourceTake}.mp3`;
if (!existsSync(voiceFile))
  throw new Error(`Missing narration source: ${voiceFile}`);
const target =
  episode.duration -
  episode.audio.narrationOffset -
  episode.audio.narrationTail;
const pauses = episode.audio.pauses
  .map((p) => ({ ...p, at: findAnchor(cleanWords(source.words), p.before) }))
  .sort((a, b) => a.at - b.at);
let inputVoice = voiceFile;
if (pauses.length) {
  inputVoice = `public/episodes/${id}/source-paused.wav`;
  const filters = [
      `[0:a]asplit=${pauses.length + 1}${Array.from({ length: pauses.length + 1 }, (_, i) => `[s${i}]`).join("")}`,
    ],
    parts: string[] = [];
  for (let i = 0; i <= pauses.length; i++) {
    filters.push(
      `[s${i}]atrim=start=${i ? pauses[i - 1].at : 0}${i < pauses.length ? `:end=${pauses[i].at}` : ""},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=mono[a${i}]`,
    );
    parts.push(`[a${i}]`);
    if (i < pauses.length) {
      filters.push(
        `anullsrc=r=48000:cl=mono,atrim=duration=${pauses[i].seconds}[p${i}]`,
      );
      parts.push(`[p${i}]`);
    }
  }
  filters.push(`${parts.join("")}concat=n=${parts.length}:v=0:a=1[out]`);
  command("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    voiceFile,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[out]",
    inputVoice,
  ]);
}
const original = duration(inputVoice);
const trimmed = original - episode.audio.narrationTrimStart;
const ratio = trimmed / target;
if (ratio < 0.8 || ratio > 1.2)
  throw new Error(
    "Narration requires more than 20% retiming. Revise the script or regenerate the voice.",
  );
command("ffmpeg", [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-i",
  inputVoice,
  "-af",
  `atrim=start=${episode.audio.narrationTrimStart},asetpts=PTS-STARTPTS,atempo=${ratio},loudnorm=I=-16:TP=-1.5:LRA=11,apad`,
  "-t",
  String(target),
  "-ar",
  "48000",
  "-ac",
  "1",
  `public/${episode.audio.narration}`,
]);
const pausedWords = source.words.map((w) => ({
  ...w,
  start:
    w.start +
    pauses.filter((p) => w.start >= p.at).reduce((s, p) => s + p.seconds, 0),
  end:
    w.end +
    pauses.filter((p) => w.start >= p.at).reduce((s, p) => s + p.seconds, 0),
}));
const aligned = alignEpisode(episode, pausedWords, target / trimmed);
if (episode.world === "uk-vanish")
  aligned.episode.ukEdit = makeUkEdit(
    aligned.episode,
    aligned.captions,
    (pauses.reduce((s, p) => s + p.seconds, 0) * target) / trimmed,
  );
if (episode.reviewEdit && episode.id === "survive-1500")
  aligned.episode.reviewEdit = makeReviewEdit(
    aligned.episode,
    aligned.captions,
    (pauses.reduce((s, p) => s + p.seconds, 0) * target) / trimmed,
  );
episodeSchema.parse(aligned.episode);
writeJson(`episodes/${id}/episode.json`, aligned.episode);
writeJson(`episodes/${id}/captions.json`, aligned.captions);
writeJson(`episodes/${id}/studio-props.json`, aligned);
const scoreSource = `public/episodes/${id}/source-music.mp3`;
if (!existsSync(scoreSource))
  throw new Error(
    `Missing score: ${scoreSource}. Download the chosen ElevenLabs music take first.`,
  );
command("ffmpeg", [
  "-hide_banner",
  "-loglevel",
  "error",
  "-y",
  "-stream_loop",
  "-1",
  "-i",
  scoreSource,
  "-af",
  `loudnorm=I=-20:TP=-2:LRA=7,afade=t=in:d=1,afade=t=out:st=${episode.duration - 2}:d=2`,
  "-t",
  String(episode.duration),
  "-ar",
  "48000",
  "-ac",
  "2",
  `public/${episode.audio.music}`,
]);
createFoley(aligned.episode, `public/${episode.audio.effects}`);
checkpoint(id, "prepared", {
  voiceSourceTake: source.sourceTake,
  originalVoiceSeconds: duration(voiceFile),
  voiceWithPauseSeconds: original,
  insertedPauseSeconds: pauses.reduce((s, p) => s + p.seconds, 0),
  narrationSeconds: target,
  speedRatio: ratio,
  scenes: episode.scenes.length,
  captionWords: aligned.captions.length,
});
console.log(
  `Prepared ${id}: ${episode.scenes.length} voice-aligned scenes, ${aligned.captions.length} timed words, ${episode.duration}s.`,
);
