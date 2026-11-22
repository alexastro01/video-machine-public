import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Caption } from "@remotion/captions";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import {
  checkpoint,
  command,
  episodeId,
  json,
  loadEpisode,
  portraitFormat,
  exportStem,
} from "./common";
import { browserExecutable } from "./browser";
import { muxTimedMaster, normalizeDelivery } from "./delivery";
import { assertHyperframesDimensions } from "../src/engine/hyperframes-format";
const id = episodeId(process.argv[2]);
const flags = new Set(process.argv.slice(3));
const episode = loadEpisode(id);
const cleanFrames =
  episode.renderer === "pixel3d" || episode.renderer === "remotion";
const concurrency = Number(
  process.env.VIDEO_RENDER_CONCURRENCY ??
    (episode.renderer === "pixel3d" ? 2 : 4),
);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16)
  throw new Error("VIDEO_RENDER_CONCURRENCY must be an integer from 1 to 16");
command(process.execPath, ["--import", "tsx", "scripts/check.ts", id]);
const captions = json<Caption[]>(`episodes/${id}/captions.json`);
const portrait = portraitFormat(episode.aspectRatio, flags);
const named = [...flags].find((f) => f.startsWith("--name="))?.slice(7);
const stem = exportStem(named, portrait ? "portrait" : "landscape");
const range = [...flags]
  .find((f) => f.startsWith("--range="))
  ?.slice(8)
  .split(":")
  .map(Number);
if (
  range &&
  (range.length !== 2 ||
    range.some((n) => !Number.isInteger(n)) ||
    range[0] < 0 ||
    range[1] < range[0] ||
    range[1] >= episode.duration * episode.fps)
)
  throw new Error("Range must be start:end frame numbers inside the episode");
const inputProps = {
  episode,
  captions,
  portrait,
  ...(episode.world === "instagram-rpg" ? { rpgPortraits: flags.has("--rpg-portraits") } : {}),
  showCaptions: true,
  audioEnabled: true,
};
const out = path.resolve("renders", id);
if (episode.renderer === "hyperframes") {
  const project = path.resolve(`episodes/${id}/hyperframes`);
  assertHyperframesDimensions(
    readFileSync(path.join(project, "index.html"), "utf8"),
    portrait,
  );
  const cli = [
    "--yes",
    episode.world === "lying-money" || episode.world === "body-swap"
      ? "hyperframes@0.9.33"
      : episode.world === "fate" ||
          episode.world === "spy-test" ||
          episode.world === "immortal" ||
          episode.world === "memory"
        ? "hyperframes@0.9.26"
        : "hyperframes@0.9.23",
  ];
  if (
    flags.has("--stills") ||
    [...flags].some((f) => f.startsWith("--frame="))
  ) {
    const frame = [...flags].find((f) => f.startsWith("--frame="))?.slice(8);
    console.log(
      command("npx", [
        ...cli,
        "snapshot",
        project,
        ...(frame
          ? ["--at", String(Number(frame) / episode.fps)]
          : ["--review"]),
      ]),
    );
  } else {
    mkdirSync(out, { recursive: true });
    const output = `${out}/${stem}${range ? "-segment" : flags.has("--calibration") ? "-calibration" : flags.has("--preview") ? "-preview" : ""}.mp4`;
    console.log(
      command("npx", [
        ...cli,
        "render",
        project,
        "--quality",
        flags.has("--preview") ? "draft" : "delivery",
        "--fps",
        String(episode.fps),
        "--workers",
        "2",
        ...(range
          ? [
              "--start",
              String(range[0] / episode.fps),
              "--end",
              String((range[1] + 1) / episode.fps),
            ]
          : flags.has("--calibration")
            ? ["--start", "0", "--end", String(Math.min(6, episode.duration))]
            : []),
        "-o",
        output,
      ]),
    );
    normalizeDelivery(output);
    if (episode.world === "inventions" && !range && !flags.has("--calibration"))
      command("python3", ["scripts/inventions-delivery.py", output]);
    checkpoint(id, portrait ? "portraitRender" : "landscapeRender", {
      output: path.relative(process.cwd(), output),
      renderer: "HyperFrames",
      format: portrait ? "portrait" : "landscape",
    });
    console.log(output);
  }
  process.exit(0);
}
const storyboard = `${out}/storyboard${named ? `-${stem}` : portrait ? "-portrait" : ""}`;
mkdirSync(storyboard, { recursive: true });
console.log("Bundling reusable scene engine…");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({
  serveUrl,
  id: portrait ? "Portrait" : "Landscape",
  inputProps,
  browserExecutable,
});
const singleFrame = [...flags].find((f) => f.startsWith("--frame="));
if (singleFrame) {
  const frame = Number(singleFrame.split("=")[1]);
  if (
    !Number.isInteger(frame) ||
    frame < 0 ||
    frame >= composition.durationInFrames
  )
    throw new Error("Frame must be inside the episode");
  await renderStill({
    serveUrl,
    composition,
    inputProps: { ...inputProps, audioEnabled: false },
    output: `${out}/${named ? `${stem}-` : ""}frame-${frame}.png`,
    frame,
    imageFormat: "png",
    browserExecutable,
  });
  console.log(`${out}/${named ? `${stem}-` : ""}frame-${frame}.png`);
} else if (flags.has("--stills")) {
  const frames =
    episode.ukEdit?.shots.map((s, i) => ({
      id: s.view,
      label: `Shot ${i + 1}: ${s.view}`,
      start: s.start,
      duration: s.duration,
      action: "review",
    })) ??
    episode.reviewEdit?.shots.map((s, i) => ({
      id: `${s.activity}-${s.angle}`,
      label: `Shot ${i + 1}: ${s.activity}, ${s.angle}`,
      start: s.start,
      duration: s.duration,
      action: "review",
    })) ??
    episode.scenes;
  for (const [i, scene] of frames.entries()) {
    const frame = Math.round(
      (scene.start +
        (scene.action === "bicycle" ? 0.9 : Math.min(2, scene.duration / 2))) *
        episode.fps,
    );
    const file = `${storyboard}/${String(i + 1).padStart(2, "0")}-${scene.id}.png`;
    await renderStill({
      serveUrl,
      composition,
      inputProps: { ...inputProps, audioEnabled: false },
      output: file,
      frame,
      imageFormat: "png",
      browserExecutable,
    });
    console.log(`Frame ${frame}: ${scene.label}`);
  }
  const castSheet = path.resolve("public/episodes", id, "cast-sheet.png");
  if (existsSync(castSheet)) {
    copyFileSync(castSheet, path.join(out, "cast.png"));
  } else {
    const cast = await selectComposition({
      serveUrl,
      id: episode.renderer === "pixel3d" ? "Cast" : "IllustratedCast",
      browserExecutable,
    });
    await renderStill({
      serveUrl,
      composition: cast,
      output: `${out}/cast.png`,
      imageFormat: "png",
      browserExecutable,
    });
  }
  await renderStill({
    serveUrl,
    composition,
    inputProps: { ...inputProps, audioEnabled: false, showCaptions: false },
    output: `${out}/thumbnail${named ? `-${stem}` : portrait ? "-portrait" : ""}.png`,
    frame: 60,
    imageFormat: "png",
    browserExecutable,
  });
  checkpoint(id, "storyboard", {
    format: portrait ? "portrait" : "landscape",
    images: frames.length,
  });
} else {
  const output = `${out}/${stem}${range ? "-segment" : flags.has("--calibration") ? "-calibration" : flags.has("--preview") ? "-preview" : ""}.mp4`;
  let reported = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    outputLocation: output,
    browserExecutable,
    codec: "h264",
    crf: flags.has("--preview") ? 23 : cleanFrames ? 16 : 19,
    imageFormat: cleanFrames ? "png" : "jpeg",
    pixelFormat: "yuv420p",
    colorSpace: "bt709",
    scale: flags.has("--preview") ? 0.5 : 1,
    concurrency,
    // Some installed Chromium builds can capture an incomplete paint through
    // shared memory. Allow a per-render fallback to regular PNG screenshots.
    disableSharedMemoryCapture:
      process.env.VIDEO_DISABLE_SHARED_MEMORY_CAPTURE === "1",
    ...(range
      ? { frameRange: range as [number, number] }
      : flags.has("--calibration")
        ? {
            frameRange: [
              0,
              Math.min(
                Math.round(6 * episode.fps) - 1,
                Math.round(episode.duration * episode.fps) - 1,
              ),
            ] as [number, number],
          }
        : {}),
    onProgress: ({ progress }) => {
      const percent = Math.floor(progress * 10) * 10;
      if (percent > reported) {
        reported = percent;
        console.log(`Rendering ${percent}%`);
      }
    },
  });
  normalizeDelivery(output);
  if (["astra-quick-test", "inbox-png", "human-in-the-loop", "astra-born-yesterday", "make-no-mistakes", "make-no-mistakes-story", "absolutely-right", "rip", "final-round", "alex-presenter", "claude-design", "instagram-rpg", "job-market-rpg", "lecture-hall-rpg", "remote-job-rpg"].includes(episode.world) && !range && !flags.has("--calibration")) {
    const flat = episode.claudeEdit?.flat;
    const mono = flat || ["instagram-rpg", "job-market-rpg", "lecture-hall-rpg", "remote-job-rpg"].includes(episode.world);
    muxTimedMaster(output, path.resolve("public/episodes", id, flat ? "v2/mix.wav" : episode.rpgCut === "quest" || episode.jobMarketFull || episode.lectureFull ? "full/mix.wav" : "mix.wav"), episode.duration, output, mono ? 1 : 2);
    if (episode.world === "rip" && episode.scenes.some((scene) => scene.action === "knock-at-door") && !flags.has("--preview")) {
      const foleyCut = output.replace(/\.mp4$/, "-foley.mp4");
      muxTimedMaster(
        output,
        path.resolve("public/episodes", id, "mix-foley.wav"),
        episode.duration,
        foleyCut,
      );
    }
  }
  checkpoint(
    id,
    range
      ? "segmentRender"
      : flags.has("--calibration")
        ? "calibrationRender"
        : flags.has("--preview")
          ? "previewRender"
          : portrait
            ? "portraitRender"
            : "landscapeRender",
    {
      output: path.relative(process.cwd(), output),
      preview: flags.has("--preview"),
      format: portrait ? "portrait" : "landscape",
    },
  );
  console.log(output);
}
