import type { Caption } from "@remotion/captions";
import type { Episode, Word } from "./schema";
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
export const cleanWords = (words: Word[]) =>
  words.filter((w) => !/^\[.*\]$/.test(w.text.trim()));
export function findAnchor(words: Word[], phrase: string): number {
  const tokens = phrase.split(/\s+/).map(normalize).filter(Boolean);
  const start = words.findIndex((_, i) =>
    tokens.every((word, j) => normalize(words[i + j]?.text ?? "") === word),
  );
  if (start < 0)
    throw new Error(
      `Narration anchor not found: "${phrase}". Correct the transcript or shot anchor before rendering.`,
    );
  return words[start].start;
}
export function alignEpisode(
  episode: Episode,
  rawWords: Word[],
  stretch: number,
): { episode: Episode; captions: Caption[] } {
  const words = cleanWords(rawWords).map((w) => ({
    ...w,
    start:
      Math.max(0, w.start - episode.audio.narrationTrimStart) * stretch +
      episode.audio.narrationOffset,
    end:
      Math.max(0, w.end - episode.audio.narrationTrimStart) * stretch +
      episode.audio.narrationOffset,
  }));
  if (!words.length) throw new Error("Narration contains no timed words");
  if (words.at(-1)!.end > episode.duration)
    throw new Error("Narration extends beyond the episode");
  const starts = episode.scenes.map((scene, i) =>
    i === 0
      ? 0
      : Math.round(findAnchor(words, scene.anchor) * episode.fps) / episode.fps,
  );
  const scenes = episode.scenes.map((scene, i) => ({
    ...scene,
    start: starts[i],
    duration: (starts[i + 1] ?? episode.duration) - starts[i],
    focus: scene.focus.map((cue) => ({
      ...cue,
      at: findAnchor(words, cue.anchor) - starts[i],
    })),
    ...(scene.actionAnchor
      ? { actionCue: findAnchor(words, scene.actionAnchor) - starts[i] }
      : {}),
  }));
  if (scenes.some((s) => s.duration <= 0))
    throw new Error("Narration anchors must appear in scene order");
  if (
    scenes.some((s) => s.focus.some((c) => c.at < -0.05 || c.at >= s.duration))
  )
    throw new Error("Focus cue must occur within its scene");
  if (
    scenes.some(
      (s) =>
        s.actionCue !== undefined &&
        (s.actionCue < 0 || s.actionCue >= s.duration),
    )
  )
    throw new Error("Action cue must occur within its scene");
  const captions = words.map((w, i) => ({
    text: (i ? " " : "") + w.text,
    startMs: Math.round(w.start * 1000),
    endMs: Math.round(w.end * 1000),
    timestampMs: Math.round(w.start * 1000),
    confidence: null,
  }));
  const storyItems = episode.storyItems?.map((item) => ({
    ...item,
    start: findAnchor(words, item.anchor),
  }));
  return {
    episode: { ...episode, scenes, ...(storyItems ? { storyItems } : {}) },
    captions,
  };
}
